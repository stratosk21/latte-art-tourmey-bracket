"use client";

import { useEffect, useRef } from "react";

interface WavePatternProps {
  className?: string;
  opacity?: number;
  animated?: boolean;
  density?: number;
  color?: string;
}

export function WavePattern({
  className = "",
  opacity = 1,
  animated = true,
  density = 60,
  color,
}: WavePatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    resizeObserver.observe(canvas);
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = (t: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Determine stroke color from CSS variable or prop
      const strokeColor =
        color ||
        getComputedStyle(document.documentElement).getPropertyValue("--wave").trim() ||
        "#8b9dff";

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = opacity;

      const step = h / density;

      for (let i = 0; i <= density; i++) {
        const y0 = i * step;
        ctx.beginPath();

        for (let x = 0; x <= w; x += 1) {
          // Mathematical moiré/interference wave pattern — two overlapping sinusoids
          const nx = x / w;
          const phase1 = Math.sin(nx * Math.PI * 8 + t * 0.4) * 0.5;
          const phase2 = Math.sin(nx * Math.PI * 5 - t * 0.25) * 0.3;
          const phase3 = Math.cos(nx * Math.PI * 3 + t * 0.15) * 0.2;

          // Radial influence from bottom-left (like the reference image)
          const distX = x / w;
          const distY = (h - y0) / h;
          const radial = Math.sqrt(distX * distX + distY * distY);
          const amplitude = step * 0.42 * (1 - radial * 0.5);

          const displacement = (phase1 + phase2 + phase3) * amplitude;
          const y = y0 + displacement;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const tick = () => {
      timeRef.current += animated ? 0.016 : 0;
      draw(timeRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    draw(0);
    if (animated) {
      animFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [opacity, animated, density, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
