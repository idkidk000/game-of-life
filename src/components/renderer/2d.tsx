import { useEffect, useRef } from 'react';
import { Canvas } from '@/components/canvas';
import { Command, useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';
import { SlidingWindow } from '@/lib/sliding-window';

export function Renderer2d() {
  const { commandsRef, controlsRef } = useControls();
  const { themeDarkRef } = useTheme();
  const { simulationRef, stepTimesRef } = useSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const context = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return;
    const controller = new AbortController();
    const frameTimes = new SlidingWindow<number>(100);

    const render = (time: number) => {
      if (!canvasRef.current) return;
      frameTimes.push(time);

      if (!controlsRef.current.paused) stepTimesRef.current.push(simulationRef.current.step(controlsRef.current.speed));

      const lightness = `${themeDarkRef.current ? '70' : '30'}%`;

      // clear the whole bg
      context.fillStyle = `hsl(0 0% ${themeDarkRef.current ? '0' : '100'}%)`;
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // janky fake bloom until i learn how to use a webgl2 canvas
      if (controlsRef.current.bloom) {
        const first = Math.ceil((1 / controlsRef.current.scale) * 3);
        for (const [x, y, age, neighbours] of simulationRef.current.values()) {
          const canvasX = Math.round((x - 1) / controlsRef.current.scale);
          const canvasY = Math.round((y - 1) / controlsRef.current.scale);
          context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness} / 10%)`;
          context.fillRect(canvasX, canvasY, first, first);
        }
        const second = Math.ceil((1 / controlsRef.current.scale) * 2);
        for (const [x, y, age, neighbours] of simulationRef.current.values()) {
          const canvasX = Math.round((x - 0.5) / controlsRef.current.scale);
          const canvasY = Math.round((y - 0.5) / controlsRef.current.scale);
          context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness} / 20%)`;
          context.fillRect(canvasX, canvasY, second, second);
        }
      }

      // render sim
      const pixel = Math.ceil(1 / controlsRef.current.scale);
      for (const [x, y, age, neighbours] of simulationRef.current.values()) {
        const canvasX = Math.round(x / controlsRef.current.scale);
        const canvasY = Math.round(y / controlsRef.current.scale);
        context.fillStyle = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness})`;
        context.fillRect(canvasX, canvasY, pixel, pixel);
      }

      // generate labels
      // this is faking accuracy since performance.now() is an integer in the frontend
      const stepTime = stepTimesRef.current.items().reduce((acc, item) => acc + item, 0) / stepTimesRef.current.size;
      const frameRate = (1000 / ((frameTimes.at(-1) ?? 0) - (frameTimes.at(0) ?? 0))) * (frameTimes.size - 1);

      // get label widths
      context.font = '40px "Jersey 10", sans-serif';
      context.fillStyle = `hsl(0 0% ${themeDarkRef.current ? '0' : '100'}% / 70%)`;
      const labels = [
        { text: `Step ${simulationRef.current.steps.toLocaleString()}`, hue: 50 },
        { text: `${Number.isNaN(stepTime) ? '- ' : stepTime.toFixed(1)} ms`, hue: 150 },
        { text: `${frameRate.toFixed(1)} fps`, hue: 200 },
        { text: `${simulationRef.current.alive.toLocaleString()} alive`, hue: 250 },
      ].map((item) => {
        const { width } = context.measureText(item.text);
        return { ...item, width };
      });

      // render labels
      // the magic numbers are 50px line height (font size is 30px) so 10px above and below
      // fillText origin is bottom left
      const maxWidth = labels.reduce((acc, item) => Math.max(acc, item.width), 0);
      const [columns, rows] = maxWidth < canvasRef.current.width / 4 ? [4, 1] : maxWidth < canvasRef.current.width / 2 ? [2, 2] : [1, 4];
      context.fillRect(0, canvasRef.current.height - rows * 50, canvasRef.current.width, rows * 50);
      for (const [l, label] of labels.entries()) {
        context.fillStyle = `hsl(${label.hue} 80% ${lightness})`;
        context.fillText(
          label.text,
          (canvasRef.current.width / columns) * (l % columns) + (canvasRef.current.width / columns - label.width) / 2,
          canvasRef.current.height - (rows - 1) * 50 + Math.floor(l / columns) * 50 - 10
        );
      }

      if (!controller.signal.aborted) requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    return () => controller.abort();
  }, []);

  // save canvas img
  // biome-ignore lint/correctness/useExhaustiveDependencies format: ref object and you're bad at formatting
  useEffect(() =>
      commandsRef.current.subscribe(Command.Save, () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.download = `game-of-life-${new Date().toISOString()}.png`;
          anchor.href = url;
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        }, 'image/png', 1);
      }),
    []);

  return <Canvas ref={canvasRef} />;
}
