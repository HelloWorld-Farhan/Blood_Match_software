import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BloodPreloaderProps {
  onComplete: () => void;
  onOpeningChange?: (isOpening: boolean) => void;
}

export const BloodPreloader: React.FC<BloodPreloaderProps> = ({ onComplete, onOpeningChange }) => {
  const [radialR, setRadialR] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const [isGone, setIsGone] = useState(false);
  const [showTag, setShowTag] = useState(false);
  const [tagOut, setTagOut] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [tagPulse, setTagPulse] = useState(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const camRef = useRef<HTMLDivElement | null>(null);
  const puddleRef = useRef<HTMLDivElement | null>(null);
  const poolRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<SVGPathElement | null>(null);
  const glossRef = useRef<SVGPathElement | null>(null);
  const remnantRef = useRef<SVGPathElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseBufRef = useRef<AudioBuffer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isFinishedRef = useRef(false);

  // Easing & math helpers matching original physics
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

  // Immediate AudioContext Unlock on first mount or gesture
  useEffect(() => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0.95;
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);

        const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        audioCtxRef.current = ctx;
        masterGainRef.current = master;
        noiseBufRef.current = noiseBuf;

        // Proactively probe / resume immediately
        if (ctx.state !== 'running') {
          ctx.resume().catch(() => {});
          try {
            const b = ctx.createBuffer(1, 1, 22050);
            const s = ctx.createBufferSource();
            s.buffer = b;
            s.connect(ctx.destination);
            s.start(0);
          } catch {}
        }
      }
    } catch {}

    const unlock = () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'running') {
        audioCtxRef.current.resume().catch(() => {});
      }
    };

    const events = ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'keydown', 'click'];
    events.forEach(ev => window.addEventListener(ev, unlock, { passive: true, capture: true }));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, unlock));
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const isAudioRunning = () => !!audioCtxRef.current && audioCtxRef.current.state === 'running';

  // Sound Synthesizers matching blood-preloader.html exactly
  const playDropSound = useCallback((delay = 0) => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    const noiseBuf = noiseBufRef.current;
    if (!ctx || ctx.state !== 'running' || !master || !noiseBuf) return false;

    try {
      const lat = ctx.outputLatency || ctx.baseLatency || 0;
      const t = ctx.currentTime + Math.max(0, delay - lat);

      // Noise Burst
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const fFilter = ctx.createBiquadFilter();
      fFilter.type = 'bandpass';
      fFilter.Q.value = 0.9;
      fFilter.frequency.setValueAtTime(3000, t);
      const gNoise = ctx.createGain();
      gNoise.gain.setValueAtTime(0.0001, t);
      gNoise.gain.exponentialRampToValueAtTime(0.16, t + 0.003);
      gNoise.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      s.connect(fFilter);
      fFilter.connect(gNoise);
      gNoise.connect(master);
      s.start(t, Math.random() * 0.5);
      s.stop(t + 0.04);

      // Tones (Tone 1: rising plip)
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(430, t);
      o1.frequency.exponentialRampToValueAtTime(1050, t + 0.06);
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.0001, t);
      g1.gain.exponentialRampToValueAtTime(0.6, t + 0.005);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o1.connect(g1);
      g1.connect(master);
      o1.start(t);
      o1.stop(t + 0.33);

      // Tone 2: high shimmer
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(900, t);
      o2.frequency.exponentialRampToValueAtTime(2100, t + 0.06);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.11, t + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o2.connect(g2);
      g2.connect(master);
      o2.start(t);
      o2.stop(t + 0.19);

      // Tone 3: deep soft liquid body
      const o3 = ctx.createOscillator();
      o3.type = 'sine';
      o3.frequency.setValueAtTime(165, t);
      o3.frequency.exponentialRampToValueAtTime(90, t + 0.18);
      const g3 = ctx.createGain();
      g3.gain.setValueAtTime(0.0001, t);
      g3.gain.exponentialRampToValueAtTime(0.26, t + 0.005);
      g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o3.connect(g3);
      g3.connect(master);
      o3.start(t);
      o3.stop(t + 0.29);

      return true;
    } catch {
      return false;
    }
  }, []);

  const playHeartbeat = useCallback(() => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    const noiseBuf = noiseBufRef.current;
    if (!ctx || ctx.state !== 'running' || !master || !noiseBuf) return;

    try {
      const t = ctx.currentTime;
      // Lub tone
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(78, t);
      o1.frequency.exponentialRampToValueAtTime(42, t + 0.2);
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.0001, t);
      g1.gain.exponentialRampToValueAtTime(0.75, t + 0.005);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o1.connect(g1);
      g1.connect(master);
      o1.start(t);
      o1.stop(t + 0.25);

      // Lub thump noise
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(260, t);
      fl.frequency.exponentialRampToValueAtTime(90, t + 0.16);
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.25, t + 0.003);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      s.connect(fl);
      fl.connect(gn);
      gn.connect(master);
      s.start(t, Math.random() * 0.5);
      s.stop(t + 0.21);

      // Dub tone (offset 0.22s)
      const tDub = t + 0.22;
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(66, tDub);
      o2.frequency.exponentialRampToValueAtTime(36, tDub + 0.22);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, tDub);
      g2.gain.exponentialRampToValueAtTime(0.55, tDub + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, tDub + 0.22);
      o2.connect(g2);
      g2.connect(master);
      o2.start(tDub);
      o2.stop(tDub + 0.27);
    } catch {}
  }, []);

  const finish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    document.body.classList.remove('is-loading');
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
    if (camRef.current) {
      camRef.current.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.02)', offset: 0.3 },
          { transform: 'scale(1)' },
        ],
        { duration: 800, easing: 'ease-in-out' }
      );
    }
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
    const MAXHOLD = 2600;

    let stage: 'grow' | 'hold' | 'pinch' | 'fall' | 'squash' | 'done' = 'grow';
    const tGrow = performance.now();
    let tHold = 0;
    let tPinch = 0;
    let tFall = 0;
    let tTouch = 0;
    let touchAt = 0;
    let scheduled = false;
    let sxc = 1;
    let syc = 1;
    let cyc = 0;
    let tailc = 0;

    const scheduleSound = () => {
      if (scheduled || !touchAt) return;
      const until = touchAt - performance.now();
      if (until > 30 && playDropSound(until / 1000)) {
        scheduled = true;
      }
    };

    const setShape = (body: string, gl: string, rem: string, op: number) => {
      if (bodyRef.current) {
        bodyRef.current.setAttribute('d', body);
        bodyRef.current.setAttribute('opacity', op.toString());
      }
      if (glossRef.current) glossRef.current.setAttribute('d', gl);
      if (remnantRef.current) remnantRef.current.setAttribute('d', rem);
    };

    // Pool Rise & Aperture Mask Step
    const riseAndOpen = () => {
      const pool = poolRef.current;
      if (!pool) {
        finish();
        return;
      }

      const RISE = 2400;
      const riseAnim = pool.animate(
        [
          { transform: 'translateY(0)' },
          { transform: `translateY(${-(H + 150)}px)` },
        ],
        { duration: RISE, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' }
      );

      riseAnim.finished.then(() => {
        setShowTag(true);
        let beating = true;

        const pulseLoop = () => {
          if (!beating || isFinishedRef.current) return;
          playHeartbeat();
          setTagPulse(1.08);
          setTimeout(() => setTagPulse(1), 350);
          setTimeout(pulseLoop, 1050);
        };
        pulseLoop();

        setTimeout(() => {
          beating = false;
          setTagOut(true);
          setIsOpening(true);
          onOpeningChange?.(true);

          const maxR = Math.hypot(W / 2, H) + 30;
          const dur = 1900;
          const t0 = performance.now();

          const stepAperture = (now: number) => {
            if (isFinishedRef.current) return;
            const t = Math.min((now - t0) / dur, 1);
            setRadialR(maxR * easeInOut(t));
            if (t < 1) {
              requestAnimationFrame(stepAperture);
            } else {
              finish();
            }
          };
          requestAnimationFrame(stepAperture);
        }, 2700);
      });
    };

    // Frame Physics Loop
    const frame = (now: number) => {
      if (isFinishedRef.current) return;

      if (stage === 'grow' || stage === 'hold') {
        let p = 0;
        let trem = 0;
        if (stage === 'grow') {
          p = clamp01((now - tGrow) / GROW);
          if (p >= 1) {
            if (isAudioRunning()) {
              stage = 'pinch';
              tPinch = now;
              touchAt = now + PINCH + tc;
              scheduleSound();
            } else {
              stage = 'hold';
              tHold = now;
              setShowHint(true);
            }
          }
        }

        if (stage === 'hold') {
          p = 1;
          trem = 1;
          if (isAudioRunning() || now - tHold > MAXHOLD) {
            setShowHint(false);
            stage = 'pinch';
            tPinch = now;
            touchAt = now + PINCH + tc;
            scheduleSound();
          }
        }

        if (stage === 'grow' || stage === 'hold') {
          const r = R * lerp(0.28, 1, easeOut(clamp01(p / 0.8)));
          const L = L1 * easeInOut(p);
          const nw = r * lerp(0.9, 0.3, easeIn(p));
          const fw = nw + R * lerp(0.25, 0.6, p);
          const q = 1 + 0.02 * Math.sin(now / 75) * p + trem * 0.035 * Math.sin(now / 38);
          const ry = r * (1 + 0.18 * easeIn(p)) * q;
          const rx = (r * (1 - 0.06 * easeIn(p))) / Math.sqrt(q);

          setShape(
            pendantPath(L, nw, fw, rx, ry),
            glossPath(L + ry, rx, ry),
            '',
            clamp01((now - tGrow) / 250)
          );
          animFrameRef.current = requestAnimationFrame(frame);
          return;
        }
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

        if (cy3 + ry3 >= H) {
          stage = 'squash';
          tTouch = now;
          sxc = rx3;
          syc = ry3;
          cyc = cy3;
          tailc = tail;
          triggerImpact();
          setTimeout(() => {
            riseAndOpen();
          }, 600);
        }
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (stage === 'squash') {
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
      document.body.classList.remove('is-loading');
    };
  }, [finish, isAudioRunning, onOpeningChange, playDropSound, playHeartbeat, triggerImpact]);

  if (isGone) return null;

  return (
    <div
      ref={containerRef}
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[99999] bg-white overflow-hidden select-none pointer-events-auto"
      style={
        isOpening
          ? {
              WebkitMaskImage: `radial-gradient(circle at 50% 100%, rgba(0,0,0,0) ${radialR}px, #000 ${radialR + 2}px)`,
              maskImage: `radial-gradient(circle at 50% 100%, rgba(0,0,0,0) ${radialR}px, #000 ${radialR + 2}px)`,
            }
          : undefined
      }
    >
      {/* SVG Definitions for Blood Gradient */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="bloodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e63946" />
            <stop offset="0.55" stopColor="#c1121f" />
            <stop offset="1" stopColor="#8d0b16" />
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

        {/* Bottom Puddle */}
        <div
          ref={puddleRef}
          className="absolute left-1/2 bottom-[-1px] w-0 h-[1.6vh] min-h-[8px] -translate-x-1/2 bg-gradient-to-t from-[#a30f1b] to-[#d3202e] rounded-t-[50%] transition-all duration-[1100ms] ease-[cubic-bezier(.25,.8,.25,1)]"
        />
      </div>

      {/* Rising Blood Pool with Live Waves */}
      <div
        ref={poolRef}
        className="absolute left-0 right-0 top-full h-[calc(100%+200px)] z-[3] overflow-hidden flex flex-col will-change-transform"
      >
        <svg
          className="shrink-0 block w-[200%] h-[120px] -mb-[1px] opacity-45 animate-[waveMove_6s_linear_infinite_reverse]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 60Q180 0 360 60T720 60T1080 60T1440 60T1800 60T2160 60T2520 60T2880 60V120H0Z" fill="#ff4d5e" />
        </svg>

        <svg
          className="shrink-0 block w-[200%] h-[120px] -mb-[1px] animate-[waveMove_4s_linear_infinite]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 70Q180 10 360 70T720 70T1080 70T1440 70T1800 70T2160 70T2520 70T2880 70V120H0Z" fill="#c1121f" />
        </svg>

        <div className="flex-1 bg-gradient-to-b from-[#c1121f] via-[#a50f1c] to-[#7d0a14]" />
      </div>

      {/* Tagline on Red Screen: Every drop saves a life */}
      <motion.div
        animate={{
          scale: tagPulse,
          opacity: showTag && !tagOut ? 1 : 0,
          letterSpacing: showTag && !tagOut ? '0.38em' : '0.7em',
        }}
        transition={{
          opacity: { duration: tagOut ? 0.5 : 1 },
          letterSpacing: { duration: 1.6, ease: [0.2, 0.7, 0.2, 1] },
          scale: { duration: 0.35, ease: 'easeOut' },
        }}
        className="absolute left-0 right-0 top-1/2 z-[4] text-center text-white uppercase text-[clamp(12px,2.4vw,17px)] -translate-y-1/2 pointer-events-none font-medium px-4 select-none"
      >
        Every drop saves a life
      </motion.div>

      {/* Audio Tap Hint if audio is blocked */}
      <div
        className={`absolute left-0 right-0 bottom-[7vh] z-[5] text-center text-[#9a9a9a] text-[11px] tracking-[0.34em] uppercase pointer-events-none transition-opacity duration-600 ${
          showHint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Tap anywhere for sound
      </div>

      {/* Discreet Minimalist Skip Intro Button (Top Right) */}
      <button
        onClick={finish}
        aria-label="Skip Intro"
        className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/50 text-white/80 hover:text-white text-[11px] tracking-wider uppercase font-semibold backdrop-blur-sm border border-white/10 transition-all cursor-pointer select-none"
      >
        Skip
      </button>
    </div>
  );
};
