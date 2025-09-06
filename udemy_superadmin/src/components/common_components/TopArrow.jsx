// components/common_components/TopArrow.jsx
import React, { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";
import { useLocation } from "react-router-dom";

function getScrollTop(el) {
  if (!el) return 0;
  if (el === window) {
    return (
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }
  return el.scrollTop || 0;
}

function smoothScrollToTop(el) {
  if (!el || el === window) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    el.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export default function TopArrow({ scrollTargetId, threshold = 200 }) {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setVisible(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const container =
      (scrollTargetId && document.getElementById(scrollTargetId)) || null;

    const sources = new Set([window]);
    if (container) sources.add(container);

    const onScroll = () => {
      // visible if either window OR container is past threshold
      const winTop = getScrollTop(window);
      const contTop = container ? getScrollTop(container) : 0;
      setVisible(winTop > threshold || contTop > threshold);
    };

    // initial state
    onScroll();

    // attach listeners
    sources.forEach((src) =>
      src.addEventListener("scroll", onScroll, { passive: true })
    );

    return () => {
      sources.forEach((src) =>
        src.removeEventListener("scroll", onScroll, { passive: true })
      );
    };
  }, [scrollTargetId, threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const container =
          (scrollTargetId && document.getElementById(scrollTargetId)) || null;
        // scroll both so whichever is scrolled moves up
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
