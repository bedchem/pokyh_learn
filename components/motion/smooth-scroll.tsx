'use client';

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';

/**
 * Keeps native scrolling as the source of truth while making pointer-wheel
 * movement feel less abrupt on larger screens. Lenis itself honors reduced
 * motion; the explicit media-query guard also avoids starting an animation
 * loop when the learner has asked for no motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
      // Native behavior remains intact inside dialogs, editors and deliberately
      // scrollable areas. Add data-lenis-prevent to any future sheet or popover.
      prevent: (node) => Boolean(node.closest('[data-lenis-prevent], dialog, [role="dialog"], input, textarea, select, [contenteditable="true"]')),
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
