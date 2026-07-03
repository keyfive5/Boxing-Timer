import { useEffect, useMemo, useRef, useState } from 'react';
import { Settings } from './settings';

export type Phase = 'prep' | 'round' | 'rest';
export type TimerStatus = 'running' | 'paused' | 'done';

export interface Segment {
  phase: Phase;
  round: number; // 1-based; 0 for prep
  startMs: number;
  durMs: number;
}

export interface TimerHandlers {
  onSegmentStart?: (seg: Segment) => void;
  onWarning?: (seg: Segment) => void;
  onCountdownTick?: (secLeft: number) => void;
  onDone?: () => void;
}

export function buildSegments(s: Settings): Segment[] {
  const segs: Segment[] = [];
  let t = 0;
  if (s.prepSec > 0) {
    segs.push({ phase: 'prep', round: 0, startMs: t, durMs: s.prepSec * 1000 });
    t += s.prepSec * 1000;
  }
  for (let r = 1; r <= s.rounds; r++) {
    segs.push({ phase: 'round', round: r, startMs: t, durMs: s.roundSec * 1000 });
    t += s.roundSec * 1000;
    if (r < s.rounds && s.restSec > 0) {
      segs.push({ phase: 'rest', round: r, startMs: t, durMs: s.restSec * 1000 });
      t += s.restSec * 1000;
    }
  }
  return segs;
}

const TICK_MS = 100;
const WARNING_MS = 15_000;

// Wall-clock based interval engine: remaining time is always derived from
// Date.now(), so ticks can be delayed (backgrounding, JS lag) without drift.
export function useWorkoutTimer(settings: Settings, handlers: TimerHandlers) {
  const segments = useMemo(() => buildSegments(settings), [settings]);
  const totalMs = segments.length
    ? segments[segments.length - 1].startMs + segments[segments.length - 1].durMs
    : 0;

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [status, setStatus] = useState<TimerStatus>('running');
  const [elapsedMs, setElapsedMs] = useState(0);

  const startRef = useRef(Date.now());
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(0);
  const lastSegRef = useRef(-1);
  const warnedSegRef = useRef(-1);
  const lastCountRef = useRef('');
  const statusRef = useRef<TimerStatus>('running');
  statusRef.current = status;

  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      const elapsed = Date.now() - startRef.current - pausedAccumRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= totalMs) {
        setStatus('done');
        handlersRef.current.onDone?.();
        return;
      }

      const idx = segments.findIndex((seg) => elapsed < seg.startMs + seg.durMs);
      if (idx === -1) return;
      const seg = segments[idx];

      if (idx !== lastSegRef.current) {
        lastSegRef.current = idx;
        handlersRef.current.onSegmentStart?.(seg);
      }

      const remaining = seg.startMs + seg.durMs - elapsed;

      if (
        seg.phase === 'round' &&
        seg.durMs >= WARNING_MS * 2 &&
        remaining <= WARNING_MS &&
        warnedSegRef.current !== idx
      ) {
        warnedSegRef.current = idx;
        handlersRef.current.onWarning?.(seg);
      }

      if (seg.phase === 'prep' || seg.phase === 'rest') {
        const secLeft = Math.ceil(remaining / 1000);
        const key = `${idx}:${secLeft}`;
        if (secLeft <= 3 && secLeft >= 1 && lastCountRef.current !== key) {
          lastCountRef.current = key;
          handlersRef.current.onCountdownTick?.(secLeft);
        }
      }
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [status, segments, totalMs]);

  const pause = () => {
    if (statusRef.current !== 'running') return;
    pauseStartRef.current = Date.now();
    setStatus('paused');
  };

  const resume = () => {
    if (statusRef.current !== 'paused') return;
    pausedAccumRef.current += Date.now() - pauseStartRef.current;
    setStatus('running');
  };

  const skip = () => {
    if (statusRef.current !== 'running') return;
    const elapsed = Date.now() - startRef.current - pausedAccumRef.current;
    const seg = segments.find((sg) => elapsed < sg.startMs + sg.durMs);
    if (!seg) return;
    // Shift the start time so elapsed lands exactly at the segment boundary
    startRef.current = Date.now() - pausedAccumRef.current - (seg.startMs + seg.durMs);
  };

  // Derive current segment + remaining for rendering
  const clamped = Math.min(elapsedMs, totalMs);
  let segment = segments[segments.length - 1];
  let remainingMs = 0;
  for (const seg of segments) {
    if (clamped < seg.startMs + seg.durMs) {
      segment = seg;
      remainingMs = seg.startMs + seg.durMs - clamped;
      break;
    }
  }

  return { status, segment, remainingMs, elapsedMs: clamped, totalMs, pause, resume, skip };
}
