import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, FastForward, Activity } from 'lucide-react';

interface BloodPreloaderProps {
  onComplete: () => void;
}

export const BloodPreloader: React.FC<BloodPreloaderProps> = ({ onComplete }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [radialRadius, setRadialRadius] = useState<number>(0);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [bpmPulse, setBpmPulse] = useState(72);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const camRef = useRef<HTMLDivElement | null>(null);
  const puddleRef = useRef<HTMLDivElement | null>(null);
  const poolRef = useRef<HTMLDivElement | null>(null);
  const bodyPathRef = useRef<SVGPathElement | null>(null);
  const glossPathRef = useRef<SVGPathElement | null>(null);
  const remnantPathRef = useRef<SVGPathElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isFinishedRef = useRef(false);

  // Math helper functions
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t: number) => t * t * t;
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const f = (n: number) => n.toFixed(2);

  // SVG Geometry generators
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

  // Web Audio Synthesizer Initialization
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const master = ctx.createGain();
        master.gain.value = 0.95;
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);

        const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        audioContextRef.current = ctx;
        masterGainRef.current = master;
        noiseBufferRef.current = noiseBuf;

        const checkAudioRunning = () => {
          if (ctx.state === 'running') {
            setAudioReady(true);
          }
        };

        ctx.onstatechange = checkAudioRunning;
        checkAudioRunning();
      }
    } catch {
      // Audio context unavailable or blocked
    }

    const unlockAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().then(() => {
          setAudioReady(true);
        }).catch(() => {});
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Audio trigger helpers
  const playDropSound = useCallback((delay = 0) => {
    const ctx = audioContextRef.current;
    const master = masterGainRef.current;
    const noiseBuf = noiseBufferRef.current;
    if (!ctx || ctx.state !== 'running' || !master || !noiseBuf || isMuted) return;

    try {
      const t = ctx.currentTime + Math.max(0, delay);

      // Noise burst for surface tension impact tick
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      noiseSource.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.value = 0.9;
      noiseFilter.frequency.setValueAtTime(3000, t);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.18, t + 0.003);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noiseSource.start(t);
      noiseSource.stop(t + 0.04);

      // Main resonant rising liquid plip
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(430, t);
      osc1.frequency.exponentialRampToValueAtTime(1050, t + 0.06);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.0001, t);
      gain1.gain.exponentialRampToValueAtTime(0.6, t + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc1.connect(gain1);
      gain1.connect(master);
      osc1.start(t);
      osc1.stop(t + 0.3);

      // Harmonic sheen
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(900, t);
      osc2.frequency.exponentialRampToValueAtTime(2100, t + 0.06);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start(t);
      osc2.stop(t + 0.16);

      // Warm low-frequency liquid body
      const osc3 = ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(165, t);
      osc3.frequency.exponentialRampToValueAtTime(90, t + 0.18);
      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.0001, t);
      gain3.gain.exponentialRampToValueAtTime(0.28, t + 0.005);
      gain3.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc3.connect(gain3);
      gain3.connect(master);
      osc3.start(t);
      osc3.stop(t + 0.26);
    } catch {
      // Audio playback catch
    }
  }, [isMuted]);

  const playHeartbeat = useCallback(() => {
    const ctx = audioContextRef.current;
    const master = masterGainRef.current;
    const noiseBuf = noiseBufferRef.current;
    if (!ctx || ctx.state !== 'running' || !master || !noiseBuf || isMuted) return;

    try {
      const t = ctx.currentTime;

      // Lub (First Heart Tone: S1)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(78, t);
      osc1.frequency.exponentialRampToValueAtTime(42, t + 0.2);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.0001, t);
      gain1.gain.exponentialRampToValueAtTime(0.75, t + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc1.connect(gain1);
      gain1.connect(master);
      osc1.start(t);
      osc1.stop(t + 0.22);

      // Cardiac ventricular thump
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(260, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(90, t + 0.16);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.25, t + 0.008);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noiseSource.start(t);
      noiseSource.stop(t + 0.18);

      // Dub (Second Heart Tone: S2, delayed by 0.22s)
      const tDub = t + 0.22;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(66, tDub);
      osc2.frequency.exponentialRampToValueAtTime(36, tDub + 0.22);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.0001, tDub);
      gain2.gain.exponentialRampToValueAtTime(0.55, tDub + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.0001, tDub + 0.22);
      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start(tDub);
      osc2.stop(tDub + 0.24);
    } catch {
      // Audio playback catch
    }
  }, [isMuted]);

  // Finish preloader immediately (e.g. Skip button or complete)
  const finish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    document.body.classList.remove('is-loading');
    onComplete();
  }, [onComplete]);

  // Dynamic Erythrocyte (Red Blood Cell) Splash Particles
  const triggerSplash = useCallback(() => {
    const cam = camRef.current;
    if (!cam) return;

    const m = Math.min(window.innerWidth, window.innerHeight);
    const partsCount = 26;

    for (let i = 0; i < partsCount; i++) {
      const angle = (Math.random() * 2 - 1) * 1.25;
      const speed = 0.24 * m * (0.55 + Math.random() * 0.65);
      const dx = Math.sin(angle) * speed * 1.15;
      const up = Math.cos(angle) * speed;
      const size = 3.5 + Math.random() * 7;
      const isCell = i % 2 === 0;

      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.left = '50%';
      p.style.bottom = '0';
      p.style.width = `${size}px`;
      p.style.height = isCell ? `${size * 0.75}px` : `${size}px`;
      p.style.marginLeft = `${-size / 2}px`;
      p.style.borderRadius = isCell ? '50%' : '50% 50% 50% 50%';
      p.style.background = isCell
        ? 'radial-gradient(circle at 35% 35%, #ff4d5e 0%, #c1121f 55%, #7a0c17 100%)'
        : '#d72638';
      p.style.boxShadow = '0 0 6px rgba(215,38,56,0.6)';
      p.style.pointerEvents = 'none';
      p.style.willChange = 'transform, opacity';
      cam.appendChild(p);

      const anim = p.animate(
        [
          { transform: 'translate(0, 0) scale(0.6) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.2,.7,.4,1)' },
          {
            offset: 0.5,
            transform: `translate(${dx * 0.75}px, ${-up}px) scale(1) rotate(${Math.random() * 180}deg)`,
            opacity: 1,
            easing: 'cubic-bezier(.5,0,.9,.5)',
          },
          { transform: `translate(${dx}px, ${size * 2}px) scale(0.4) rotate(${Math.random() * 360}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 600, fill: 'forwards' }
      );

      anim.onfinish = () => p.remove();
    }

    // Ripple shockwave rings on bottom puddle
    for (let r = 0; r < 2; r++) {
      const ring = document.createElement('div');
      ring.style.position = 'absolute';
      ring.style.left = '50%';
      ring.style.bottom = '-3px';
      ring.style.width = '24px';
      ring.style.height = '8px';
      ring.style.marginLeft = '-12px';
      ring.style.borderRadius = '50%';
      ring.style.border = '2px solid rgba(215, 38, 56, 0.9)';
      ring.style.boxShadow = '0 0 10px rgba(215, 38, 56, 0.7)';
      ring.style.pointerEvents = 'none';
      cam.appendChild(ring);

      const ringAnim = ring.animate(
        [
          { transform: 'scale(0.3)', opacity: 0.9 },
          { transform: 'scale(18, 5)', opacity: 0 },
        ],
        { duration: 1400, delay: r * 200, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'forwards' }
      );
      ringAnim.onfinish = () => ring.remove();
    }
  }, []);

  // Main Animation Orchestration
  useEffect(() => {
    document.body.classList.add('is-loading');

    const H = window.innerHeight;
    const W = window.innerWidth;
    const R = Math.max(16, Math.min(26, W * 0.026));
    const L1 = 1.5 * R;
    const L2 = L1 + 0.45 * R;
    const RY2 = 1.3;
    const cyD = L2 + RY2 * R;

    if (glossPathRef.current) {
      glossPathRef.current.setAttribute('stroke-width', Math.max(1.4, R * 0.17).toFixed(2));
    }

    const Tf = clamp01((1150 * Math.sqrt(H / 700) - 800) / 800) * 800 + 800;
    const g = (2 * (H - cyD - R * 1.1)) / (Tf * Tf);
    const ryF = (tf: number) => R * (1.1 + 0.2 * Math.exp(-tf / 130) + 0.12 * (tf / Tf));
    const cyF = (tf: number) => cyD + 0.5 * g * tf * tf;

    let tc = 0;
    while (tc < 6000 && cyF(tc) + ryF(tc) < H) tc += 2;

    const GROW = 1300;
    const PINCH = 220;

    let stage: 'grow' | 'pinch' | 'fall' | 'squash' | 'done' = 'grow';
    const tGrow = performance.now();
    let tPinch = 0;
    let tFall = 0;
    let tTouch = 0;
    let sxc = 1;
    let syc = 1;
    let cyc = 0;
    let tailc = 0;
    let soundScheduled = false;

    const setShape = (body: string, gl: string, rem: string, op: number) => {
      if (bodyPathRef.current) {
        bodyPathRef.current.setAttribute('d', body);
        bodyPathRef.current.setAttribute('opacity', op.toString());
      }
      if (glossPathRef.current) {
        glossPathRef.current.setAttribute('d', gl);
      }
      if (remnantPathRef.current) {
        remnantPathRef.current.setAttribute('d', rem);
      }
    };

    // Stage 4 & 5: Pool Rise, Waves & Heartbeat
    const riseAndOpen = () => {
      const pool = poolRef.current;
      if (!pool) {
        finish();
        return;
      }

      // Smooth Pool Rise
      const riseAnim = pool.animate(
        [
          { transform: 'translateY(0)' },
          { transform: `translateY(${-(H + 160)}px)` },
        ],
        { duration: 2200, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' }
      );

      riseAnim.finished.then(() => {
        setTaglineVisible(true);
        let beating = true;

        // Heartbeat pulse interval
        const beatInterval = setInterval(() => {
          if (!beating || isFinishedRef.current) return;
          playHeartbeat();
          setBpmPulse(prev => (prev === 72 ? 74 : 72));
        }, 1050);

        playHeartbeat();

        // Hold crimson screen for 2.4s then trigger radial aperture reveal
        setTimeout(() => {
          beating = false;
          clearInterval(beatInterval);
          setTaglineVisible(false);
          setIsOpening(true);

          // Radial Mask Aperture Reveal Animation
          const maxRadius = Math.hypot(W / 2, H) + 60;
          const apertureDuration = 1800;
          const tApertureStart = performance.now();

          const stepAperture = (now: number) => {
            if (isFinishedRef.current) return;
            const progress = Math.min((now - tApertureStart) / apertureDuration, 1);
            const currentR = maxRadius * easeInOut(progress);
            setRadialRadius(currentR);

            if (progress < 1) {
              requestAnimationFrame(stepAperture);
            } else {
              finish();
            }
          };

          requestAnimationFrame(stepAperture);
        }, 2400);
      });
    };

    // Stage 3 Impact Handler
    const handleImpact = () => {
      if (puddleRef.current) {
        puddleRef.current.style.width = '36vw';
        puddleRef.current.style.height = '3.5vh';
      }
      triggerSplash();
      playDropSound(0);

      if (camRef.current) {
        camRef.current.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.025)', offset: 0.3 },
            { transform: 'scale(1)' },
          ],
          { duration: 750, easing: 'ease-in-out' }
        );
      }

      setTimeout(() => {
        riseAndOpen();
      }, 500);
    };

    // Main RequestAnimationFrame Loop for Drip Physics
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
        animationFrameRef.current = requestAnimationFrame(frame);
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
        animationFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (stage === 'fall') {
        const tf = now - tFall;
        const ry3 = ryF(tf);
        const rx3 = R * (1 - (ry3 / R - 1) * 0.35);
        const cy3 = cyF(tf);
        const tail = R * (0.95 + 0.12 * Math.exp(-tf / 150) * Math.cos(tf / 45)) + R * 0.06 * (tf / Tf);

        // Neck springs back up
        const rl = clamp01(tf / 320);
        const L2r = (L2 / 2) * (1 - easeOut(rl));
        const remD = remnantPath(L2r, 0.06 * R, 0.06 * R + R * 0.6 * 0.75 * (1 - easeOut(rl)));

        setShape(freePath(rx3, ry3, cy3, tail), glossPath(cy3, rx3, ry3), remD, 1);

        // Pre-schedule sound 40ms before touch for zero-latency acoustic landing
        if (!soundScheduled && cy3 + ry3 >= H - 15) {
          soundScheduled = true;
          playDropSound(0);
        }

        if (cy3 + ry3 >= H) {
          stage = 'squash';
          tTouch = now;
          sxc = rx3;
          syc = ry3;
          cyc = cy3;
          tailc = tail;
          handleImpact();
        }
        animationFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (stage === 'squash') {
        const ti = clamp01((now - tTouch) / 220);
        const ry4 = lerp(syc, 0.08 * R, easeOut(ti));
        const rx4 = lerp(sxc, 2.7 * R, easeOut(ti));
        const tail4 = tailc * (1 - easeOut(ti));
        const cy4 = H - ry4;

        setShape(freePath(rx4, ry4, cy4, tail4), '', '', 1 - easeIn(ti));

        if (ti >= 1) {
          setShape('', '', '', 0);
          stage = 'done';
          return;
        }
        animationFrameRef.current = requestAnimationFrame(frame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(frame);

    // Keyboard shortcut to skip intro
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        finish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.body.classList.remove('is-loading');
    };
  }, [finish, playDropSound, playHeartbeat, triggerSplash]);

  return (
    <div
      ref={containerRef}
      role="status"
      aria-label="Loading BloodMatch System"
      className="fixed inset-0 z-[99999] bg-white overflow-hidden select-none pointer-events-auto"
      style={
        isOpening
          ? {
              WebkitMaskImage: `radial-gradient(circle at 50% 100%, rgba(0,0,0,0) ${radialRadius}px, #000 ${
                radialRadius + 3
              }px)`,
              maskImage: `radial-gradient(circle at 50% 100%, rgba(0,0,0,0) ${radialRadius}px, #000 ${
                radialRadius + 3
              }px)`,
            }
          : undefined
      }
    >
      {/* Global Clinical SVG Filters & Gradients */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="preloaderBloodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e63946" />
            <stop offset="55%" stopColor="#c1121f" />
            <stop offset="100%" stopColor="#8d0b16" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Clinical Utility Bar: Audio Toggle & Emergency Skip */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 shadow-md">
          <Activity className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
          <span className="hidden sm:inline font-semibold tracking-wider">BLOODMATCH // INITIALIZING</span>
          <span className="text-[10px] text-white/60">[{bpmPulse} BPM]</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Toggle Button */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer shadow-md"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[11px] font-semibold">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#D72638] animate-pulse" />
                <span className="text-[11px] font-semibold">{audioReady ? 'Sound On' : 'Tap for Sound'}</span>
              </>
            )}
          </button>

          {/* Emergency Skip Button */}
          <button
            onClick={finish}
            aria-label="Skip Preloader Introduction"
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#D72638] hover:bg-[#b01e2c] text-white font-sans font-bold text-xs tracking-wide shadow-lg shadow-[#D72638]/30 transition-transform active:scale-95 cursor-pointer"
          >
            <span>Skip Intro</span>
            <FastForward className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>

      {/* Droplet & Camera Physics Viewport */}
      <div ref={camRef} className="absolute inset-0 z-10 origin-bottom will-change-transform">
        <svg className="absolute left-1/2 top-0 z-20 overflow-visible pointer-events-none" width="1" height="1">
          <path ref={remnantPathRef} fill="#e63946" />
          <path ref={bodyPathRef} fill="url(#preloaderBloodGrad)" />
          <path ref={glossPathRef} fill="none" stroke="#ffffff" strokeLinecap="round" opacity="0.6" />
        </svg>

        {/* Dynamic Expanding Bottom Puddle */}
        <div
          ref={puddleRef}
          className="absolute left-1/2 bottom-[-1px] w-0 h-[1.6vh] min-h-[8px] -translate-x-1/2 bg-gradient-to-t from-[#8d0b16] via-[#c1121f] to-[#e63946] rounded-t-[50%] transition-all duration-[1100ms] ease-[cubic-bezier(.25,.8,.25,1)]"
        />
      </div>

      {/* Rising Blood Pool with Dual Sinusoidal Animated Waves */}
      <div
        ref={poolRef}
        className="absolute left-0 right-0 top-full h-[calc(100%+220px)] z-30 overflow-hidden flex flex-col will-change-transform"
      >
        {/* Layer 2 Secondary Translucent Crimson Wave (Reverse motion) */}
        <svg
          className="w-[200%] h-[120px] -mb-1 shrink-0 opacity-45 animate-[waveMove_6s_linear_infinite_reverse]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 60Q180 0 360 60T720 60T1080 60T1440 60T1800 60T2160 60T2520 60T2880 60V120H0Z"
            fill="#ff4d5e"
          />
        </svg>

        {/* Layer 1 Primary Arterial Wave */}
        <svg
          className="w-[200%] h-[120px] -mb-1 shrink-0 animate-[waveMove_4s_linear_infinite]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 70Q180 10 360 70T720 70T1080 70T1440 70T1800 70T2160 70T2520 70T2880 70V120H0Z"
            fill="#c1121f"
          />
        </svg>

        {/* Deep Arterial Fluid Body */}
        <div className="flex-1 bg-gradient-to-b from-[#c1121f] via-[#a50f1c] to-[#7d0a14] relative">
          {/* Subtle Ambient Red Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_rgba(255,255,255,0.15)_0%,_transparent_60%)] pointer-events-none" />
        </div>
      </div>

      {/* Tagline & Clinical Heartbeat Telemetry on Crimson Screen */}
      <div
        className={`absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none transition-all duration-1000 ${
          taglineVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 font-mono text-xs uppercase tracking-widest mb-4">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          Autonomous Transfusion Compatibility
        </div>

        <h1 className="text-white text-center font-black tracking-[0.32em] uppercase text-lg sm:text-2xl md:text-3xl max-w-xl px-4 drop-shadow-md">
          Every drop saves a life
        </h1>

        <p className="text-white/70 text-xs sm:text-sm font-sans tracking-wide mt-3">
          BloodMatch Emergency Clinical Network
        </p>
      </div>

      {/* Opening Aperture Shockwave Glow Ring (Active when radial mask expands) */}
      {isOpening && (
        <div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-none z-50 rounded-full border-2 border-[#D72638] shadow-[0_0_50px_rgba(215,38,56,0.8)]"
          style={{
            width: `${radialRadius * 2}px`,
            height: `${radialRadius * 2}px`,
            transform: 'translate(-50%, 50%)',
          }}
        />
      )}
    </div>
  );
};
