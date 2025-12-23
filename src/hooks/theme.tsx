import {
  createContext,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export enum ThemePreference {
  Dark,
  Light,
  Auto,
}

export const themeColours = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
] as const;

export type ThemeColour = (typeof themeColours)[number];

interface Context {
  themePreference: ThemePreference;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  themeDark: boolean;
  themeDarkRef: RefObject<boolean>;
  themeColour: ThemeColour;
  setThemeColour: Dispatch<SetStateAction<ThemeColour>>;
}

const Context = createContext<Context | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColour, setThemeColour] = useState<ThemeColour>((localStorage.getItem('themeColour') ?? 'indigo') as ThemeColour);
  const [themeDark, setDark] = useState(true);
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    Number(localStorage.getItem('themePreference') ?? ThemePreference.Dark) as ThemePreference
  );
  const themeDarkRef = useRef(themeDark);

  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const controller = new AbortController();
    const update = () => {
      const nextDark = (themePreference === ThemePreference.Auto && query.matches) || themePreference === ThemePreference.Dark;
      console.debug('ThemeProvider', { themePreference, matches: query.matches, nextDark });
      if (nextDark !== themeDarkRef.current) {
        setDark(nextDark);
        themeDarkRef.current = nextDark;
      }
      const [remove, add] = nextDark ? ['scheme-only-light', 'scheme-only-dark'] : ['scheme-only-dark', 'scheme-only-light'];
      document.body.classList.remove(remove);
      document.body.classList.add(add);
      localStorage.setItem('themePreference', String(themePreference));
    };
    query.addEventListener('change', update);
    update();
    return () => controller.abort();
  }, [themePreference]);

  useLayoutEffect(() => {
    console.debug('ThemeProvider', { themeColour });
    document.body.classList.remove(...themeColours.filter((colour) => colour !== themeColour));
    document.body.classList.add(themeColour);
    localStorage.setItem('themeColour', themeColour);
  }, [themeColour]);

  const contextValue: Context = useMemo(
    () => ({
      themeDark,
      themeDarkRef,
      themePreference,
      setThemePreference,
      themeColour,
      setThemeColour,
    }),
    [themeDark, themePreference, themeColour]
  );

  return <Context value={contextValue}>{children}</Context>;
}

export function useTheme() {
  const context = useContext(Context);
  if (context === null) throw new Error('useTheme must be used underneath a ThemeProvider');
  return context;
}
