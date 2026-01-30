import Foundation

final class AIClient {
    private let session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 90
        configuration.timeoutIntervalForResource = 120
        return URLSession(configuration: configuration)
    }()

    func generateBrief(
        news: [NewsItem],
        configuration: AIConfiguration,
        tone: BriefTone,
        focusTopics: String,
        preferredSources: [String],
        onStatus: @escaping (String) -> Void,
        onDelta: @escaping (String) -> Void
    ) async throws -> String {
        let prompt = PromptBuilder.buildPrompt(
            from: news,
            tone: tone,
            focusTopics: focusTopics,
            preferredSources: preferredSources
        )
        let request = try buildRequest(prompt: prompt, configuration: configuration, stream: true)
        let maxAttempts = 2

        for attempt in 1...maxAttempts {
            do {
                onStatus("Connecting to model...")
                let text = try await streamResponse(
                    request: request,
                    onStatus: onStatus,
                    onDelta: onDelta
                )
                return text
            } catch {
                if attempt < maxAttempts, isTimeout(error) {
                    onStatus("Timeout hit, retrying...")
                    try await Task.sleep(nanoseconds: 900_000_000)
                    continue
                }
                throw error
            }
        }

        throw AIClientError.emptyResponse
    }

    private func buildRequest(prompt: String, configuration: AIConfiguration, stream: Bool) throws -> URLRequest {
        guard let url = URL(string: "https://api.openai.com/v1/responses") else {
            throw AIClientError.invalidEndpoint
        }

        let temperature = temperatureForModel(configuration.model)
        let body = ResponsesRequest(
            model: configuration.model,
            input: [
                ResponsesInputMessage(role: "system", content: "You are an expert AI news editor."),
                ResponsesInputMessage(role: "user", content: prompt)
            ],
            temperature: temperature,
            stream: stream
        )
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Bearer \(configuration.apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)
        return request
    }

    private func streamResponse(
        request: URLRequest,
        onStatus: @escaping (String) -> Void,
        onDelta: @escaping (String) -> Void
    ) async throws -> String {
        let (bytes, response) = try await session.bytes(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIClientError.invalidResponse
        }

        if !(200...299).contains(httpResponse.statusCode) {
            var data = Data()
            for try await line in bytes {
                data.append(line)
            }
            try validateResponse(data: data, response: response)
        }

        var assembled = ""
        onStatus("Streaming response...")

        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { continue }
            if trimmed.hasPrefix("event:") { continue }

            let payload: String
            if trimmed.hasPrefix("data:") {
                payload = trimmed.replacingOccurrences(of: "data:", with: "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                payload = trimmed
            }

            if payload == "[DONE]" {
                break
            }

            guard let data = payload.data(using: .utf8) else { continue }
            let result = parseStreamPayload(data)
            if let error = result.errorMessage {
                throw AIClientError.apiError(message: error, code: nil)
            }
            if let delta = result.deltaText, !delta.isEmpty {
                assembled += delta
                onDelta(delta)
            }
            if result.isCompleted {
                break
            }
        }

        if assembled.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            onStatus("No stream data, retrying without streaming...")
            let fallback = try await nonStreamingResponse(request: request, onStatus: onStatus)
            if fallback.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                throw AIClientError.emptyResponse
            }
            return fallback
        }
        return assembled
    }

    private func validateResponse(data: Data, response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIClientError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            if let apiError = try? JSONDecoder().decode(OpenAIErrorResponse.self, from: data) {
                throw AIClientError.apiError(message: apiError.error.message, code: apiError.error.code)
            }
            let body = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            throw AIClientError.httpError(statusCode: httpResponse.statusCode, body: body)
        }
    }

    private func temperatureForModel(_ model: String) -> Double? {
        let trimmed = model.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if trimmed.hasPrefix("gpt-5") {
            return nil
        }
        return 0.4
    }

    private func isTimeout(_ error: Error) -> Bool {
        if let urlError = error as? URLError {
            return urlError.code == .timedOut
        }
        return false
    }

    private func parseStreamPayload(_ data: Data) -> (deltaText: String?, isCompleted: Bool, errorMessage: String?) {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return (nil, false, nil)
        }
        if let type = json["type"] as? String {
            if type == "response.output_text.delta" {
                if let delta = json["delta"] as? String {
                    return (delta, false, nil)
                }
                if let delta = json["delta"] as? [String: Any],
                   let text = delta["text"] as? String {
                    return (text, false, nil)
                }
                if let text = json["text"] as? String {
                    return (text, false, nil)
                }
            }
            if type == "response.completed" {
                return (nil, true, nil)
            }
            if type == "response.error" {
                if let error = json["error"] as? [String: Any],
                   let message = error["message"] as? String {
                    return (nil, false, message)
                }
            }
        }
        return (nil, false, nil)
    }

    private func nonStreamingResponse(request: URLRequest, onStatus: @escaping (String) -> Void) async throws -> String {
        onStatus("Waiting for full response...")
        var nonStreamingRequest = request
        if let body = request.httpBody,
           var json = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
            json["stream"] = false
            nonStreamingRequest.httpBody = try JSONSerialization.data(withJSONObject: json)
        }

        let (data, response) = try await session.data(for: nonStreamingRequest)
        try validateResponse(data: data, response: response)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return ""
        }
        return extractOutputText(from: json)
    }

    private func extractOutputText(from json: [String: Any]) -> String {
        if let outputText = json["output_text"] as? String {
            return outputText
        }
        if let output = json["output"] as? [[String: Any]] {
            var segments: [String] = []
            for item in output {
                if let content = item["content"] as? [[String: Any]] {
                    for block in content {
                        if let text = block["text"] as? String {
                            segments.append(text)
                        }
                    }
                }
            }
            return segments.joined()
        }
        return ""
    }
}

