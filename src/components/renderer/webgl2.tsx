import { useEffect } from 'react';
import Two from 'two.js';
import { useCanvas } from '@/hooks/canvas';
import { useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';

export function RendererWebGl2() {
  const { controlsRef } = useControls();
  const { canvasRef } = useCanvas();
  const { simulationRef, stepTimesRef } = useSimulation();
  const { darkRef } = useTheme();

  // animation loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const two = new Two({ type: 'WebGLRenderer', domElement: canvasRef.current, autostart: true });

    two.bind('update', () => {
      if (!canvasRef.current) return;
      if (!two) return;

      const simWidth = Math.round(canvasRef.current.width * controlsRef.current.scale);
      const simHeight = Math.round(canvasRef.current.height * controlsRef.current.scale);
      if (simulationRef.current.width !== simWidth || simulationRef.current.height !== simHeight) simulationRef.current.updateSize(simWidth, simHeight);

      if (!controlsRef.current.paused) stepTimesRef.current.push(simulationRef.current.step(controlsRef.current.speed));

      const lightness = `${darkRef.current ? '70' : '30'}%`;
      const background = `hsl(0 0% ${darkRef.current ? '0' : '100'}% / 70%)`;

      two.clear();
      const bg = two.makeRectangle(0, 0, canvasRef.current.width, canvasRef.current.height);
      bg.fill = background;

      const pixel = Math.ceil(1 / controlsRef.current.scale);
      for (const [x, y, age, neighbours] of simulationRef.current.values()) {
        const canvasX = Math.round(x / controlsRef.current.scale);
        const canvasY = Math.round(y / controlsRef.current.scale);
        const rect = two.makeRectangle(canvasX, canvasY, pixel, pixel);
        rect.fill = `hsl(${age} ${Math.min(neighbours, 3) * 33}% ${lightness})`;
      }
    });
    return () => two.release();
  }, []);

  return null;
}
