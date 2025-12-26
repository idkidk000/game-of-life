import { createContext, type ReactNode, type RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

enum ModalState {
  Closed,
  Open,
  Closing,
}

interface Context {
  state: ModalState;
  triggerRef: RefObject<HTMLSpanElement | null>;
  modalRef: RefObject<HTMLDialogElement | null>;
  stateRef: RefObject<ModalState>;
  setOpen: () => void;
  setClosed: () => void;
  toggleOpen: () => void;
}

const Context = createContext<Context | null>(null);

export function Modal({ children, closingMillis = 300 }: { children: ReactNode; closingMillis?: number }) {
  const [state, setState] = useState<ModalState>(ModalState.Closed);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    // update state into stateRef
    stateRef.current = state;
    // toggle open attrib for styling
    triggerRef.current?.toggleAttribute('open', state === ModalState.Open);
  }, [state]);

  const setClosed = useCallback(() => {
    console.debug('modal setClosed');
    if (stateRef.current === ModalState.Open) {
      setState(ModalState.Closing);
      setTimeout(() => setState(ModalState.Closed), closingMillis);
    }
  }, [closingMillis]);

  const setOpen = useCallback(() => {
    console.debug('modal setOpen');
    if (stateRef.current === ModalState.Closed) setState(ModalState.Open);
  }, []);

  const toggleOpen = useCallback(() => {
    console.debug('modal toggleOpen');
    if (stateRef.current === ModalState.Open) {
      setState(ModalState.Closing);
      setTimeout(() => setState(ModalState.Closed), closingMillis);
    } else if (stateRef.current === ModalState.Closed) setState(ModalState.Open);
  }, [closingMillis]);

  // biome-ignore format: do not
  const value: Context = useMemo(() => ({
    modalRef,
    setClosed,
    setOpen,
    state,
    stateRef,
    toggleOpen,
    triggerRef,
  }), [setClosed, setOpen, state, toggleOpen]);

  return <Context value={value}>{children}</Context>;
}

export function useModal() {
  const context = useContext(Context);
  if (context === null) throw new Error('useModal must be used underneath a Modal');
  return context;
}

export function ModalTrigger({ children }: { children: ReactNode }) {
  const { triggerRef, toggleOpen } = useModal();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    const controller = new AbortController();
    triggerRef.current?.addEventListener('click', toggleOpen, { signal: controller.signal });
    return () => controller.abort();
  }, [toggleOpen]);

  return <span ref={triggerRef}>{children}</span>;
}
export function ModalClose({ children }: { children: ReactNode }) {
  const { setClosed } = useModal();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    ref.current?.addEventListener('click', setClosed, { signal: controller.signal });
    return () => controller.abort();
  }, [setClosed]);

  return <span ref={ref}>{children}</span>;
}

export function ModalContent({
  children,
  className = 'bg-background border-3 border-accent mx-auto mb-auto lg:my-auto overflow-y-auto starting:opacity-0 starting:scale-95 starting:-translate-y-[25dvh] origin-center duration-200 ease-in transition-[opacity,scale,translate]',
  classNameClosing = 'scale-95 opacity-0 translate-y-[25dvh]',
}: {
  children: ReactNode;
  className?: string;
  classNameClosing?: string;
}) {
  const { modalRef, state, setClosed } = useModal();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    if (state === ModalState.Open) modalRef.current?.showModal();
    if (state === ModalState.Closed) modalRef.current?.close();
  }, [state]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    // dialog's onClick includes children
    modalRef.current?.addEventListener('click', (event) => {
      if (event.target === modalRef.current) setClosed();
    });
  }, [setClosed]);

  // styling ::backdrop transitions is still jank
  return createPortal(
    <dialog
      ref={modalRef}
      className={`size-full transition-[background] duration-200 starting:bg-transparent flex m-4 max-w-[calc(100dvw-2em)] max-h-[calc(100dvh-2em)] ${state === ModalState.Open ? 'bg-background/50' : state === ModalState.Closing ? 'bg-transparent' : 'hidden'}`}
      // onClick={setClosed}
    >
      <div className={`${className} ${state === ModalState.Closing ? classNameClosing : ''}`}>{children}</div>
    </dialog>,
    document.body.querySelector('#modals') ?? document.body
  );
}
