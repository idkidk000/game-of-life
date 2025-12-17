import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { useControls } from '@/hooks/controls';
import { GameOfLife } from '@/lib/game-of-life';

export function Simulation() {
  const { controls, controlsRef } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<GameOfLife>(null);
  const dragRef = useRef<[x: number, y: number]>(null);

  // animation loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!simRef.current) simRef.current = new GameOfLife(canvasRef.current.width, canvasRef.current.height - 20);
    const context = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
    let requestKey = 0;
    let lastStepDuration = 0;

    const render = (time: number) => {
      requestKey = requestAnimationFrame(render);
      if (!simRef.current) return;
      if (!context) return;
      if (!canvasRef.current) return;
      if (simRef.current.width !== canvasRef.current.width || simRef.current.height !== canvasRef.current.height - 20)
        // handle canvas resize
        simRef.current.resize(canvasRef.current.width, canvasRef.current.height - 20);
      if (!controlsRef.current.paused)
        // step
        lastStepDuration = simRef.current.step(controlsRef.current.speed, controlsRef.current.random);

      // render sim
      const { dirty, live } = simRef.current.stats();
      for (const [x, y, value] of simRef.current.deltas()) {
        context.fillStyle = value ? `hsl(${value} 50% 50% / 100%)` : 'hsl(0 0% 0% / 100%)';
        context.fillRect(x, y, 1, 1);
      }

      // render labels
      context.clearRect(0, canvasRef.current.height - 20, canvasRef.current.width, 20);
      context.fillStyle = 'hsl(50 50% 50%/ 100%)';
      context.fillText(Math.round(time).toLocaleString(), 5, canvasRef.current.height - 5);

      context.fillStyle = 'hsl(150 50% 50%/ 100%)';
      context.fillText(lastStepDuration.toLocaleString(), canvasRef.current.width / 3 - 20, canvasRef.current.height - 5);

      context.fillStyle = 'hsl(200 50% 50%/ 100%)';
      context.fillText(dirty.toLocaleString(), (canvasRef.current.width / 3) * 2 - 20, canvasRef.current.height - 5);

      context.fillStyle = 'hsl(250 50% 50%/ 100%)';
      context.fillText(live.toLocaleString(), canvasRef.current.width - 45, canvasRef.current.height - 5);
    };

    requestKey = requestAnimationFrame(render);

    return () => cancelAnimationFrame(requestKey);
  }, []);

  // single step
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    simRef.current?.step(1, controlsRef.current.random);
  }, [controls.step]);

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
    simRef.current?.clear();
  }, [controls.reset]);

  // fill
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    simRef.current?.fill();
  }, [controls.fill]);

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
      const [x, y] = clientXyToCanvasXy(event);
      simRef.current?.spawn([x, y], [x, y], controlsRef.current.radius);
    },
    [clientXyToCanvasXy],
  );

  // drag to spawn
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) dragRef.current = null;
      else {
        const [x, y] = clientXyToCanvasXy(event);
        if (dragRef.current) simRef.current?.spawn(dragRef.current, [x, y], controlsRef.current.radius);
        else simRef.current?.spawn([x, y], [x, y], controlsRef.current.radius);
        dragRef.current = [x, y];
      }
    },
    [clientXyToCanvasXy],
  );

  return <canvas ref={canvasRef} className='w-full h-full border-3 rounded-2xl border-accent bg-black img-pixel' onMouseMove={handleMouseMove} onClick={handleClick} />;
}
