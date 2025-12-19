import { type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Command, useControls } from '@/hooks/controls';
import { GameOfLife, type GameRules } from '@/lib/game-of-life';

const LABELS_HEIGHT = 20;

export function Simulation() {
  const { controls, controlsRef, setControls, commandsRef } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<GameOfLife>(null);
  // single-stepping is done outside of the render loop
  const lastStepDurationRef = useRef(0);

  // animation loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!simRef.current)
      simRef.current = new GameOfLife(canvasRef.current.width, canvasRef.current.height - LABELS_HEIGHT, controls.rules, {
        ...controls.spawn,
        chance: controls.spawn.enabled ? controls.spawn.chance : 0,
      });
    const context = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;
    const abortController = new AbortController();
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const render = (_time: number) => {
      if (!simRef.current) return;
      if (!canvasRef.current) return;
      if (simRef.current.width !== canvasRef.current.width || simRef.current.height !== canvasRef.current.height - LABELS_HEIGHT)
        // handle canvas resize
        simRef.current.updateSize(canvasRef.current.width, canvasRef.current.height - LABELS_HEIGHT);
      if (!controlsRef.current.paused)
        // step
        lastStepDurationRef.current = simRef.current.step(controlsRef.current.speed);

      const { live, steps } = simRef.current.stats();
      const lightness = `${darkQuery.matches ? '70' : '30'}%`;
      const background = `hsl(0 0% ${darkQuery.matches ? '0' : '100'}% / 100%`;

      // clear the whole bg
      context.fillStyle = background;
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // render sim
      for (const [x, y, age, neighbours] of simRef.current.values()) {
        context.fillStyle = age ? `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness} / 100%)` : background;
        context.fillRect(x, y, 1, 1);
      }

      // render labels
      context.fillStyle = `hsl(50 50% ${lightness} / 100%)`;
      context.fillText(steps.toLocaleString(), 5, canvasRef.current.height - 5);

      context.fillStyle = `hsl(150 50% ${lightness} / 100%)`;
      context.fillText(lastStepDurationRef.current.toFixed(3), canvasRef.current.width / 3 - 20, canvasRef.current.height - 5);

      // context.fillStyle = `hsl(200 50% ${lightness} / 100%)`;
      // context.fillText(dirty.toLocaleString(), (canvasRef.current.width / 3) * 2 - 20, canvasRef.current.height - 5);

      context.fillStyle = `hsl(250 50% ${lightness} / 100%)`;
      context.fillText(live.toLocaleString(), canvasRef.current.width - 45, canvasRef.current.height - 5);

      if (!abortController.signal.aborted) requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    return () => abortController.abort();
  }, []);

  // resize the canvas to fit the element
  // needs controls.scale as a dep so the slider works
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;

    const observer = new ResizeObserver((entries) => {
      const [{ contentRect }] = entries;
      const { width, height } = contentRect;
      element.width = Math.round(width * controls.scale);
      element.height = Math.round(height * controls.scale);
    });

    observer.observe(element);

    return () => observer.unobserve(element);
  }, [controls.scale]);

  // control handlers

  //spawn
  useEffect(() => {
    simRef.current?.updateSpawn({ ...controls.spawn, chance: controls.spawn.enabled ? controls.spawn.chance : 0 });
  }, [controls.spawn]);

  // rules
  useEffect(() => {
    simRef.current?.updateRules(controls.rules as GameRules);
  }, [controls.rules]);

  // command handlers

  // clear sim
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe(Command.Clear, () => simRef.current?.clear());
  }, []);

  // fill sim
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe(Command.Fill, () => simRef.current?.fill());
  }, []);

  // save canvas img
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    return commandsRef.current.subscribe(Command.Save, () => {
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
    return commandsRef.current.subscribe(Command.Step, () => {
      if (!simRef.current) return;
      lastStepDurationRef.current = simRef.current.step(1);
    });
  }, []);

  // canvas event handlers

  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const clientXyToCanvasXy = useCallback(({ clientX, clientY }: { clientX: number; clientY: number }): [canvasX: number, canvasY: number] => {
    if (!canvasRef.current) throw new Error('oh no');
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasX = Math.max(0, Math.round((clientX - canvasRect.x) * controlsRef.current.scale));
    const canvasY = Math.max(0, Math.round((clientY - canvasRect.top) * controlsRef.current.scale));
    return [canvasX, canvasY];
  }, []);

  // click to spawn
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      simRef.current?.spawn(...clientXyToCanvasXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToCanvasXy, setControls],
  );

  // right-click to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleRightClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      simRef.current?.erase(...clientXyToCanvasXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToCanvasXy, setControls],
  );

  // drag to spawn, right-drag to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) return;
      simRef.current?.[event.buttons & 0x1 ? 'spawn' : 'erase'](...clientXyToCanvasXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToCanvasXy, setControls],
  );

  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick} onContextMenu={handleRightClick} />;
}
