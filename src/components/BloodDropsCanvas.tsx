import React, { useEffect, useRef } from 'react';

interface Drop {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  type: 'droplet' | 'cell' | 'particle';
  wobble: number;
  wobbleSpeed: number;
}

export const BloodDropsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isRunning = true;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Lightweight drop count calibrated for 60fps on all devices
    const dropsCount = Math.floor(Math.min(width, 1400) / 65);
    const drops: Drop[] = [];

    for (let i = 0; i < dropsCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3.5 + 2,
        speedY: Math.random() * 0.35 + 0.15,
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.25 + 0.1,
        type: i % 3 === 0 ? 'droplet' : i % 3 === 1 ? 'cell' : 'particle',
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Fast vector renderers without expensive shadowBlur
    const drawDroplet = (c: CanvasRenderingContext2D, d: Drop) => {
      c.save();
      c.translate(d.x, d.y);
      c.fillStyle = `rgba(215, 38, 56, ${d.opacity})`;

      c.beginPath();
      c.arc(0, 0, d.radius, 0, Math.PI, false);
      c.bezierCurveTo(
        -d.radius,
        -d.radius * 1.5,
        0,
        -d.radius * 2.5,
        0,
        -d.radius * 2.8
      );
      c.bezierCurveTo(
        0,
        -d.radius * 2.5,
        d.radius,
        -d.radius * 1.5,
        d.radius,
        0
      );
      c.fill();
      c.restore();
    };

    const drawCell = (c: CanvasRenderingContext2D, d: Drop) => {
      c.save();
      c.translate(d.x, d.y);
      const grad = c.createRadialGradient(0, 0, d.radius * 0.2, 0, 0, d.radius);
      grad.addColorStop(0, `rgba(122, 12, 23, ${d.opacity * 0.9})`);
      grad.addColorStop(0.7, `rgba(215, 38, 56, ${d.opacity})`);
      grad.addColorStop(1, `rgba(185, 28, 28, ${d.opacity * 0.2})`);

      c.fillStyle = grad;
      c.beginPath();
      c.ellipse(0, 0, d.radius * 1.2, d.radius * 0.85, d.wobble, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const drawParticle = (c: CanvasRenderingContext2D, d: Drop) => {
      c.save();
      c.translate(d.x, d.y);
      c.fillStyle = `rgba(215, 38, 56, ${d.opacity * 0.5})`;
      c.beginPath();
      c.arc(0, 0, d.radius * 0.6, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const animate = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.wobble += d.wobbleSpeed;
        d.y -= d.speedY;
        d.x += Math.sin(d.wobble) * 0.25 + d.speedX;

        if (d.y < -30) {
          d.y = height + 30;
          d.x = Math.random() * width;
        }
        if (d.x < -30) d.x = width + 20;
        if (d.x > width + 30) d.x = -20;

        if (d.type === 'droplet') {
          drawDroplet(ctx, d);
        } else if (d.type === 'cell') {
          drawCell(ctx, d);
        } else {
          drawParticle(ctx, d);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Pause on tab hide
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (!isRunning) {
          isRunning = true;
          animationFrameId = requestAnimationFrame(animate);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform'
      }}
    />
  );
};
