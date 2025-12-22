import { useEffect, useRef } from 'react';
import { Canvas } from '@/components/canvas';
import { useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';
import { SlidingWindow } from '@/lib/sliding-window';

/** this is slower than rendering geometry at native resolution since we have to loop over all screen pixels of the cell */
export function Renderer2dPixel() {
  const { controlsRef } = useControls();
  const { themeDarkRef } = useTheme();
  const { simulationRef, stepTimesRef } = useSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const context = canvasRef.current.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    if (!context) return;
    const abortController = new AbortController();
    const frameTimes = new SlidingWindow<number>(100);
    let imageData = context.createImageData(canvasRef.current.width, canvasRef.current.height);

    const render = (time: number) => {
      if (!canvasRef.current) return;
      frameTimes.push(time);
      if (!controlsRef.current.paused) stepTimesRef.current.push(simulationRef.current.step(controlsRef.current.speed));

      if (imageData.width !== canvasRef.current.width || imageData.height !== canvasRef.current.height)
        imageData = context.createImageData(canvasRef.current.width, canvasRef.current.height);
      else imageData.data.fill(0);

      const pixel = Math.ceil(1 / controlsRef.current.scale);
      for (const [x, y, age, _neighbours] of simulationRef.current.values()) {
        const canvasXStart = Math.round(x / controlsRef.current.scale);
        const canvasYStart = Math.round(y / controlsRef.current.scale);
        const canvasXEnd = canvasXStart + pixel;
        const canvasYEnd = canvasYStart + pixel;
        const value = age > 0 ? 255 : 0;
        for (let cx = canvasXStart; cx <= canvasXEnd; ++cx) {
          for (let cy = canvasYStart; cy <= canvasYEnd; ++cy) {
            const i = (cy * canvasRef.current.width + cx) * 4;
            imageData.data[i] = value;
            imageData.data[i + 1] = value;
            imageData.data[i + 2] = value;
            imageData.data[i + 3] = 255;
          }
        }
      }

      context.putImageData(imageData, 0, 0);

      // generate labels
      const { alive, steps } = simulationRef.current.stats();
      // this is faking accuracy since performance.now() is an integer in the frontend
      const stepTime = stepTimesRef.current.items().reduce((acc, item) => acc + item, 0) / stepTimesRef.current.size;
      const frameRate = (1000 / ((frameTimes.at(-1) ?? 0) - (frameTimes.at(0) ?? 0))) * (frameTimes.size - 1);

      // get label widths
      context.font = '30px monospace';
      context.fillStyle = `hsl(0 0% ${themeDarkRef.current ? '0' : '100'}% / 70%)`;
      const labels = [
        { text: `Step ${steps.toLocaleString()}`, hue: 50 },
        { text: `${stepTime.toFixed(1)} ms`, hue: 150 },
        { text: `${frameRate.toFixed(1)} fps`, hue: 200 },
        { text: `${alive.toLocaleString()} alive`, hue: 250 },
      ].map((item) => {
        const { width } = context.measureText(item.text);
        return { ...item, width };
      });

      // render labels
      const lightness = `${themeDarkRef.current ? '70' : '30'}%`;
      // the magic numbers are 50px line height (font size is 30px) so 10px above and below
      // fillText origin is bottom left
      const maxWidth = labels.reduce((acc, item) => Math.max(acc, item.width), 0);
      const [columns, rows] =
        maxWidth < canvasRef.current.width / 4 ? [4, 1]
        : maxWidth < canvasRef.current.width / 2 ? [2, 2]
        : [1, 4];
      context.fillRect(0, canvasRef.current.height - rows * 50, canvasRef.current.width, rows * 50);
      for (const [l, label] of labels.entries()) {
        context.fillStyle = `hsl(${label.hue} 80% ${lightness})`;
        context.fillText(
          label.text,
          (canvasRef.current.width / columns) * (l % columns) + (canvasRef.current.width / columns - label.width) / 2,
          canvasRef.current.height - (rows - 1) * 50 + Math.floor(l / columns) * 50 - 10
        );
      }

      if (!abortController.signal.aborted) requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    return () => abortController.abort();
  }, []);

  return <Canvas canvasRef={canvasRef} />;
}
