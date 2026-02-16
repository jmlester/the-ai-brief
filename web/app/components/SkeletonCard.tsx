"use client";

export default function SkeletonCard() {
  return (
    <div className="briefCard skeletonCard" aria-hidden="true">
      <div className="skeletonLine skeletonTitle" />
      <div className="skeletonLine skeletonText" />
      <div className="skeletonLine skeletonText short" />
    </div>
  );
}
