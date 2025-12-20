import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';

export enum ThemePreference {
  Dark,
  Light,
  Auto,
}

interface Context {
  themePreference: ThemePreference;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  dark: boolean;
  darkRef: RefObject<boolean>;
}

const Context = createContext<Context | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState(ThemePreference.Dark);
  const [dark, setDark] = useState(true);
  const darkRef = useRef(dark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const controller = new AbortController();
    const update = () => {
      const nextDark = (themePreference === ThemePreference.Auto && query.matches) || themePreference === ThemePreference.Dark;
      console.debug('ThemeProvider', { themePreference, nextDark });
      setDark(nextDark);
      darkRef.current = nextDark;
      const [remove, add] = nextDark ? ['scheme-only-light', 'scheme-only-dark'] : ['scheme-only-dark', 'scheme-only-light'];
      // bit jank but it prevents a re-render somewhere else
      document.body.classList.remove(remove);
      document.body.classList.add(add);
    };
    query.addEventListener('change', update);
    update();
    return () => controller.abort();
  }, [themePreference]);

  const contextValue: Context = useMemo(
    () => ({
      dark,
      darkRef,
      themePreference,
      setThemePreference,
    }),
    [dark, themePreference]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export function useTheme() {
  const context = useContext(Context);
  if (context === null) throw new Error('useTheme must be used underneath a ThemeProvider');
  return context;
}
