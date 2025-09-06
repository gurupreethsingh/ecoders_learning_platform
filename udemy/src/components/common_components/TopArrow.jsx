// components/common_components/TopArrow.jsx
import React, { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";
import { useLocation } from "react-router-dom";

function smoothScrollToTop(targetEl) {
  if (!targetEl || targetEl === window) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    targetEl.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export default function TopArrow({ scrollTargetId, threshold = 0 }) {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Hide on route change (usually starts near top)
    setVisible(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const container =
      (scrollTargetId && document.getElementById(scrollTargetId)) || null;

    // Sentinel to watch (must exist in DOM)
    const sentinel = document.getElementById("scroll-sentinel");

    // If sentinel is missing, fall back to scroll listener on window/container
    if (!("IntersectionObserver" in window) || !sentinel) {
      const getTop = (el) =>
        el === window
          ? window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
          : (el && el.scrollTop) || 0;

      const sources = new Set([window]);
      if (container) sources.add(container);

      const onScroll = () => {
        const winTop = getTop(window);
        const contTop = container ? getTop(container) : 0;
        setVisible(winTop > 200 || contTop > 200); // fallback threshold 200px
      };

      onScroll();
      sources.forEach((src) =>
        src.addEventListener("scroll", onScroll, { passive: true })
      );
      return () =>
        sources.forEach((src) =>
          src.removeEventListener("scroll", onScroll, { passive: true })
        );
    }

    // IntersectionObserver path (recommended)
    const observer = new IntersectionObserver(
      (entries) => {
        // If the top sentinel is NOT intersecting, we are scrolled down
        const isTopVisible = entries[0]?.isIntersecting ?? true;
        setVisible(!isTopVisible);
      },
      {
        root: container || null, // null = viewport
        rootMargin: "0px",
        threshold, // 0 is fine; we just care if it's out of view
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollTargetId, threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const container =
          (scrollTargetId && document.getElementById(scrollTargetId)) || null;
        // Scroll both, so whichever scrolled moves up
        smoothScrollToTop(window);
        if (container) smoothScrollToTop(container);
      }}
      className="
        fixed bottom-6 right-6
        inline-flex items-center justify-center
        h-12 w-12 rounded-full
        bg-purple-600 text-white shadow-lg
        hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400
        transition
        z-[9999]
      "
      aria-label="Scroll to top"
    >
      <FaArrowUp />
    </button>
  );
}
