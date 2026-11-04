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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const dropsCount = Math.floor(Math.min(width, 1600) / 45);
    const drops: Drop[] = [];

    for (let i = 0; i < dropsCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3.5 + 2,
        speedY: Math.random() * 0.35 + 0.15,
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.3 + 0.1,
        type: i % 3 === 0 ? 'droplet' : i % 3 === 1 ? 'cell' : 'particle',
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const drawDroplet = (ctx: CanvasRenderingContext2D, d: Drop) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      // Crimson #D00000 with Burgundy #6A040F depth
      ctx.fillStyle = `rgba(208, 0, 0, ${d.opacity})`;
      ctx.shadowColor = 'rgba(208, 0, 0, 0.4)';
      ctx.shadowBlur = d.radius * 2;

      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI, false);
      ctx.bezierCurveTo(
        -d.radius,
        -d.radius * 1.5,
        0,
        -d.radius * 2.5,
        0,
        -d.radius * 2.8
      );
      ctx.bezierCurveTo(
        0,
        -d.radius * 2.5,
        d.radius,
        -d.radius * 1.5,
        d.radius,
        0
      );
      ctx.fill();
      ctx.restore();
    };

    const drawCell = (ctx: CanvasRenderingContext2D, d: Drop) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      const grad = ctx.createRadialGradient(0, 0, d.radius * 0.2, 0, 0, d.radius);
      grad.addColorStop(0, `rgba(106, 4, 15, ${d.opacity * 0.9})`);
      grad.addColorStop(0.7, `rgba(208, 0, 0, ${d.opacity})`);
      grad.addColorStop(1, `rgba(185, 28, 28, ${d.opacity * 0.3})`);

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(208, 0, 0, 0.3)';
      ctx.shadowBlur = d.radius * 1.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, d.radius * 1.2, d.radius * 0.85, d.wobble, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawParticle = (ctx: CanvasRenderingContext2D, d: Drop) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = `rgba(248, 113, 113, ${d.opacity * 0.5})`;
      ctx.shadowColor = 'rgba(208, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(0, 0, d.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (const d of drops) {
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

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-1 w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
};