enum AIClientError: LocalizedError {
    case invalidEndpoint
    case invalidResponse
    case apiError(message: String, code: String?)
    case httpError(statusCode: Int, body: String)
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .invalidEndpoint:
            return "The AI endpoint is invalid."
        case .invalidResponse:
            return "The AI response was invalid."
        case let .apiError(message, code):
            if let code, !code.isEmpty {
                return "AI API error (\(code)): \(message)"
            }
            return "AI API error: \(message)"
        case let .httpError(statusCode, body):
            if body.isEmpty {
                return "AI API error: HTTP \(statusCode)."
            }
            return "AI API error: HTTP \(statusCode). \(body)"
        case .emptyResponse:
            return "The AI response was empty."
        }
    }
}

struct ResponsesRequest: Codable {
    let model: String
    let input: [ResponsesInputMessage]
    let temperature: Double?
    let stream: Bool
}

struct ResponsesInputMessage: Codable {
    let role: String
    let content: String
}

struct OpenAIErrorResponse: Codable {
    let error: OpenAIErrorDetail
}

struct OpenAIErrorDetail: Codable {
    let message: String
    let type: String?
    let code: String?
}

enum PromptBuilder {
    static func buildPrompt(from news: [NewsItem], tone: BriefTone, focusTopics: String, preferredSources: [String]) -> String {
        let toneDescription: String
        switch tone {
        case .executive:
            toneDescription = "executive, concise, outcomes-focused"
        case .practical:
            toneDescription = "practical, clear, with actionable takeaways"
        case .builder:
            toneDescription = "builder-focused, with experiments and prompts"
        }

        let newsLines = news.prefix(20).map {
            "- \($0.title) | \($0.source) | \($0.url)"
        }.joined(separator: "\n")

        let trimmedTopics = focusTopics.trimmingCharacters(in: .whitespacesAndNewlines)
        let topicsLine = trimmedTopics.isEmpty ? "None provided." : trimmedTopics
        let preferredLine = preferredSources.isEmpty ? "None" : preferredSources.joined(separator: ", ")

        return """
        Create "The AI Brief" AI news brief. Tone: \(toneDescription).
        Focus on the last 24 hours and avoid hype. Use the items below.
        Focus topics: \(topicsLine)
        Preferred sources: \(preferredLine)

        Output format (use these exact headings and labels):
        Headline:
        <1 sentence>

        Summary:
        <3-5 sentences, readable paragraph>

        Other Stories:
        - Theme: <theme name>
          - Story: <1 sentence>
            Source: <source name>
            URL: <full link>
        (Provide 3-4 themes.)

        Deep Dives:
        - Story: <1-2 sentences>
          Source: <source name>
          URL: <full link>
        (Provide 2-3 items.)

        Prompt Studio:
        1) Task: <short task name>
           Prompt: <1-2 sentences, general daily utility prompt>
           Best For: <who/what it's best for>
           Input Format: <what the user should paste>
           Output Format: <what the model should return>
        (Provide 2-3 prompts.)

        Tomorrow's Radar:
        - <2-3 full-sentence, concrete watch items tied to the provided sources>
        (Do NOT include Source/URL lines here. Each bullet should be a single sentence. Avoid generic language. Each item must reference a specific company, product, model, or policy mentioned in the sources and be distinct from Other Stories and Deep Dives.)

        Critical constraints:
        - Do not ask the user for more sources or items.
        - Do not include placeholders, caveats, or meta-commentary about missing data.
        - If sources are limited, generalize carefully while staying grounded in the provided items.
        - Avoid duplicate sentences across sections; each item should be unique.

        \(newsLines.isEmpty ? "- No items available" : newsLines)
        """
    }
}
