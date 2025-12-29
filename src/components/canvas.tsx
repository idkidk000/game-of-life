import { type MouseEvent, type RefObject, useCallback, useEffect, useLayoutEffect } from 'react';
import { Command, useSimControls } from '@/hooks/sim-controls';
import { useSimulation } from '@/hooks/simulation';
import { useTool } from '@/hooks/tools';

export function Canvas({ ref: canvasRef }: { ref: RefObject<HTMLCanvasElement | null> }) {
  const { commandsRef, controls, controlsRef, setControls } = useSimControls();
  const { simulationRef } = useSimulation();
  const { activeToolRef } = useTool();

  // adjust canvas resolution to fit the element
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;

    const observer = new ResizeObserver((entries) => {
      const [{ contentRect }] = entries;
      const { width, height } = contentRect;
      element.width = Math.round(width);
      element.height = Math.round(height);
      const simWidth = Math.round(element.width * controls.scale);
      const simHeight = Math.round(element.height * controls.scale);
      if (simulationRef.current.width !== simWidth || simulationRef.current.height !== simHeight) simulationRef.current.updateSize(simWidth, simHeight);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [controls.scale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const clientXyToSimXy = useCallback(({ clientX, clientY }: { clientX: number; clientY: number }): [canvasX: number, canvasY: number] => {
    if (!canvasRef.current) throw new Error('oh no');
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasX = Math.max(0, Math.round((clientX - canvasRect.x) * controlsRef.current.scale));
    const canvasY = Math.max(0, Math.round((clientY - canvasRect.top) * controlsRef.current.scale));
    return [canvasX, canvasY];
  }, []);

  // click to spawn
  // biome-ignore format: no
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClick = useCallback((event: MouseEvent<HTMLCanvasElement>) =>
    simulationRef.current.use(...clientXyToSimXy(event), activeToolRef.current),
  [clientXyToSimXy, setControls]);

  // right-click to erase
  // biome-ignore format: stop
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleRightClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    simulationRef.current.use(...clientXyToSimXy(event), { id: 'erase' });
  }, [clientXyToSimXy, setControls]);

  // drag to spawn, right-drag to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) return;
      if (event.buttons & 0x1 && !['erase', 'noise'].includes(activeToolRef.current.id)) return;
      simulationRef.current.use(...clientXyToSimXy(event), event.buttons & 0x2 ? { id: 'erase' } : activeToolRef.current);
    },
    [clientXyToSimXy, setControls]
  );

  // save canvas img. for webgl, { preserveDrawingBuffer: true } must be specified in getContext() call
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

  // overflow hidden is for chromium jank. the canvas cannot and does not overflow.
  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick} onContextMenu={handleRightClick} className='overflow-hidden ' />;
}
