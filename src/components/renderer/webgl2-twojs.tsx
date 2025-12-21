import { useEffect, useRef } from 'react';
import Two from 'two.js';
import { Canvas } from '@/components/canvas';
import { useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';

/** very slow. two.js is best at handling retained objects which are created on init. i'm rebuilding the entire scene every frame. it can't do instanced rendering so this won't work */
export function RendererTwoJs() {
  const { controlsRef } = useControls();
  const { darkRef } = useTheme();
  const { simulationRef, stepTimesRef } = useSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const two = new Two({
      type: 'WebGLRenderer',
      domElement: canvasRef.current,
      autostart: true,
      // width: canvasRef.current.width,
      // height: canvasRef.current.height,
    });

    two.bind('update', () => {
      if (!canvasRef.current) return;

      // twojs i am begging you to stop
      // canvasRef.current.style.width = 'unset';
      // canvasRef.current.style.height = 'unset';

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
    // this breaks twojs
    // return () => two.release();
  }, []);

  return <Canvas canvasRef={canvasRef} />;
}
