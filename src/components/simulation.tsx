import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { useControls } from '@/hooks/controls';

export function Simulation() {
  const { controls, controlsRef } = useControls();
  const canvas = useRef<HTMLCanvasElement>(null);
  const isPaused = useRef(true);
  const prevTime = useRef(0);

  const animateFrame = useCallback(
    (time: number) => {
      // FIXME: quite jank
      const nextTime = prevTime.current + 1000 / 60 / controlsRef.current.speed;
      if (time >= nextTime) {
        prevTime.current = time;
        if (!canvas.current) return;
        const context = canvas.current.getContext('2d');
        if (!context) return;

        const width = canvas.current.width;
        const height = canvas.current.height;

        // FIXME: store the refs
        /** .data is uint8 array of r, g, b, opacity per pixel */
        const current = context.getImageData(0, 0, width, height);
        /** .data is uint8 array of r, g, b, opacity per pixel */
        const next = context.createImageData(width, height);
        const end = current.data.length - width * 4 * 20;

        const getLive = (pixel: number) => pixel >= 0 && pixel <= end && current.data[pixel] > 0;
        const setLive = (pixel: number) => {
          if (pixel >= 0 && pixel < end) {
            next.data[pixel] = 255;
            next.data[pixel + 1] = 255;
            next.data[pixel + 2] = 255;
            next.data[pixel + 3] = 255;
          }
        };
        const getLiveNeighbours = (pixel: number) => {
          let count = 0;
          if (getLive(pixel - width * 4)) ++count;
          if (getLive(pixel - width * 4 + 4)) ++count;
          if (getLive(pixel + 4)) ++count;
          if (getLive(pixel + width * 4 + 4)) ++count;
          if (getLive(pixel + width * 4)) ++count;
          if (getLive(pixel + width * 4 - 4)) ++count;
          if (getLive(pixel - 4)) ++count;
          if (getLive(pixel - width * 4 - 4)) ++count;
          return count;
        };

        let live = 0;
        let min = Infinity;
        let max = -Infinity;
        for (let pixel = 0; pixel < end; pixel += 4) {
          min = Math.min(current.data[pixel], min);
          max = Math.max(current.data[pixel], max);

          const isLive = getLive(pixel);
          if (isLive) ++live;

          const liveNeighbours = getLiveNeighbours(pixel);

          if ((isLive && liveNeighbours >= 2 && liveNeighbours <= 3) || (!isLive && liveNeighbours === 3)) setLive(pixel);
          else if (controlsRef.current.random && Math.random() > 0.99999) {
            setLive(pixel - width * 4);
            setLive(pixel + width * 4);
            setLive(pixel - 4);
            setLive(pixel + 4);
          }
        }

        // replace canvas pixel data
        context.putImageData(next, 0, 0);

        // labels
        context.fillStyle = 'rgb(0 255 0 / 100%)';
        context.fillText(Math.round(time).toLocaleString(), 5, height - 5);
        context.fillStyle = 'rgb(255 0 255 / 100%)';
        context.fillText(live.toLocaleString(), width - 45, height - 5);
      }

      isPaused.current = controlsRef.current.paused;
      if (!isPaused.current) requestAnimationFrame(animateFrame);
    },
    [controlsRef],
  );

  // unpause
  useEffect(() => {
    if (!controls.paused && isPaused.current) requestAnimationFrame(animateFrame);
  }, [controls.paused, animateFrame]);

  // single step
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    if (isPaused.current) requestAnimationFrame(animateFrame);
  }, [controls.step, animateFrame]);

  // resize
  useEffect(() => {
    // TODO: remove scale from here and do it in `animateFrame`
    if (!canvas.current) return;
    const element = canvas.current;

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
    if (!canvas.current) return;
    const context = canvas.current.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.current.width, canvas.current.height);
  }, [controls.reset]);

  // spawn
  const handleClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!canvas.current) return;
      const canvasRect = canvas.current.getBoundingClientRect();
      const mappedX = Math.max(0, Math.floor((event.clientX - canvasRect.x) * controlsRef.current.scale) - 1);
      const mappedY = Math.max(0, Math.floor((event.clientY - canvasRect.top) * controlsRef.current.scale) - 1);
      console.log(
        { clientX: event.clientX, clientY: event.clientY, pageX: event.pageX, pageY: event.pageY, screenX: event.screenX, screenY: event.screenY, mappedX, mappedY },
        canvasRect,
      );
      const context = canvas.current.getContext('2d');
      if (!context) return;
      const image = context.getImageData(mappedX, mappedY, 3, 3);
      image.data.fill(255);
      context.putImageData(image, mappedX, mappedY);
    },
    [controlsRef.current.scale],
  );

  return <canvas ref={canvas} className='w-full h-full border-4 rounded-2xl border-pink-300' width='300' height='150' onClick={handleClick} />;
}
