import { type MouseEvent, type RefObject, useCallback, useEffect, useLayoutEffect } from 'react';
import { Command, useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';

export function Canvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const { controlsRef, commandsRef, setControls } = useControls();
  const { simulationRef } = useSimulation();

  // resize the canvas to fit the element
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;

    const observer = new ResizeObserver((entries) => {
      const [{ contentRect }] = entries;
      const { width, height } = contentRect;
      element.width = Math.round(width);
      element.height = Math.round(height);
      const simWidth = Math.round(element.width * controlsRef.current.scale);
      const simHeight = Math.round(element.height * controlsRef.current.scale);
      if (simulationRef.current.width !== simWidth || simulationRef.current.height !== simHeight) simulationRef.current.updateSize(simWidth, simHeight);
    });

    observer.observe(element);

    return () => observer.disconnect();
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
        1
      );
    });
  }, []);

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
      simulationRef.current.spawn(...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls]
  );

  // right-click to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleRightClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      simulationRef.current.erase(...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls]
  );

  // drag to spawn, right-drag to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: controlsRef is a ref you silly goose
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) return;
      simulationRef.current[event.buttons & 0x1 ? 'spawn' : 'erase'](...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls]
  );

  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick} onContextMenu={handleRightClick} />;
}
