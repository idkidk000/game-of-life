import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, type RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button';

enum MenuState {
  Closed,
  Open,
  Closing,
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

/** context provider. requires `MenuTrigger` and `MenuContent` children */
export function Menu({ children, closingMillis = 300 }: { children: ReactNode; closingMillis?: number }) {
  const [state, setState] = useState<MenuState>(MenuState.Closed);
  const menuRef = useRef<HTMLMenuElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef(state);

  // update state into stateRef
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // close on click outside menu
  useEffect(() => {
    const controller = new AbortController();
    document.addEventListener(
      'click',
      (event) => {
        if (stateRef.current !== MenuState.Open) return;
        if (
          triggerRef.current === event.target
          || menuRef.current === event.target
          || triggerRef.current?.contains(event.target as Node)
          || menuRef.current?.contains(event.target as Node)
        )
          return;
        setState(MenuState.Closing);
        setTimeout(() => setState(MenuState.Closed), closingMillis);
      },
      { signal: controller.signal }
    );
  }, [closingMillis]);

  const contextValue: Context = useMemo(() => ({ triggerRef, setState, state, stateRef, closingMillis, menuRef }), [closingMillis, state]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
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
  className = 'left-0 right-0 starting:opacity-0 starting:scale-95 starting:-translate-y-[25dvh] origin-center duration-200 ease-in',
  classNameClosed = 'hidden',
  classNameClosing = 'scale-95 opacity-0 translate-y-[25dvh]',
  classNameOpen = 'scale-100 opacity-100 translate-y-0',
  offset = '1em',
}: {
  children: ReactNode;
  className?: string;
  classNameClosed?: string;
  classNameClosing?: string;
  classNameOpen?: string;
  offset?: string;
}) {
  const { state, menuRef, triggerRef } = useMenu();

  return (
    <menu
      className={`fixed ${className} ${
        state === MenuState.Closed ? classNameClosed
        : state === MenuState.Closing ? classNameClosing
        : classNameOpen
      }`}
      ref={menuRef}
      style={{
        top: `calc(${triggerRef.current?.getBoundingClientRect().bottom}px + ${offset})`,
      }}
    >
      {children}
    </menu>
  );
}
