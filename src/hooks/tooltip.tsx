import { createContext, type ReactElement, type ReactNode, type RefObject, useContext, useEffect, useMemo, useRef } from 'react';

interface Context {
  register: (triggerElement: HTMLSpanElement, title: string) => void;
  unregister: (triggerElement: HTMLSpanElement) => void;
}

const Context = createContext<Context | null>(null);

enum ToolTipState {
  Closed,
  Open,
  Dwell,
  Closing,
}

// this seems better than having a fully constructed dom element for every possible tooltip just sitting there
class ToolTipController {
  #map = new Map<HTMLSpanElement, AbortController>();
  constructor(
    public rootRef: RefObject<HTMLDivElement | null>,
    public dwellMillis: number,
    public closingMillis: number
  ) {}
  register(triggerElement: HTMLSpanElement, title: string) {
    if (this.#map.has(triggerElement)) return;
    const controller = new AbortController();
    let popoverElement: HTMLDivElement | null = null;
    let state: ToolTipState = ToolTipState.Closed;
    let timer: number | null = null;

    // biome-ignore format: no
    triggerElement.addEventListener('mouseenter', () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (state !== ToolTipState.Open) {
        // console.debug('popover enter - open');
        if (!popoverElement) {
          popoverElement = document.createElement('div');
          popoverElement.setAttribute('popover', 'manual');
          popoverElement.className =
            'p-1 bg-background starting:opacity-0 starting:scale-95 starting:translate-y-4 transition-[opacity,scale,translate] duration-200 ease-in border-3 border-accent/50 text-xs -translate-x-full';
          popoverElement.innerText = title;
          this.rootRef.current?.appendChild(popoverElement);
        }
        const rect = triggerElement.getBoundingClientRect();
        // console.debug('popover updatePosition', rect);
        popoverElement.style.top = `${rect.bottom}px`;
        popoverElement.style.left = `${rect.left + rect.width}px`;
        popoverElement.showPopover();
      }
      state = ToolTipState.Open;
    }, { signal: controller.signal });

    // biome-ignore format: no
    triggerElement.addEventListener('mouseleave', () => {
      // console.debug('popover leave - dwell');
      if (state !== ToolTipState.Open) return;
      state = ToolTipState.Dwell;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // console.debug('popover closing');
        state = ToolTipState.Closing;
        if (timer) clearTimeout(timer);
        popoverElement?.classList.add('opacity-0', 'scale-95', 'translate-y-4');
        timer = setTimeout(() => {
          // console.debug('popover closed');
          state = ToolTipState.Closed;
          popoverElement?.remove();
          popoverElement = null;
        }, this.closingMillis);
      }, this.dwellMillis);
    }, { signal: controller.signal });

    controller.signal.addEventListener('abort', () => popoverElement?.remove());
    this.#map.set(triggerElement, controller);
  }
  unregister(triggerElement: HTMLSpanElement) {
    this.#map.get(triggerElement)?.abort();
    this.#map.delete(triggerElement);
  }
}

export function ToolTipProvider({ children, dwellMillis = 100, closingMillis = 300 }: { children: ReactNode; dwellMillis?: number; closingMillis?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef(new ToolTipController(rootRef, dwellMillis, closingMillis));

  useEffect(() => {
    controllerRef.current.dwellMillis = dwellMillis;
    controllerRef.current.closingMillis = closingMillis;
  }, [dwellMillis, closingMillis]);

  // biome-ignore format: no
  const value: Context = useMemo(() => ({
    register(triggerElement, title) {
      controllerRef.current.register(triggerElement, title);
    },
    unregister(triggerElement) {
      controllerRef.current.unregister(triggerElement);
    },
  }), []);

  return (
    <Context value={value}>
      {children}
      <div ref={rootRef} />
    </Context>
  );
}

function useToolTip() {
  const context = useContext(Context);
  if (context === null) throw new Error('useToolTip must be used underneath a ToolTipProvider');
  return context;
}

export function ToolTip({ children, title }: { children: ReactElement; title: string }) {
  const { register, unregister } = useToolTip();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const triggerElement = ref.current;
    if (!triggerElement) return;
    register(triggerElement, title);
    return () => unregister(triggerElement);
  }, [register, unregister, title]);

  return (
    <span ref={ref} aria-description={title}>
      {children}
    </span>
  );
}
