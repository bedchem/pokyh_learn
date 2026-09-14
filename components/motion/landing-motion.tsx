'use client';

import { gsap } from 'gsap';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
      timeline
        .from('[data-motion="landing-copy"]', { autoAlpha: 0, y: 18, duration: 0.52 })
        .from('[data-motion="landing-actions"]', { autoAlpha: 0, y: 12, duration: 0.36 }, '-=0.18')
        .from('[data-motion="landing-dashboard"]', { autoAlpha: 0, y: 24, duration: 0.56 }, '-=0.42')
        .from('[data-motion="landing-bar"]', { scaleY: 0, transformOrigin: 'bottom', duration: 0.32, stagger: 0.045 }, '-=0.24')
        .from('[data-motion="landing-value"]', { autoAlpha: 0, y: 12, duration: 0.34, stagger: 0.08 }, '-=0.12');
    }, root);

    return () => context.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
