import { createContext, type ReactElement, type ReactNode, type RefObject, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface ToolTipSettings {
  closeMillis: number | null;
  closingMillis: number;
  dwellMillis: number;
}

const defaultToolTipSettings: ToolTipSettings = {
  closeMillis: 5_000,
  closingMillis: 300,
  dwellMillis: 100,
};

enum ToolTipState {
  Closed,
  Open,
  Dwell,
  Closing,
}

interface Context {
  settingsRef: RefObject<ToolTipSettings>;
}

const Context = createContext<Context | null>(null);

function mergeSettings(closeMillis: number | undefined, closingMillis: number | undefined, dwellMillis: number | undefined): ToolTipSettings {
  return {
    closeMillis: typeof closeMillis !== 'undefined' ? closeMillis : defaultToolTipSettings.closeMillis,
    closingMillis: closingMillis ?? defaultToolTipSettings.closingMillis,
    dwellMillis: dwellMillis ?? defaultToolTipSettings.dwellMillis,
  };
}

/** optional settings provider. `ToolTip` will otherwise use default settings */
// biome-ignore format: stop
export function ToolTipProvider(
  { children, closeMillis, closingMillis, dwellMillis }:
  { children: ReactNode; closeMillis?: number; closingMillis?: number; dwellMillis?: number }
) {
  const settingsRef = useRef<ToolTipSettings>(mergeSettings(closeMillis,closingMillis,dwellMillis));

  useEffect(() => {
    settingsRef.current = mergeSettings(closeMillis, closingMillis, dwellMillis);
  }, [closeMillis, closingMillis, dwellMillis]);

  const value: Context = useMemo(() => ({ settingsRef }), []);

  return <Context value={value}>{children}</Context>;
}

// includes fallback
function useToolTip(): Context {
  const context = useContext(Context);
  const settingsRef = useRef(defaultToolTipSettings);
  const value: Context = useMemo(() => ({ settingsRef }), []);
  if (context) return context;
  return value;
}

export function ToolTip({ children, title }: { children: ReactElement; title: string }) {
  const popoverRef = useRef<HTMLParagraphElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [closing, setClosing] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const stateRef = useRef(ToolTipState.Closed);
  const { settingsRef } = useToolTip();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    if (!popoverRef.current) return;
    if (!trigger) return;
    trigger.ariaDescription = title;
    const controller = new AbortController();

    // TODO: replace with css when anchor positioning is baseline
    const updatePosition = () => {
      if (stateRef.current === ToolTipState.Closed) return;
      // throttle since the 'scroll' event fires a LOT.
      requestAnimationFrame(() => {
        if (!popoverRef.current) return;
        const rect = trigger.getBoundingClientRect();
        popoverRef.current.style.top = `${rect.bottom}px`;
        // center with `-translate-x-1/2`
        popoverRef.current.style.left = `${rect.left + rect.width / 2}px`;
      });
    };

    const beginClose = () => {
      if (stateRef.current === ToolTipState.Closed) return;
      stateRef.current = ToolTipState.Closing;
      setClosing(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        stateRef.current = ToolTipState.Closed;
        setClosing(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        popoverRef.current?.hidePopover();
      }, settingsRef.current.closingMillis);
    };

    // biome-ignore format: no
    trigger.addEventListener('mouseenter', () => {
      stateRef.current = ToolTipState.Open;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (settingsRef.current.closeMillis) timerRef.current = setTimeout(beginClose, settingsRef.current.closeMillis);
      updatePosition()
      setClosing(false);
      popoverRef.current?.showPopover();
    }, { signal: controller.signal });

    // biome-ignore format: no
    trigger.addEventListener('mouseleave', () => {
      stateRef.current = ToolTipState.Dwell;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(beginClose, settingsRef.current.dwellMillis);
    }, { signal: controller.signal });

    // find the closest scrollable ancestor and
    // - attach `updatePosition` to ancestor scroll
    // - attach `beginClose` to `trigger` and `popover` intersections with ancestor where !visible
    // both `updatePosition` and `beginClose` guard against being called in invalid states
    let ancestor: HTMLElement | null = trigger;
    while (ancestor !== null) {
      if (ancestor === document.body || getComputedStyle(ancestor).overflow !== 'visible') {
        ancestor.addEventListener('scroll', updatePosition, { signal: controller.signal });
        // biome-ignore format: no
        const intersectionObserver = new IntersectionObserver((entries) => {
          if (entries.some((entry)=>!entry.isIntersecting)) beginClose()
        }, { root: ancestor });
        intersectionObserver.observe(trigger);
        intersectionObserver.observe(popoverRef.current);
        controller.signal.addEventListener('abort', () => intersectionObserver.disconnect());
        break;
      }
      ancestor = ancestor.parentElement;
    }

    // update position on document resize
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(document.documentElement);
    controller.signal.addEventListener('abort', () => resizeObserver.disconnect());

    return () => controller.abort();
  }, [title, trigger]);

  // update target on load and when the dom mutates. forces a re-run of the main useEffect
  // a more react-y way of doing this without wrapping the return value in another element, requiring that a ref be provided, using functions as children, etc would be nice
  useLayoutEffect(() => {
    if (!popoverRef.current) return;
    let prevTarget: HTMLElement | null = null;
    const updateTrigger = () => {
      if (!popoverRef.current) return;
      const nextTarget = popoverRef.current.previousElementSibling as HTMLElement;
      // guard against dom mutations which don't affect target, i.e. from siblings, since we're not enclosed in our own element
      if (prevTarget === nextTarget) return;
      setTrigger(nextTarget);
      prevTarget = nextTarget;
    };
    const observer = new MutationObserver(updateTrigger);
    const parent = popoverRef.current.parentNode;
    if (!parent) return;
    observer.observe(parent, { childList: true, subtree: false });
    updateTrigger();
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {children}
      <p
        popover='manual'
        ref={popoverRef}
        className={`p-1 bg-background starting:opacity-0 starting:scale-95 starting:translate-y-4 transition-[opacity,scale,translate] duration-200 ease-in border-3 border-accent/50 text-xs -translate-x-1/2 text-right w-max ${closing ? 'opacity-0 scale-95 translate-y-4' : ''}`}
      >
        {title}
      </p>
    </>
  );
}
