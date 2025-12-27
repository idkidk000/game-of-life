import type { ReactElement, ReactNode } from 'react';
import { createContext, type RefObject, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

enum MenuState {
  Closed,
  Open,
  Closing,
}

interface Context {
  state: MenuState;
  triggerRef: RefObject<HTMLSpanElement | null>;
  menuRef: RefObject<HTMLMenuElement | null>;
  stateRef: RefObject<MenuState>;
  setClosed: () => void;
  setOpen: () => void;
  toggleOpen: () => void;
}

const Context = createContext<Context | null>(null);

/** context provider.\
 * requires `MenuTrigger` and `MenuContent` children.
 *
 * wrap `MenuClose` around relevant elements and/or use `setOpen`, `setClosed`, and `toggleOpen` methods exposed through the `useMenu` hook */
export function Menu({ children, closingMillis = 300 }: { children: ReactNode; closingMillis?: number }) {
  const [state, setState] = useState<MenuState>(MenuState.Closed);
  const menuRef = useRef<HTMLMenuElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    // toggle open attrib for styling
    triggerRef.current?.toggleAttribute('open', state === MenuState.Open);
  }, [state]);

  const setClosed = useCallback(() => {
    if (stateRef.current === MenuState.Open) {
      setState(MenuState.Closing);
      setTimeout(() => setState(MenuState.Closed), closingMillis);
    }
  }, [closingMillis]);

  const setOpen = useCallback(() => {
    if (stateRef.current === MenuState.Closed) setState(MenuState.Open);
  }, []);

  const toggleOpen = useCallback(() => {
    if (stateRef.current === MenuState.Open) {
      setState(MenuState.Closing);
      setTimeout(() => setState(MenuState.Closed), closingMillis);
    } else if (stateRef.current === MenuState.Closed) setState(MenuState.Open);
  }, [closingMillis]);

  // biome-ignore format: do not
  const value: Context = useMemo(() => ({
    triggerRef,
    state,
    stateRef,
    menuRef,
    setClosed,
    setOpen,
    toggleOpen
  }), [state, setClosed, setOpen, toggleOpen]);

  return <Context value={value}>{children}</Context>;
}

export function useMenu() {
  const context = useContext(Context);
  if (context === null) throw new Error('useMenu must be used underneath a Menu component');
  return context;
}

export function MenuTrigger({ children }: { children: ReactElement }) {
  const { toggleOpen, triggerRef } = useMenu();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    const controller = new AbortController();
    triggerRef.current?.addEventListener('click', toggleOpen, { signal: controller.signal });
    return () => controller.abort();
  }, [toggleOpen]);

  return <span ref={triggerRef}>{children}</span>;
}

export function MenuClose({ children }: { children: ReactElement }) {
  const { setClosed } = useMenu();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const controller = new AbortController();
    ref.current.addEventListener('click', setClosed, { signal: controller.signal });
    return () => controller.abort();
  }, [setClosed]);

  return <span ref={ref}>{children}</span>;
}

// closing styling on popovers is still jank in firefox
export function MenuContent({
  children,
  className = 'starting:opacity-0 starting:scale-95 starting:-translate-y-[25dvh] origin-center duration-200 ease-in transition-[opacity,scale,translate] mx-4 mb-4 overflow-y-auto',
  classNameClosing = 'scale-95 opacity-0 translate-y-[25dvh]',
  width = 'full',
}: {
  children: ReactElement;
  className?: string;
  classNameClosing?: string;
  width?: 'full' | 'auto';
}) {
  const { state, menuRef, triggerRef, setClosed } = useMenu();
  const ref = useRef<HTMLDivElement>(null);

  // update position styles on document resize
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useLayoutEffect(() => {
    // mozilla pls https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/anchor
    const update = () => {
      if (!menuRef.current) return;
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;
      menuRef.current.style.top = `calc(${triggerRect.bottom}px + 1em)`;
      // offset and bottom padding
      menuRef.current.style.maxHeight = `calc(100dvh - ${triggerRect.bottom}px - 2em)`;
      if (width === 'auto') menuRef.current.style.left = `${triggerRect.right}px`;
    };
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    update();
    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    if (state === MenuState.Open) ref.current?.showPopover();
    if (state === MenuState.Closed) ref.current?.hidePopover();
    ref.current?.setAttribute('open', String(state === MenuState.Open));
  }, [state]);

  useEffect(() => {
    // outer onClick includes children
    ref.current?.addEventListener('click', (event) => {
      if (event.target === ref.current) setClosed();
    });
  }, [setClosed]);

  return createPortal(
    <div
      popover='manual'
      ref={ref}
      className={`size-full transition-[background] duration-200 starting:bg-transparent ${state === MenuState.Open ? 'bg-background/50' : state === MenuState.Closing ? 'bg-transparent' : 'hidden'}`}
    >
      <menu
        className={`fixed ${width === 'full' ? 'left-0 right-0' : '-translate-x-full'} ${className} ${state === MenuState.Closing ? classNameClosing : ''}`}
        ref={menuRef}
      >
        {children}
      </menu>
    </div>,
    document.body.querySelector('#menus') ?? document.body
  );
}
