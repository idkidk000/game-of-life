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

  const animateFrame = useCallback(
    (time: number) => {
      // FIXME: bit jank
      const nextTime = (frameTimes.current.at(-1) ?? 0) + 1000 / 60 / controlsRef.current.speed;
      if (time >= nextTime) {
        frameTimes.current.push(time);

        if (!canvasRef.current) return;

        const context = contextRef.current ?? canvasRef.current.getContext('2d');
        if (!context) return;
        if (context !== contextRef.current) contextRef.current = context;

        // FIXME: store the refs
        const currentImage = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const nextImage = context.createImageData(currentImage.width, currentImage.height - 20);

        const currentPixels = new Uint32Array(currentImage.data.buffer);
        const nextPixels = new Uint32Array(nextImage.data.buffer);

        const pointToIndex = ({ x, y }: Point) => {
          return (
            (y < 0 ? nextImage.height + y : y >= nextImage.height ? nextImage.height - y : y) * nextImage.width +
            (x < 0 ? nextImage.width + x : x >= nextImage.width ? nextImage.width - x : x)
          );
        };

        const getLive = (point: Point) => currentPixels[pointToIndex(point)] > 0;
        // biome-ignore lint/suspicious/noAssignInExpressions: deliberate
        const setLive = (point: Point) => (nextPixels[pointToIndex(point)] = 0xffffffff);

        let liveCount = 0;

        for (let x = 0; x < nextImage.width; ++x) {
          for (let y = 0; y < nextImage.height; ++y) {
            const isLive = getLive({ x, y });
            if (isLive) ++liveCount;
            const neighboursLive = offsets.reduce((acc, item) => acc + (getLive(addPoints({ x, y }, item)) ? 1 : 0), 0);
            if ((isLive && neighboursLive >= 2 && neighboursLive <= 3) || (!isLive && neighboursLive === 3)) setLive({ x, y });
            else if (controlsRef.current.random && Math.random() > 0.999999) {
              for (let ox = -2; ox <= 2; ++ox) for (let oy = -2; oy <= 2; ++oy) if (Math.random() > 0.7) setLive(addPoints({ x, y }, { x: ox, y: oy }));
            }
          }
        }

        // replace canvas pixel data
        context.putImageData(nextImage, 0, 0);

        // labels
        context.fillStyle = 'rgb(0 0 0 / 100%)';
        context.fillRect(0, canvasRef.current.height - 20, canvasRef.current.width, 20);
        context.fillStyle = 'rgb(0 255 0 / 100%)';
        context.fillText(Math.round(time).toLocaleString(), 5, canvasRef.current.height - 5);
        context.fillStyle = 'rgb(255 255 0 / 100%)';
        if (frameTimes.current.size >= 2) {
          const frameRate =
            (1000 /
              frameTimes.current
                .pairs()
                .map(([a, b]) => b - a)
                .reduce((acc, item) => acc + item)) *
            (frameTimes.current.size - 1);
          context.fillText(frameRate.toFixed(1), canvasRef.current.width / 2 - 20, canvasRef.current.height - 5);
        }
        context.fillStyle = 'rgb(255 0 255 / 100%)';
        context.fillText(liveCount.toLocaleString(), canvasRef.current.width - 45, canvasRef.current.height - 5);
      }

      isPaused.current = controlsRef.current.paused;
      if (isPaused.current) frameTimes.current.clear();
      else requestAnimationFrame(animateFrame);
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
    if (!canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [controls.reset]);

  const spawn = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mappedX = Math.max(0, Math.floor((event.clientX - canvasRect.x) * controlsRef.current.scale - 2));
      const mappedY = Math.max(0, Math.floor((event.clientY - canvasRect.top) * controlsRef.current.scale - 2));
      const context = canvasRef.current.getContext('2d');
      if (!context) return;
      const image = context.getImageData(mappedX, mappedY, 5, 5);
      const pixels = new Uint32Array(image.data.buffer);
      for (let i = 0; i < pixels.length; ++i) if (Math.random() > 0.7) pixels[i] = 0xffffffff;
      context.putImageData(image, mappedX, mappedY);
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
