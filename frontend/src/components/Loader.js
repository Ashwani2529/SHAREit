import React, { useEffect, useRef, useState } from "react";

/**
 * Slim, NProgress-style indeterminate progress bar pinned to the very top of
 * the viewport. While `active` is true it simulates progress climbing toward
 * ~90%; when `active` flips to false it snaps to 100% and fades out. This gives
 * the user immediate, attractive feedback while the (slow) backend wakes up.
 */
export const TopProgressBar = ({ active }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setProgress(8);
      tickRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          // ease-out: slows down as it approaches 90%
          const increment = Math.max(0.6, (90 - p) * 0.08);
          return Math.min(90, p + increment);
        });
      }, 200);
      return () => clearInterval(tickRef.current);
    }

    // Finishing: jump to 100%, then fade away.
    if (tickRef.current) clearInterval(tickRef.current);
    let resetTimer;
    setProgress((p) => (p > 0 ? 100 : 0));
    const hideTimer = setTimeout(() => {
      setVisible(false);
      resetTimer = setTimeout(() => setProgress(0), 250);
    }, 450);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(resetTimer);
    };
  }, [active]);

  if (!visible) return null;

  return (
    <div
      className="top-progress"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading content"
    >
      <div className="top-progress-bar" style={{ width: `${progress}%` }}>
        <div className="top-progress-glow" />
      </div>
    </div>
  );
};

/**
 * Shimmering skeleton placeholder cards shown inside a grid while data loads,
 * so the layout doesn't jump and the page never looks empty/frozen.
 */
export const SkeletonCards = ({ count = 6 }) => (
  <div className="skeleton-grid" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div className="skeleton-card card" key={i}>
        <div className="skeleton-line skeleton-line--lg" />
        <div className="skeleton-line skeleton-line--md" />
        <div className="skeleton-line skeleton-line--sm" />
        <div className="skeleton-actions">
          <div className="skeleton-btn" />
          <div className="skeleton-btn" />
        </div>
      </div>
    ))}
  </div>
);

export default TopProgressBar;