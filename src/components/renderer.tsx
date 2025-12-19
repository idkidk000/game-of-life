import { type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Command, useControls } from '@/hooks/controls';
import { type SimRules, Simulation } from '@/lib/simulation';
import { SlidingWindow } from '@/lib/sliding-window';

export function Renderer() {
  const { controls, controlsRef, setControls, commandsRef } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation>(null);
  // single-stepping is done outside of the render loop
  const stepTimes = useRef(new SlidingWindow<number>(100));

  // animation loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!simRef.current)
      simRef.current = new Simulation(
        Math.round(canvasRef.current.width * controlsRef.current.scale),
        Math.round(canvasRef.current.height * controlsRef.current.scale),
        controls.rules,
        {
          ...controls.spawn,
          chance: controls.spawn.enabled ? controls.spawn.chance : 0,
        },
      );
    const context = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;
    const abortController = new AbortController();
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const frameTimes = new SlidingWindow<number>(100);

    const render = (time: number) => {
      if (!simRef.current) return;
      if (!canvasRef.current) return;
      frameTimes.push(time);
      const simWidth = Math.round(canvasRef.current.width * controlsRef.current.scale);
      const simHeight = Math.round(canvasRef.current.height * controlsRef.current.scale);
      if (simRef.current.width !== simWidth || simRef.current.height !== simHeight) simRef.current.updateSize(simWidth, simHeight);
      if (!controlsRef.current.paused) stepTimes.current.push(simRef.current.step(controlsRef.current.speed));

      const { alive, steps } = simRef.current.stats();
      const lightness = `${darkQuery.matches ? '70' : '30'}%`;

      // i would like this to be lower down but biome disagrees
      // this is a much nicer bloom-like effect but it really tanks performance
      /*       const pixel = Math.ceil(1 / controlsRef.current.scale);
      // render sim
      for (let pass = 0; pass < (controlsRef.current.bloom ? 2 : 1); ++pass) {
        context.filter = controlsRef.current.bloom && pass === 0 ? 'blur(4px)' : 'none';
        for (const [x, y, age, neighbours] of simRef.current.values()) {
          const canvasX = Math.round(x / controlsRef.current.scale);
          const canvasY = Math.round(y / controlsRef.current.scale);
          context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness})`;
          context.fillRect(canvasX, canvasY, pixel, pixel);
        }
      } */
      // clear the whole bg
      context.fillStyle = `hsl(0 0% ${darkQuery.matches ? '0' : '100'}%)`;
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (controlsRef.current.bloom) {
        const first = Math.ceil((1 / controlsRef.current.scale) * 3);
        for (const [x, y, age, neighbours] of simRef.current.values()) {
          const canvasX = Math.round((x - 1) / controlsRef.current.scale);
          const canvasY = Math.round((y - 1) / controlsRef.current.scale);
          context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness} / 10%)`;
          context.fillRect(canvasX, canvasY, first, first);
        }
        const second = Math.ceil((1 / controlsRef.current.scale) * 2);
        for (const [x, y, age, neighbours] of simRef.current.values()) {
          const canvasX = Math.round((x - 0.5) / controlsRef.current.scale);
          const canvasY = Math.round((y - 0.5) / controlsRef.current.scale);
          context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness} / 20%)`;
          context.fillRect(canvasX, canvasY, second, second);
        }
      }

      const pixel = Math.ceil(1 / controlsRef.current.scale);
      // render sim
      for (const [x, y, age, neighbours] of simRef.current.values()) {
        const canvasX = Math.round(x / controlsRef.current.scale);
        const canvasY = Math.round(y / controlsRef.current.scale);
        context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness})`;
        context.fillRect(canvasX, canvasY, pixel, pixel);
      }

      // render labels
      context.font = '30px monospace';
      context.fillStyle = `hsl(0 0% ${darkQuery.matches ? '0' : '100'}% / 70%)`;

      // this is faking accuracy since performance.now() is an integer in the frontend
      const stepTime = stepTimes.current.items().reduce((acc, item) => acc + item, 0) / stepTimes.current.size;
      const frameRate = (1000 / ((frameTimes.at(-1) ?? 0) - (frameTimes.at(0) ?? 0))) * (frameTimes.size - 1);

      const labels = [
        { text: `Step ${steps.toLocaleString()}`, hue: 50 },
        { text: `${stepTime.toFixed(1)} ms`, hue: 150 },
        { text: `${frameRate.toFixed(1)} fps`, hue: 200 },
        { text: `${alive.toLocaleString()} alive`, hue: 250 },
      ].map((item) => {
        const { width } = context.measureText(item.text);
        return { ...item, width };
      });

      // if i put any comments above or iniside the if/else block below, biome helpfully breaks my code
      // there are conditions for single row, 2 columns, and single column depending upon max label width
      // the magic numbers are 50px line height (font size is 30px) so 10px above and below
      // fillText origin is bottom left
      const maxWidth = labels.reduce((acc, item) => Math.max(acc, item.width), 0);

      if (maxWidth < canvasRef.current.width / 4) {
        context.fillRect(0, canvasRef.current.height - 50, canvasRef.current.width, 50);
        for (const [l, label] of labels.entries()) {
          context.fillStyle = `hsl(${label.hue} 80% ${lightness})`;
          context.fillText(label.text, (canvasRef.current.width / 4) * l + (canvasRef.current.width / 4 - label.width) / 2, canvasRef.current.height - 10);
        }
      } else if (maxWidth < canvasRef.current.width / 2) {
        context.fillRect(0, canvasRef.current.height - 100, canvasRef.current.width, 100);
        for (const [l, label] of labels.entries()) {
          context.fillStyle = `hsl(${label.hue} 80% ${lightness})`;
          context.fillText(
            label.text,
            (l % 2 === 1 ? canvasRef.current.width / 2 : 0) + (canvasRef.current.width / 2 - label.width) / 2,
            canvasRef.current.height - 50 + Math.floor(l / 2) * 50 - 10,
          );
        }
      } else {
        context.fillRect(0, canvasRef.current.height - 200, canvasRef.current.width, 200);
        for (const [l, label] of labels.entries()) {
          context.fillStyle = `hsl(${label.hue} 80% ${lightness})`;
          context.fillText(label.text, (canvasRef.current.width - label.width) / 2, canvasRef.current.height - 150 + l * 50 - 10);
        }
      }

      if (!abortController.signal.aborted) requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    return () => abortController.abort();
  }, []);

  // resize the canvas to fit the element
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;

    const observer = new ResizeObserver((entries) => {
      const [{ contentRect }] = entries;
      const { width, height } = contentRect;
      element.width = Math.round(width);
      element.height = Math.round(height);
    });

    observer.observe(element);

    return () => observer.unobserve(element);
  }, []);

  // control handlers

  //spawn
  useEffect(() => {
    simRef.current?.updateSpawn({ ...controls.spawn, chance: controls.spawn.enabled ? controls.spawn.chance : 0 });
  }, [controls.spawn]);

  // rules
  useEffect(() => {
    simRef.current?.updateRules(controls.rules as SimRules);
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
      stepTimes.current.push(simRef.current.step(1));
    });
  }, []);

  // canvas event handlers

  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const clientXyToSimXy = useCallback(({ clientX, clientY }: { clientX: number; clientY: number }): [canvasX: number, canvasY: number] => {
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
      simRef.current?.spawn(...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls],
  );

  // right-click to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleRightClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      simRef.current?.erase(...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls],
  );

  // drag to spawn, right-drag to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) return;
      simRef.current?.[event.buttons & 0x1 ? 'spawn' : 'erase'](...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls],
  );

  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick} onContextMenu={handleRightClick} />;
}
