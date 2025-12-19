import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

export function Menu({ open, setOpen, children }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; children: ReactNode }) {
  const [state, setState] = useState<'closed' | 'open' | 'closing'>(open ? 'open' : 'closed');
  const ref = useRef<HTMLMenuElement>(null);

  useEffect(() => {
    if (!open) {
      setState('closing');
      setTimeout(() => setState('closed'), 300);
      return;
    } else setState('open');
    const controller = new AbortController();
    const started = Date.now();
    document.addEventListener(
      'click',
      (event) => {
        // the listener detects the event which opened the menu otherwise
        if (Date.now() - started < 300 || !ref.current || !event.target) return;
        // only close if the click was outside ref
        if (!ref.current.contains(event.target as Node)) setOpen(false);
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, [open, setOpen]);

  // i am begging mozilla to implement anchor positioning
  return (
    <menu
      className={`fixed top-[77.5px] left-0 right-0 h-auto starting:opacity-0 starting:scale-95 starting:-translate-y-[25dvh] origin-center duration-200 ease-in ${state === 'closed' ? 'hidden' : state === 'closing' ? 'scale-95 opacity-0 translate-y-[25dvh]' : 'scale-100 opacity-100 translate-y-0'}`}
      ref={ref}
    >
      {children}
    </menu>
  );
}
