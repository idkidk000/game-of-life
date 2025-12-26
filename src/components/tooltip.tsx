import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

enum ToolTipState {
  Closed,
  Open,
  Dwell,
  Closing,
}

// no observers because these are transient elements
export function ToolTip({
  children,
  dwellMillis = 100,
  closingMillis = 300,
  title,
}: {
  children: ReactNode;
  dwellMillis?: number;
  closingMillis?: number;
  title: string;
}) {
  const targetRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(ToolTipState.Closed);

  useEffect(() => {
    if (!targetRef.current || !popoverRef.current) return;
    const controller = new AbortController();
    let timer: number | null = null;

    function handleMouseEnter() {
      // console.debug('popover enter - open');
      if (stateRef.current === ToolTipState.Closed) {
        if (!targetRef.current || !popoverRef.current) return;
        const rect = targetRef.current.getBoundingClientRect();
        // console.debug('popover updatePosition', rect);
        popoverRef.current.style.top = `${rect.bottom}px`;
        popoverRef.current.style.left = `${rect.left + rect.width}px`;
        popoverRef.current?.showPopover();
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      stateRef.current = ToolTipState.Open;
    }

    function handleMouseLeave(omitPopover: boolean, event: MouseEvent) {
      if (omitPopover && event.target === popoverRef.current) return;
      // console.debug('popover leave - dwell');
      if (stateRef.current !== ToolTipState.Open) return;
      stateRef.current = ToolTipState.Dwell;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // console.debug('popover closing');
        stateRef.current = ToolTipState.Closing;
        if (timer) clearTimeout(timer);
        popoverRef.current?.classList.add('opacity-0', 'scale-95', 'translate-y-4');
        timer = setTimeout(() => {
          // console.debug('popover closed');
          stateRef.current = ToolTipState.Closed;
          popoverRef.current?.classList.remove('opacity-0', 'scale-95', 'translate-y-4');
          popoverRef.current?.hidePopover();
        }, closingMillis);
      }, dwellMillis);
    }

    targetRef.current.addEventListener('mouseenter', handleMouseEnter, { signal: controller.signal });
    targetRef.current.addEventListener('mouseleave', (event) => handleMouseLeave(true, event), { signal: controller.signal });
    popoverRef.current.addEventListener('mouseleave', (event) => handleMouseLeave(false, event), { signal: controller.signal });

    return () => controller.abort();
  }, [dwellMillis, closingMillis]);

  return (
    <>
      <span ref={targetRef} aria-description={title}>
        {children}
      </span>
      {createPortal(
        <div
          popover='manual'
          ref={popoverRef}
          className='p-1 bg-background starting:opacity-0 starting:scale-95 starting:translate-y-4 transition-[opacity,scale,translate] duration-200 ease-in border-3 border-accent/50 text-xs -translate-x-full'
        >
          {title}
        </div>,
        document.body.querySelector('#tooltips') ?? document.body
      )}
    </>
  );
}
