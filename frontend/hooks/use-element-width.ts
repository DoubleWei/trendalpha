"use client";

import { useEffect, useRef, useState } from "react";

/** 量測容器寬度（給需要像素座標的 SVG 圖表用，避免 viewBox 拉伸變形文字）。 */
export function useElementWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
