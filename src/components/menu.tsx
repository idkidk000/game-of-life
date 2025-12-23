import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, type RefObject, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button';

enum MenuState {
  Closed,
  Open,
  Closing,
}

export enum MenuClickToClose {
  Inside,
  Outside,
  Both,
  None,
}

interface Context {
  state: MenuState;
  setState: Dispatch<SetStateAction<MenuState>>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLMenuElement | null>;
  stateRef: RefObject<MenuState>;
  closingMillis: number;
}

const Context = createContext<Context | null>(null);

function elemContains(elem: HTMLElement, event: PointerEvent): boolean {
  if (elem === event.target || elem.contains(event.target as Node)) return true;
  const rect = elem.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

/** context provider. requires `MenuTrigger` and `MenuContent` children */
export function Menu({
  children,
  closingMillis = 300,
  clickToClose = MenuClickToClose.Outside,
}: {
  children: ReactNode;
  closingMillis?: number;
  clickToClose?: MenuClickToClose;
}) {
  const [state, setState] = useState<MenuState>(MenuState.Closed);
  const menuRef = useRef<HTMLMenuElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef(state);

  // update state into stateRef
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // click to close
  useEffect(() => {
    if (clickToClose === MenuClickToClose.None) return;
    const controller = new AbortController();
    document.addEventListener(
      'click',
      // `node.contains` doesn't work on svgs so exclude by client rect instead
      (event) => {
        if (stateRef.current !== MenuState.Open) return;
        if (!triggerRef.current || !menuRef.current) return;
        if (elemContains(triggerRef.current, event)) return;
        if (clickToClose === MenuClickToClose.Inside && !elemContains(menuRef.current, event)) return;
        if (clickToClose === MenuClickToClose.Outside && elemContains(menuRef.current, event)) return;
        setState(MenuState.Closing);
        setTimeout(() => setState(MenuState.Closed), closingMillis);
      },
      { signal: controller.signal }
    );
  }, [closingMillis, clickToClose]);

  const contextValue: Context = useMemo(() => ({ triggerRef, setState, state, stateRef, closingMillis, menuRef }), [closingMillis, state]);

  return <Context value={contextValue}>{children}</Context>;
}

function useMenu() {
  const context = useContext(Context);
  if (context === null) throw new Error('useMenu must be used underneath a Menu component');
  return context;
}

export function MenuTrigger({ children, className, ...props }: Omit<ComponentProps<typeof Button>, 'ref' | 'onClick'>) {
  const { triggerRef, state, stateRef, setState, closingMillis } = useMenu();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClick = useCallback(() => {
    if (stateRef.current === MenuState.Closed) setState(MenuState.Open);
    else if (stateRef.current === MenuState.Open) {
      setState(MenuState.Closing);
      setTimeout(() => setState(MenuState.Closed), closingMillis);
    }
  }, [setState]);

  return (
    <Button
      ref={triggerRef as RefObject<HTMLButtonElement>}
      onClick={handleClick}
      className={`${state === MenuState.Open ? 'bg-accent' : ''} ${className ?? ''}`}
      {...props}
    >
      {children}
    </Button>
  );
}

export function MenuContent({
  children,
  className = 'starting:opacity-0 starting:scale-95 starting:-translate-y-[25dvh] origin-center duration-200 ease-in transition-[opacity,scale,translate]',
  classNameClosed = 'hidden',
  classNameClosing = 'scale-95 opacity-0 translate-y-[25dvh]',
  classNameOpen = 'scale-100 opacity-100 translate-y-0',
  offset = '1em',
  width = 'full',
}: {
  children: ReactNode;
  className?: string;
  classNameClosed?: string;
  classNameClosing?: string;
  classNameOpen?: string;
  offset?: string;
  width?: 'full' | 'auto';
}) {
  const { state, menuRef, triggerRef } = useMenu();

  // update position styles on document resize without forcing a re-render
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useLayoutEffect(() => {
    // mozilla pls https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/anchor
    const update = () => {
      if (!menuRef.current) return;
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;
      menuRef.current.style.top = `calc(${triggerRect.bottom}px + ${offset})`;
      if (width === 'auto') {
        menuRef.current.style.translate = '-100%';
        menuRef.current.style.left = `calc(${triggerRect.right}px + ${offset})`;
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    update();
    return () => observer.disconnect();
  }, [width, offset]);

  return (
    <menu
      className={`fixed ${width === 'full' ? 'left-0 right-0' : ''} ${className} ${
        state === MenuState.Closed ? classNameClosed
        : state === MenuState.Closing ? classNameClosing
        : classNameOpen
      }`}
      ref={menuRef}
    >
      {children}
    </menu>
  );
}
