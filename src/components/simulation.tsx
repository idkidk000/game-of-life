import { type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useControls } from '@/hooks/controls';
import { GameOfLife } from '@/lib/game-of-life';

const LABELS_HEIGHT = 20;

export function Simulation() {
  const { controls, controlsRef, setControls, commandsRef } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<GameOfLife>(null);
  const schemeRef = useRef({ dark: false, changed: false });
  // single-stepping is done outside of the render loop
  const lastStepDurationRef = useRef(0);

  // need to do a full re-render with new lightness values when scheme changes
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const abortController = new AbortController();

    // biome-ignore lint/suspicious/noAssignInExpressions: biome wraps this over 7 lines if i add braces
    mediaQuery.addEventListener('change', (event) => (schemeRef.current = { dark: event.matches, changed: true }), { signal: abortController.signal });

    if (mediaQuery.matches) schemeRef.current = { changed: true, dark: true };

    return () => abortController.abort();
  }, []);

  // animation loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!simRef.current) simRef.current = new GameOfLife(canvasRef.current.width, canvasRef.current.height - LABELS_HEIGHT);
    const context = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
    const abortController = new AbortController();

    const render = (time: number) => {
      if (!abortController.signal.aborted) requestAnimationFrame(render);
      if (!simRef.current) return;
      if (!context) return;
      if (!canvasRef.current) return;
      if (simRef.current.width !== canvasRef.current.width || simRef.current.height !== canvasRef.current.height - LABELS_HEIGHT)
        // handle canvas resize
        simRef.current.resize(canvasRef.current.width, canvasRef.current.height - LABELS_HEIGHT);
      if (!controlsRef.current.paused)
        // step
        lastStepDurationRef.current = simRef.current.step(controlsRef.current.speed, controlsRef.current.random);

      // render sim
      const { dirty, live } = simRef.current.stats();
      if (schemeRef.current.changed) console.debug('scheme changed', schemeRef.current);
      const lightness = `${schemeRef.current.dark ? '70' : '30'}%`;
      const background = `hsl(0 0% ${schemeRef.current.dark ? '0' : '100'}% / 100%`;
      for (const [x, y, age, neighbours] of schemeRef.current.changed ? simRef.current.values() : simRef.current.deltas()) {
        context.fillStyle = age ? `hsl(${age} ${Math.min(neighbours, 5) * 20}% ${lightness} / 100%)` : background;
        context.fillRect(x, y, 1, 1);
      }
      schemeRef.current.changed = false;

      // render labels
      context.fillStyle = background;
      context.fillRect(0, canvasRef.current.height - LABELS_HEIGHT, canvasRef.current.width, LABELS_HEIGHT);
      context.fillStyle = `hsl(50 50% ${lightness} / 100%)`;
      context.fillText(Math.round(time).toLocaleString(), 5, canvasRef.current.height - 5);

      context.fillStyle = `hsl(150 50% ${lightness} / 100%)`;
      context.fillText(lastStepDurationRef.current.toLocaleString(), canvasRef.current.width / 3 - 20, canvasRef.current.height - 5);

      context.fillStyle = `hsl(200 50% ${lightness} / 100%)`;
      context.fillText(dirty.toLocaleString(), (canvasRef.current.width / 3) * 2 - 20, canvasRef.current.height - 5);

      context.fillStyle = `hsl(250 50% ${lightness} / 100%)`;
      context.fillText(live.toLocaleString(), canvasRef.current.width - 45, canvasRef.current.height - 5);
    };

    requestAnimationFrame(render);

    return () => abortController.abort();
  }, []);

  // needs controls.scale as a dep so the slider works
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;

    const observer = new ResizeObserver((entries) => {
      const [{ contentRect }] = entries;
      const { width, height } = contentRect;
      element.width = Math.floor(width * controls.scale);
      element.height = Math.floor(height * controls.scale);
    });

    observer.observe(element);

    return () => observer.unobserve(element);
  }, [controls.scale]);

  // command handlers

  // clear sim
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe('Clear', () => simRef.current?.clear());
  }, []);

  // fill sim
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe('Fill', () => simRef.current?.fill());
  }, []);

  // save canvas img
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe('Save', () => {
      if (!canvasRef.current) return;
      canvasRef.current.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.download = `game-of-life-${new Date().toISOString()}.png`;
          anchor.href = url;
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        },
        'image/png',
        1,
      );
    });
  }, []);

  // single-step sim
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe('Step', () => {
      if (!simRef.current) return;
      lastStepDurationRef.current = simRef.current.step(1, controlsRef.current.random);
    });
  }, []);

  // canvas event handlers

  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const clientXyToCanvasXy = useCallback(({ clientX, clientY }: { clientX: number; clientY: number }): [canvasX: number, canvasY: number] => {
    if (!canvasRef.current) throw new Error('oh no');
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasX = Math.max(0, Math.floor((clientX - canvasRect.x) * controlsRef.current.scale));
    const canvasY = Math.max(0, Math.floor((clientY - canvasRect.top) * controlsRef.current.scale));
    return [canvasX, canvasY];
  }, []);

  // click to spawn
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      simRef.current?.spawn(...clientXyToCanvasXy(event), controlsRef.current.radius);
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToCanvasXy, setControls],
  );

  // right-click to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleRightClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      simRef.current?.erase(...clientXyToCanvasXy(event), controlsRef.current.radius);
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToCanvasXy, setControls],
  );

  // drag to spawn, right-drag to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) return;
      simRef.current?.[event.buttons & 0x1 ? 'spawn' : 'erase'](...clientXyToCanvasXy(event), controlsRef.current.radius);
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToCanvasXy, setControls],
  );

  return (
    <canvas
      ref={canvasRef}
      className='w-full h-full border-3 rounded-lg border-accent bg-background img-pixel'
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleRightClick}
    />
  );
}
