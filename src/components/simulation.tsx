import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { useControls } from '@/hooks/controls';
import { SlidingWindow } from '@/lib/sliding-window';

interface Point {
  x: number;
  y: number;
}
const addPoints = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const offsets: Point[] = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 1, y: -1 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: -1, y: 0 },
  { x: -1, y: 1 },
];

export function Simulation() {
  const { controls, controlsRef } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPaused = useRef(true);
  const frameTimes = useRef(new SlidingWindow<number>(30));
  const contextRef = useRef<CanvasRenderingContext2D>(null);
  const stateRef = useRef<{ current: Uint8Array; next: Uint8Array }>(null);

  const animateFrame = useCallback(
    (time: number) => {
      isPaused.current = controlsRef.current.paused;
      if (isPaused.current) frameTimes.current.clear();
      else requestAnimationFrame(animateFrame);

      const nextFrameTime = Math.floor((frameTimes.current.at(-1) ?? 0) + 1000 / 60 / controlsRef.current.speed);
      if (time < nextFrameTime - 3) return;

      if (!isPaused.current) frameTimes.current.push(time);
      if (!canvasRef.current) return;

      const { width, height } = canvasRef.current;

      const context = contextRef.current ?? canvasRef.current.getContext('2d', { alpha: false, desynchronized: false });
      if (!context) return;
      if (context !== contextRef.current) contextRef.current = context;

      // discard state on resize
      const state =
        stateRef.current && stateRef.current.current.length === width * height
          ? stateRef.current
          : { current: new Uint8Array(width * height), next: new Uint8Array(width * height) };

      const pointToIndex = ({ x, y }: Point): number => (y < 0 ? height + y : y >= height ? height - y : y) * width + (x < 0 ? width + x : x >= width ? width - x : x);

      const indexToPoint = (index: number): Point => ({ x: index % width, y: Math.floor(index / width) });

      // simulate state.current to state.next
      for (const [i, value] of state.current.entries()) {
        const isLive = value > 0;
        let neighboursLive = 0;
        const point = indexToPoint(i);
        for (const offset of offsets) if (state.current[pointToIndex(addPoints(point, offset))]) ++neighboursLive;
        if (isLive && neighboursLive >= 2 && neighboursLive <= 3) state.next[i] = Math.min(255, value + 1);
        else if (!isLive && neighboursLive === 3) state.next[i] = 1;
        else if (controlsRef.current.random && Math.random() > 0.999999) {
          for (let ox = -2; ox <= 2; ++ox)
            for (let oy = -2; oy <= 2; ++oy) if (Math.random() > 0.7) state.next[pointToIndex(addPoints(point, { x: ox, y: oy }))] = Math.min(255, value + 1);
        }
      }

      if (!stateRef.current)
        // clear canvas if no previous state
        context.clearRect(0, 0, width, height);

      // draw state deltas to context
      let liveCount = 0;
      let drawCount = 0;
      for (const [i, value] of state.next.entries()) {
        if (value) ++liveCount;
        const prevValue = state.current[i];
        if (value !== prevValue) {
          const point = indexToPoint(i);
          context.fillStyle = value ? `hsl(${value} 50% 50% / 100%)` : 'hsl(0 0% 0% / 100%)';
          context.fillRect(point.x, point.y, 1, 1);
          ++drawCount;
        }
      }

      // swap state.current and state.next
      state.current.fill(0);
      stateRef.current = { current: state.next, next: state.current };

      // labels
      context.clearRect(0, canvasRef.current.height - 20, canvasRef.current.width, 20);
      context.fillStyle = 'hsl(50 50% 50%/ 100%)';
      context.fillText(Math.round(time).toLocaleString(), 5, canvasRef.current.height - 5);
      context.fillStyle = 'hsl(150 50% 50%/ 100%)';
      if (frameTimes.current.size >= 2) {
        const frameRate =
          (1000 /
            frameTimes.current
              .pairs()
              .map(([a, b]) => b - a)
              .reduce((acc, item) => acc + item)) *
          (frameTimes.current.size - 1);
        context.fillText(frameRate.toFixed(1), canvasRef.current.width / 3 - 20, canvasRef.current.height - 5);
      }
      context.fillStyle = 'hsl(200 50% 50%/ 100%)';
      context.fillText(drawCount.toLocaleString(), (canvasRef.current.width / 3) * 2 - 20, canvasRef.current.height - 5);

      context.fillStyle = 'hsl(250 50% 50%/ 100%)';
      context.fillText(liveCount.toLocaleString(), canvasRef.current.width - 45, canvasRef.current.height - 5);
    },
    [controlsRef],
  );

  // unpause
  useEffect(() => {
    if (!controls.paused && isPaused.current) requestAnimationFrame(animateFrame);
  }, [controls.paused, animateFrame]);

  // single step
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    if (isPaused.current) requestAnimationFrame(animateFrame);
  }, [controls.step, animateFrame]);

  // resize
  useEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;

    const resize = ({ width, height }: { width: number; height: number }) => {
      element.width = Math.floor(width * controls.scale);
      element.height = Math.floor(height * controls.scale);
      stateRef.current = null;
    };

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      resize(entry.contentRect);
    });

    observer.observe(element);

    resize(element.getBoundingClientRect());

    return () => observer.unobserve(element);
  }, [controls.scale]);

  // reset
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    stateRef.current = null;
    if (!canvasRef.current) return;
    if (!contextRef.current) return;
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [controls.reset]);

  const spawn = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!canvasRef.current) return;
      if (!stateRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const { width, height } = canvasRef.current;
      const pointToIndex = ({ x, y }: Point): number => (y < 0 ? height + y : y >= height ? height - y : y) * width + (x < 0 ? width + x : x >= width ? width - x : x);
      const point = {
        x: Math.max(0, Math.floor((event.clientX - canvasRect.x) * controlsRef.current.scale - 2)),
        y: Math.max(0, Math.floor((event.clientY - canvasRect.top) * controlsRef.current.scale - 2)),
      };
      for (let x = -2; x <= 2; ++x) for (let y = -2; y <= 2; ++y) if (Math.random() > 0.7) stateRef.current.current[pointToIndex(addPoints(point, { x, y }))] = 1;
    },
    [controlsRef.current.scale],
  );

  // click to spawn
  const handleClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => spawn(event), [spawn]);

  // button and move to spawn
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (event.buttons) spawn(event);
    },
    [spawn],
  );

  return <canvas ref={canvasRef} className='w-full h-full border-4 rounded-2xl border-pink-300 bg-black img-pixel' onMouseMove={handleMouseMove} onClick={handleClick} />;
}
