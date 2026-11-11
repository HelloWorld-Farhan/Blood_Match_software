import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface BloodPreloaderProps {
  onComplete: () => void;
  onOpeningChange?: (isOpening: boolean) => void;
}

export const BloodPreloader: React.FC<BloodPreloaderProps> = ({ onComplete, onOpeningChange }) => {
  const [isGone, setIsGone] = useState(false);
  const [showTag, setShowTag] = useState(false);
  const [tagOut, setTagOut] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const camRef = useRef<HTMLDivElement | null>(null);
  const puddleRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const poolRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<SVGPathElement | null>(null);
  const glossRef = useRef<SVGPathElement | null>(null);
  const remnantRef = useRef<SVGPathElement | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const isFinishedRef = useRef(false);

  // Easing & math helpers
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t: number) => t * t * t;
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const f = (n: number) => n.toFixed(2);

  // Exact Drip Geometry Math
  const pendantPath = (L: number, nw: number, fw: number, rx: number, ry: number) => {
    const fl = Math.min(L, 0.7 * rx + 1);
    const cy = L + ry;
    const tp = L;
    return `M${f(-fw)} 0 Q${f(-nw)} 0 ${f(-nw)} ${f(fl)} L${f(-nw)} ${f(tp)} C${f(-nw)} ${f(
      tp + ry * 0.25
    )} ${f(-rx)} ${f(cy - ry * 0.55)} ${f(-rx)} ${f(cy)} C${f(-rx)} ${f(cy + ry * 0.56)} ${f(
      -rx * 0.56
    )} ${f(cy + ry)} 0 ${f(cy + ry)} C${f(rx * 0.56)} ${f(cy + ry)} ${f(rx)} ${f(
      cy + ry * 0.56
    )} ${f(rx)} ${f(cy)} C${f(rx)} ${f(cy - ry * 0.55)} ${f(nw)} ${f(tp + ry * 0.25)} ${f(
      nw
    )} ${f(tp)} L${f(nw)} ${f(fl)} Q${f(nw)} 0 ${f(fw)} 0Z`;
  };

  const freePath = (rx: number, ry: number, cy: number, tail: number) => {
    const tip = cy - ry - tail;
    return `M0 ${f(tip)} C0 ${f(tip)} ${f(-rx)} ${f(cy - ry * 0.8)} ${f(-rx)} ${f(cy)} C${f(
      -rx
    )} ${f(cy + ry * 0.56)} ${f(-rx * 0.56)} ${f(cy + ry)} 0 ${f(cy + ry)} C${f(
      rx * 0.56
    )} ${f(cy + ry)} ${f(rx)} ${f(cy + ry * 0.56)} ${f(rx)} ${f(cy)} C${f(rx)} ${f(
      cy - ry * 0.8
    )} 0 ${f(tip)} 0 ${f(tip)}Z`;
  };

  const remnantPath = (L2: number, nw: number, fw: number) => {
    if (L2 < 0.6) return '';
    const fl = Math.min(L2 * 0.5, 6);
    return `M${f(-fw)} 0 Q${f(-nw)} 0 ${f(-nw)} ${f(fl)} Q${f(-nw)} ${f(L2)} 0 ${f(L2)} Q${f(
      nw
    )} ${f(L2)} ${f(nw)} ${f(fl)} Q${f(nw)} 0 ${f(fw)} 0Z`;
  };

  const glossPath = (cy: number, rx: number, ry: number) => {
    return `M${f(-rx * 0.5)} ${f(cy + ry * 0.2)} Q${f(-rx * 0.62)} ${f(cy - ry * 0.28)} ${f(
      -rx * 0.3
    )} ${f(cy - ry * 0.6)}`;
  };

  const finish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    document.documentElement.classList.remove('is-loading');
    document.body.classList.remove('is-loading');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bloodmatch_preloader_done', 'true');
      window.dispatchEvent(new CustomEvent('bloodmatch_preloader_complete'));
    }
    setIsGone(true);
    onOpeningChange?.(true);
    onComplete();
  }, [onComplete, onOpeningChange]);

  // Particle & Splash Effect
  const splash = useCallback(() => {
    const cam = camRef.current;
    if (!cam) return;
    const m = Math.min(window.innerWidth, window.innerHeight);
    const parts = 22;

    for (let i = 0; i < parts; i++) {
      const a = (Math.random() * 2 - 1) * 1.25;
      const sp = 0.22 * m * (0.55 + Math.random() * 0.6);
      const dx = Math.sin(a) * sp * 1.15;
      const up = Math.cos(a) * sp;
      const sz = 3 + Math.random() * 6;

      const p = document.createElement('div');
      p.className = 'absolute rounded-full bg-[#c1121f] pointer-events-none';
      p.style.left = '50%';
      p.style.bottom = '0';
      p.style.width = p.style.height = `${sz}px`;
      p.style.marginLeft = `${-sz / 2}px`;
      cam.appendChild(p);

      const an = p.animate(
        [
          { transform: 'translate(0,0)', opacity: 1, easing: 'cubic-bezier(.2,.7,.4,1)' },
          {
            offset: 0.5,
            transform: `translate(${dx * 0.75}px, ${-up}px)`,
            opacity: 1,
            easing: 'cubic-bezier(.5,0,.9,.5)',
          },
          { transform: `translate(${dx}px, ${sz}px) scale(.6)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 600, fill: 'forwards' }
      );
      an.onfinish = () => p.remove();
    }

    for (let r = 0; r < 2; r++) {
      const ring = document.createElement('div');
      ring.className = 'absolute rounded-full border-2 border-[#c1121f] pointer-events-none';
      ring.style.left = '50%';
      ring.style.bottom = '-3px';
      ring.style.width = '24px';
      ring.style.height = '7px';
      ring.style.marginLeft = '-12px';
      cam.appendChild(ring);

      const ra = ring.animate(
        [
          { transform: 'scale(.3)', opacity: 0.8 },
          { transform: 'scale(18.4, 4.2)', opacity: 0 },
        ],
        { duration: 1400, delay: r * 200, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'forwards' }
      );
      ra.onfinish = () => ring.remove();
    }
  }, []);

  const triggerImpact = useCallback(() => {
    if (puddleRef.current) {
      puddleRef.current.style.width = '26vw';
      puddleRef.current.style.height = '3vh';
    }
    splash();
  }, [splash]);

  // Main Droplet Physics & Timeline Orchestrator
  useEffect(() => {
    document.body.classList.add('is-loading');

    const H = window.innerHeight;
    const W = window.innerWidth;
    const R = Math.max(16, Math.min(26, W * 0.026));
    const L1 = 1.5 * R;
    const L2 = L1 + 0.45 * R;
    const RY2 = 1.3;
    const cyD = L2 + RY2 * R;

    if (glossRef.current) {
      glossRef.current.setAttribute('stroke-width', Math.max(1.4, R * 0.17).toFixed(2));
    }

    const Tf = clamp01((1150 * Math.sqrt(H / 700) - 800) / 800) * 800 + 800;
    const g = (2 * (H - cyD - R * 1.1)) / (Tf * Tf);
    const ryF = (tf: number) => R * (1.1 + 0.2 * Math.exp(-tf / 130) + 0.12 * (tf / Tf));
    const cyF = (tf: number) => cyD + 0.5 * g * tf * tf;

    let tc = 0;
    while (tc < 6000 && cyF(tc) + ryF(tc) < H) tc += 2;

    const GROW = 1400;
    const PINCH = 240;

    let stage: 'grow' | 'pinch' | 'fall' | 'squash' | 'done' = 'grow';
    const tGrow = performance.now();
    let tPinch = 0;
    let tFall = 0;
    let tTouch = 0;
    let sxc = 1;
    let syc = 1;
    let cyc = 0;
    let tailc = 0;

    const setShape = (body: string, gl: string, rem: string, op: number) => {
      if (bodyRef.current) {
        bodyRef.current.setAttribute('d', body);
        bodyRef.current.setAttribute('opacity', op.toString());
      }
      if (glossRef.current) glossRef.current.setAttribute('d', gl);
      if (remnantRef.current) remnantRef.current.setAttribute('d', rem);
    };

    // Pool Rise & Aperture Mask Step (Guarantees 100% solid red coverage of viewport)
    const riseAndOpen = () => {
      const pool = poolRef.current;
      if (!pool) {
        finish();
        return;
      }

      const RISE = 2000;
      // Over-translate so waves move completely above viewport (by at least 350px)
      const targetTranslate = -(H + 350);

      const riseAnim = pool.animate(
        [
          { transform: 'translateY(0)' },
          { transform: `translateY(${targetTranslate}px)` },
        ],
        { duration: RISE, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' }
      );

      // Fade in text naturally as the red fluid covers the center of the screen
      setTimeout(() => {
        if (!isFinishedRef.current) {
          setShowTag(true);
        }
      }, 1050);

      let riseCompleted = false;
      const onRiseDone = () => {
        if (riseCompleted || isFinishedRef.current) return;
        riseCompleted = true;

        // Ensure 100% full solid red fill across the entire viewport background
        if (containerRef.current) {
          containerRef.current.style.backgroundColor = '#c1121f';
        }

        // Hold message steadily for 1.6s, then smoothly open radial aperture
        setTimeout(() => {
          setTagOut(true);
          onOpeningChange?.(true);

          if (containerRef.current) {
            containerRef.current.classList.add('opening');
          }

          const maxR = Math.hypot(W / 2, H) + 40;
          const dur = 1700;
          const t0 = performance.now();

          const stepAperture = (now: number) => {
            if (isFinishedRef.current) return;
            const t = Math.min((now - t0) / dur, 1);
            const rVal = (maxR * easeInOut(t)).toFixed(1) + 'px';
            if (containerRef.current) {
              containerRef.current.style.setProperty('--r', rVal);
            }
            if (t < 1) {
              requestAnimationFrame(stepAperture);
            } else {
              finish();
            }
          };
          requestAnimationFrame(stepAperture);
        }, 1600);
      };

      if (riseAnim && riseAnim.finished) {
        riseAnim.finished.then(onRiseDone).catch(onRiseDone);
      }
      setTimeout(onRiseDone, RISE + 100);
    };

    // Frame Physics Loop
    const frame = (now: number) => {
      if (isFinishedRef.current) return;

      if (stage === 'grow') {
        const p = clamp01((now - tGrow) / GROW);
        const r = R * lerp(0.28, 1, easeOut(clamp01(p / 0.8)));
        const L = L1 * easeInOut(p);
        const nw = r * lerp(0.9, 0.3, easeIn(p));
        const fw = nw + R * lerp(0.25, 0.6, p);
        const q = 1 + 0.02 * Math.sin(now / 75) * p;
        const ry = r * (1 + 0.18 * easeIn(p)) * q;
        const rx = (r * (1 - 0.06 * easeIn(p))) / Math.sqrt(q);

        setShape(
          pendantPath(L, nw, fw, rx, ry),
          glossPath(L + ry, rx, ry),
          '',
          clamp01((now - tGrow) / 250)
        );

        if (p >= 1) {
          stage = 'pinch';
          tPinch = now;
        }
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (stage === 'pinch') {
        const qq = clamp01((now - tPinch) / PINCH);
        const nw2 = lerp(0.3 * R, 0.06 * R, easeOut(qq));
        const L = lerp(L1, L2, easeIn(qq));
        const ry2 = R * lerp(1.18, RY2, qq);
        const rx2 = R * lerp(0.94, 0.9, qq);
        const fw2 = nw2 + R * 0.6 * (1 - 0.25 * qq);

        setShape(pendantPath(L, nw2, fw2, rx2, ry2), glossPath(L + ry2, rx2, ry2), '', 1);

        if (qq >= 1) {
          stage = 'fall';
          tFall = now;
        }
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (stage === 'fall') {
        const tf = now - tFall;
        const ry3 = ryF(tf);
        const rx3 = R * (1 - (ry3 / R - 1) * 0.35);
        const cy3 = cyF(tf);
        const tail = R * (0.95 + 0.12 * Math.exp(-tf / 150) * Math.cos(tf / 45)) + R * 0.06 * (tf / Tf);

        const rl = clamp01(tf / 320);
        const L2r = (L2 / 2) * (1 - easeOut(rl));
        const remD = remnantPath(L2r, 0.06 * R, 0.06 * R + R * 0.6 * 0.75 * (1 - easeOut(rl)));

        setShape(freePath(rx3, ry3, cy3, tail), glossPath(cy3, rx3, ry3), remD, 1);

        // Animate soft ground contact shadow beneath falling drop
        if (shadowRef.current) {
          const dist = H - (cy3 + ry3);
          if (dist < 320) {
            const sp = clamp01(1 - dist / 320);
            shadowRef.current.style.width = `${(rx3 * 2.2 * sp).toFixed(1)}px`;
            shadowRef.current.style.height = `${(ry3 * 0.45 * sp).toFixed(1)}px`;
            shadowRef.current.style.opacity = `${(0.42 * sp).toFixed(2)}`;
          } else {
            shadowRef.current.style.opacity = '0';
          }
        }

        if (cy3 + ry3 >= H) {
          stage = 'squash';
          tTouch = now;
          sxc = rx3;
          syc = ry3;
          cyc = cy3;
          tailc = tail;
          if (shadowRef.current) shadowRef.current.style.opacity = '0';
          triggerImpact();
          setTimeout(() => {
            riseAndOpen();
          }, 500);
        }
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (stage === 'squash') {
        if (shadowRef.current) shadowRef.current.style.opacity = '0';
        const ti = clamp01((now - tTouch) / 240);
        const ry4 = lerp(syc, 0.1 * R, easeOut(ti));
        const rx4 = lerp(sxc, 2.6 * R, easeOut(ti));
        const tail4 = tailc * (1 - easeOut(ti));
        const cy4 = H - ry4;

        setShape(freePath(rx4, ry4, cy4, tail4), '', '', 1 - easeIn(ti));

        if (ti >= 1) {
          setShape('', '', '', 0);
          stage = 'done';
          return;
        }
        animFrameRef.current = requestAnimationFrame(frame);
      }
    };

    animFrameRef.current = requestAnimationFrame(frame);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        finish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      document.documentElement.classList.remove('is-loading');
      document.body.classList.remove('is-loading');
    };
  }, [finish, onOpeningChange, triggerImpact]);

  if (isGone) return null;

  return (
    <div
      id="preloader"
      ref={containerRef}
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[99999] bg-white overflow-hidden select-none pointer-events-auto w-full max-w-full"
    >
      {/* SVG Definitions for Blood Gradient */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="bloodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e63946" />
            <stop offset="55%" stopColor="#c1121f" />
            <stop offset="100%" stopColor="#8d0b16" />
          </linearGradient>
        </defs>
      </svg>

      {/* Camera and Droplet Layer */}
      <div ref={camRef} className="absolute inset-0 z-[1] origin-[50%_100%] will-change-transform">
        <svg className="absolute left-1/2 top-0 z-[2] overflow-visible pointer-events-none" width="1" height="1" aria-hidden="true">
          <path ref={remnantRef} fill="#e63946" />
          <path ref={bodyRef} fill="url(#bloodGrad)" />
          <path ref={glossRef} fill="none" stroke="#fff" strokeLinecap="round" opacity="0.55" />
        </svg>

        {/* Soft realistic ground contact shadow beneath falling drop */}
        <div
          ref={shadowRef}
          className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-[50%] bg-[#50000a]/30 blur-[2px] pointer-events-none will-change-transform"
          style={{ width: '0px', height: '0px', opacity: 0 }}
        />

        {/* Bottom Puddle */}
        <div
          ref={puddleRef}
          className="absolute left-1/2 bottom-[-1px] w-0 h-[1.6vh] min-h-[8px] -translate-x-1/2 bg-gradient-to-t from-[#a30f1b] to-[#d3202e] rounded-t-[50%] transition-all duration-[1100ms] ease-[cubic-bezier(.25,.8,.25,1)]"
        />
      </div>

      {/* Rising Blood Pool with Generous Over-Extension to 100% Fill Viewport */}
      <div
        ref={poolRef}
        className="absolute left-0 right-0 top-full h-[calc(100%+450px)] z-[3] overflow-hidden flex flex-col will-change-transform"
      >
        {/* Relative container for waves overlay */}
        <div className="relative w-full h-[140px] shrink-0 overflow-hidden -mb-[1px]">
          {/* Layer 2 Waves (Lighter) positioned absolute top-[-10px] over Layer 1 */}
          <svg
            className="absolute top-[-10px] left-0 block w-[200%] h-[140px] opacity-45 animate-[waveMove_6s_linear_infinite_reverse]"
            viewBox="0 0 2880 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 70Q180 0 360 70T720 70T1080 70T1440 70T1800 70T2160 70T2520 70T2880 70V140H0Z" fill="#ff4d5e" />
          </svg>

          {/* Layer 1 Waves (Primary Crimson) */}
          <svg
            className="block w-[200%] h-[140px] animate-[waveMove_4s_linear_infinite]"
            viewBox="0 0 2880 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 80Q180 10 360 80T720 80T1080 80T1440 80T1800 80T2160 80T2520 80T2880 80V140H0Z" fill="#c1121f" />
          </svg>
        </div>

        {/* Deep Solid Crimson Fluid Body Filling 100% of Space */}
        <div className="flex-1 min-h-screen bg-gradient-to-b from-[#c1121f] via-[#a50f1c] to-[#7d0a14]" />
      </div>

      {/* Tagline on Red Screen: Steady, elegant and zero-lag with NO size changes */}
      <motion.div
        animate={{
          opacity: showTag && !tagOut ? 1 : 0,
        }}
        transition={{
          opacity: { duration: tagOut ? 0.35 : 0.6, ease: 'easeOut' },
        }}
        className="absolute left-0 right-0 top-1/2 z-[4] text-center text-white uppercase text-[clamp(14px,2.2vw,18px)] -translate-y-1/2 pointer-events-none font-semibold px-4 select-none drop-shadow-sm tracking-[0.38em]"
      >
        Every drop saves a life
      </motion.div>
    </div>
  );
};
