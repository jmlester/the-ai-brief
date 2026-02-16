import { BriefSections } from "./types";

export function formatBriefMarkdown(brief: BriefSections): string {
  const lines: string[] = [];

  lines.push(`# The AI Brief`);
  lines.push("");
  lines.push(`## ${brief.headline}`);
  lines.push("");
  lines.push(brief.summary);
  lines.push("");

  if (brief.otherStories?.length) {
    lines.push("## Other Stories");
    lines.push("");
    for (const group of brief.otherStories) {
      lines.push(`### ${group.theme}`);
      for (const item of group.items) {
        const link = item.url ? ` — ${item.url}` : "";
        const src = item.source ? ` (${item.source})` : "";
        lines.push(`- ${item.story}${src}${link}`);
      }
      lines.push("");
    }
  }

  if (brief.deepDives?.length) {
    lines.push("## Deep Dives");
    lines.push("");
    for (const item of brief.deepDives) {
      const link = item.url ? ` — ${item.url}` : "";
      const src = item.source ? ` (${item.source})` : "";
      lines.push(`- ${item.story}${src}${link}`);
    }
    lines.push("");
  }

  if (brief.promptStudio?.length) {
    lines.push("## Prompt Studio");
    lines.push("");
    for (const item of brief.promptStudio) {
      lines.push(`### ${item.task}`);
      lines.push(`**Prompt:** ${item.prompt}`);
      if (item.bestFor) lines.push(`**Best For:** ${item.bestFor}`);
      if (item.inputFormat) lines.push(`**Input:** ${item.inputFormat}`);
      if (item.outputFormat) lines.push(`**Output:** ${item.outputFormat}`);
      lines.push("");
    }
  }

  if (brief.toolsAndLaunches?.length) {
    lines.push("## Tools & Launches");
    lines.push("");
    for (const item of brief.toolsAndLaunches) {
      const link = item.url ? ` — ${item.url}` : "";
      const src = item.source ? ` (${item.source})` : "";
      lines.push(`- ${item.story}${src}${link}`);
    }
    lines.push("");
  }

  if (brief.quickLinks?.length) {
    lines.push("## Quick Links");
    lines.push("");
    for (const item of brief.quickLinks) {
      const link = item.url ? ` — ${item.url}` : "";
      const src = item.source ? ` (${item.source})` : "";
      lines.push(`- ${item.story}${src}${link}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function formatBriefPlainText(brief: BriefSections): string {
  const lines: string[] = [];

  lines.push("The AI Brief");
  lines.push(brief.headline);
  lines.push("");
  lines.push(brief.summary);
  lines.push("");

  if (brief.otherStories?.length) {
    lines.push("Other Stories:");
    for (const group of brief.otherStories) {
      lines.push(`  ${group.theme}:`);
      for (const item of group.items) {
        const src = item.source ? ` (${item.source})` : "";
        lines.push(`    - ${item.story}${src}`);
      }
    }
    lines.push("");
  }

  if (brief.deepDives?.length) {
    lines.push("Deep Dives:");
    for (const item of brief.deepDives) {
      const src = item.source ? ` (${item.source})` : "";
      lines.push(`  - ${item.story}${src}`);
    }
    lines.push("");
  }

  if (brief.promptStudio?.length) {
    lines.push("Prompt Studio:");
    for (const item of brief.promptStudio) {
      lines.push(`  ${item.task}: ${item.prompt}`);
    }
    lines.push("");
  }

  if (brief.toolsAndLaunches?.length) {
    lines.push("Tools & Launches:");
    for (const item of brief.toolsAndLaunches) {
      const src = item.source ? ` (${item.source})` : "";
      lines.push(`  - ${item.story}${src}`);
    }
    lines.push("");
  }

  if (brief.quickLinks?.length) {
    lines.push("Quick Links:");
    for (const item of brief.quickLinks) {
      const src = item.source ? ` (${item.source})` : "";
      lines.push(`  - ${item.story}${src}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function storyLink(story: string, url: string) {
  if (url) return `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(story)}</a>`;
  return esc(story);
}

export function formatBriefHTML(brief: BriefSections): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  let body = "";

  body += `<h1>${esc(brief.headline)}</h1>\n`;
  body += `<p class="date">${esc(date)}</p>\n`;
  body += `<p class="summary">${esc(brief.summary)}</p>\n`;

  if (brief.otherStories?.length) {
    body += `<h2>Other Stories</h2>\n`;
    for (const group of brief.otherStories) {
      body += `<h3>${esc(group.theme)}</h3>\n<ul>\n`;
      for (const item of group.items) {
        const src = item.source ? ` <span class="source">${esc(item.source)}</span>` : "";
        body += `<li>${storyLink(item.story, item.url)}${src}</li>\n`;
      }
      body += `</ul>\n`;
    }
  }

  if (brief.deepDives?.length) {
    body += `<h2>Deep Dives</h2>\n<ul>\n`;
    for (const item of brief.deepDives) {
      const src = item.source ? ` <span class="source">${esc(item.source)}</span>` : "";
      body += `<li>${storyLink(item.story, item.url)}${src}</li>\n`;
    }
    body += `</ul>\n`;
  }

  if (brief.promptStudio?.length) {
    body += `<h2>Prompt Studio</h2>\n`;
    for (const item of brief.promptStudio) {
      body += `<div class="prompt-card">\n`;
      body += `<h3>${esc(item.task)}</h3>\n`;
      body += `<p><strong>Prompt:</strong> ${esc(item.prompt)}</p>\n`;
      if (item.bestFor) body += `<p><strong>Best For:</strong> ${esc(item.bestFor)}</p>\n`;
      if (item.inputFormat) body += `<p><strong>Input:</strong> ${esc(item.inputFormat)}</p>\n`;
      if (item.outputFormat) body += `<p><strong>Output:</strong> ${esc(item.outputFormat)}</p>\n`;
      body += `</div>\n`;
    }
  }

  if (brief.toolsAndLaunches?.length) {
    body += `<h2>Tools &amp; Launches</h2>\n<ul>\n`;
    for (const item of brief.toolsAndLaunches) {
      const src = item.source ? ` <span class="source">${esc(item.source)}</span>` : "";
      body += `<li>${storyLink(item.story, item.url)}${src}</li>\n`;
    }
    body += `</ul>\n`;
  }

  if (brief.quickLinks?.length) {
    body += `<h2>Quick Links</h2>\n<ul>\n`;
    for (const item of brief.quickLinks) {
      const src = item.source ? ` <span class="source">${esc(item.source)}</span>` : "";
      body += `<li>${storyLink(item.story, item.url)}${src}</li>\n`;
    }
    body += `</ul>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>The AI Brief - ${esc(brief.headline)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:#1b1f24;background:#f9f7f2;padding:24px;line-height:1.6;max-width:720px;margin:0 auto}
h1{font-family:Georgia,serif;font-size:28px;font-weight:700;margin-bottom:4px;color:#0f766e}
h2{font-size:20px;font-weight:600;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #e6e0d6}
h3{font-size:16px;font-weight:600;margin:16px 0 8px;color:#334155}
.date{color:#6b7280;font-size:13px;margin-bottom:16px}
.summary{font-size:16px;line-height:1.8;margin-bottom:8px}
ul{padding-left:20px;margin-bottom:12px}
li{margin-bottom:8px;font-size:15px}
a{color:#0f766e;text-decoration:none}
a:hover{text-decoration:underline}
.source{display:inline-block;font-size:11px;background:#e6e0d6;color:#5d656f;padding:2px 8px;
  border-radius:99px;margin-left:6px;vertical-align:middle}
.prompt-card{background:#fff;border:1px solid #e6e0d6;border-radius:12px;padding:16px;margin-bottom:12px}
.prompt-card h3{margin:0 0 8px;color:#0f766e}
.prompt-card p{font-size:14px;margin-bottom:4px}
footer{margin-top:32px;text-align:center;font-size:12px;color:#9ca3af}
@media(prefers-color-scheme:dark){
  body{background:#0f1116;color:#f5f3ee}
  h1{color:#fb923c}
  h2{border-color:#2a2f3a}
  h3{color:#cbd5e1}
  a{color:#fb923c}
  .source{background:#2a2f3a;color:#b2b7c2}
  .prompt-card{background:#171b24;border-color:#2a2f3a}
}
@media print{body{background:#fff;padding:12px}h1{color:#000}a{color:#000}}
</style>
</head>
<body>
${body}
<footer>Generated by The AI Brief</footer>
</body>
</html>`;
}
