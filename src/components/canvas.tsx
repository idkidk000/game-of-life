import { type MouseEvent, type RefObject, useCallback, useLayoutEffect } from 'react';
import { useControls } from '@/hooks/controls';
import { useSimObject } from '@/hooks/sim-object';
import { useSimulation } from '@/hooks/simulation';

export function Canvas({ ref: canvasRef }: { ref: RefObject<HTMLCanvasElement | null> }) {
  const { controls, controlsRef, setControls } = useControls();
  const { simulationRef } = useSimulation();
  const { activeSimObjectRef } = useSimObject();

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (activeSimObjectRef.current) simulationRef.current.add(...clientXyToSimXy(event), activeSimObjectRef.current);
      else simulationRef.current.spawn(...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls]
  );

  // right-click to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleRightClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      simulationRef.current.erase(...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls]
  );

  // drag to spawn, right-drag to erase
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!event.buttons) return;
      // disable drag to span when a sim object is active
      if (event.buttons & 0x1 && activeSimObjectRef.current) return;
      simulationRef.current[event.buttons & 0x1 ? 'spawn' : 'erase'](...clientXyToSimXy(event));
      if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
    },
    [clientXyToSimXy, setControls]
  );

  // overflow hidden is for chromium jank. the canvas cannot and does not overflow.
  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick} onContextMenu={handleRightClick} className='overflow-hidden' />;
}
