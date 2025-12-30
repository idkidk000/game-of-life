import { type MouseEvent, type RefObject, type TouchEvent, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Command, useSimControls } from '@/hooks/sim-controls';
import { useSimulation } from '@/hooks/simulation';
import { useTool } from '@/hooks/tools';
import { lerp, pick } from '@/lib/utils';

type DragState = { clientX: number; clientY: number; buttons: number } | null;

export function Canvas({ ref: canvasRef }: { ref: RefObject<HTMLCanvasElement | null> }) {
  const { commandsRef, controls, controlsRef, setControls } = useSimControls();
  const { simulationRef } = useSimulation();
  const { activeToolRef } = useTool();
  const dragRef = useRef<DragState>(null);

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
  const handleClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    simulationRef.current.use(...clientXyToSimXy(event), activeToolRef.current);
  }, [clientXyToSimXy, setControls]);

  // right-click to erase
  // biome-ignore format: stop
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleRightClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    dragRef.current = null;
    simulationRef.current.use(...clientXyToSimXy(event), { id: 'erase' });
  }, [clientXyToSimXy, setControls]);

  // drag to spawn, right-drag to erase
  // biome-ignore format: no
  const handleMouseMove = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    let state = dragRef.current;
    const nextState = pick(event, ['clientX', 'clientY', 'buttons']);
    if (!nextState.buttons || (nextState.buttons & 0x1 && !['erase', 'noise'].includes(activeToolRef.current.id))) {
      dragRef.current = null;
      return;
    }
    if (nextState.clientX === state?.clientX && nextState.clientY === state.clientY && nextState.buttons === state.buttons) return;
    if (state?.buttons !== nextState.buttons) state = dragRef.current = null;
    const tool = nextState.buttons & 0x2 ? { id: 'erase' } as const : activeToolRef.current;
    if (state === null || state.buttons !== nextState.buttons || (state.clientX === nextState.clientX && state.clientY === nextState.clientY))
      simulationRef.current.use(...clientXyToSimXy(nextState), tool);
    else {
      const dist = Math.sqrt((state.clientX - nextState.clientX) ** 2 + (state.clientY - nextState.clientY) ** 2);
      const count = Math.ceil(dist / (controlsRef.current.spawn.radius / 3));
      console.debug({ state, nextState, dist, count });
      for (let i = 1; i <= count; ++i) {
        const interpolated = {
          clientX: lerp(state.clientX, nextState.clientX, count, i),
          clientY: lerp(state.clientY, nextState.clientY, count, i),
        };
        console.debug({ i, ...interpolated });
        simulationRef.current.use(...clientXyToSimXy(interpolated), tool);
      }
    }
    dragRef.current = nextState;
  }, [clientXyToSimXy]);

  // biome-ignore format: no
  const handleTouchMove = useCallback((event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    const state = dragRef.current;
    // Touch doesn't seem to be enumerable with Object.entries
    const nextState = { clientX: touch.clientX, clientY: touch.clientY, buttons: -1 };
    console.debug({ touch, state, nextState });
    if (!['erase', 'noise'].includes(activeToolRef.current.id)) {
      dragRef.current = null;
      return;
    }
    if (nextState.clientX === state?.clientX && nextState.clientY === state?.clientY) return;
    if (state === null || (state.clientX === nextState.clientX && state.clientY === nextState.clientY))
      simulationRef.current.use(...clientXyToSimXy(nextState), activeToolRef.current);
    else {
      const dist = Math.sqrt((state.clientX - nextState.clientX) ** 2 + (state.clientY - nextState.clientY) ** 2);
      const count = Math.ceil(dist / (controlsRef.current.spawn.radius / 3));
      console.debug({ state, nextState, dist, count });
      for (let i = 1; i <= count; ++i) {
        const interpolated = {
          clientX: lerp(state.clientX, nextState.clientX, count, i),
          clientY: lerp(state.clientY, nextState.clientY, count, i),
        };
        console.debug({ i, ...interpolated });
        simulationRef.current.use(...clientXyToSimXy(interpolated), activeToolRef.current);
      }
    }
    dragRef.current = nextState;
  }, [clientXyToSimXy]);

  // biome-ignore format: no
  const handleTouchEnd = useCallback(() => { dragRef.current = null; }, []);

  // save canvas img. for webgl, { preserveDrawingBuffer: true } must be specified in getContext() call
  // biome-ignore format: no
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => commandsRef.current.subscribe(Command.Save, () => {
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
  }), []);

  // overflow hidden is for chromium jank. the canvas cannot and does not overflow.
  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      className='overflow-hidden'
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}
