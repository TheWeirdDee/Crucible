"use client";

/*
 * Scroll-reveal wrapper — fades its section up into place the first time it enters the
 * viewport (weighty easeOutQuint, no bounce). Respects prefers-reduced-motion.
 * Wrap any landing section's content in <Reveal> to give it the reveal-on-scroll feel.
 */

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => {
        setReduced(true);
        setShown(true);
      });
      return () => cancelAnimationFrame(id);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: React.CSSProperties = reduced
    ? {}
    : {
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(22px)",
        transition:
          "opacity 760ms cubic-bezier(0.22,1,0.36,1), transform 760ms cubic-bezier(0.22,1,0.36,1)",
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
