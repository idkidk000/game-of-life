import {
  createContext,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useContext,
  useEffect,
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

interface Theme {
  preference: ThemePreference;
  colour: ThemeColour;
  hue: number;
}

const defaultTheme: Theme = {
  colour: 'indigo',
  hue: 250,
  preference: ThemePreference.Dark,
};

interface Context {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  themeRef: RefObject<Theme>;
  themeDark: boolean;
  themeDarkRef: RefObject<boolean>;
}

const Context = createContext<Context | null>(null);

function readLocalStorage(): Theme | null {
  const value = localStorage.getItem('theme');
  if (!value) return null;
  return JSON.parse(value) as Theme;
}

function writeLocalStorage(theme: Theme): void {
  localStorage.setItem('theme', JSON.stringify(theme));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>({ ...defaultTheme, ...readLocalStorage() });
  const [themeDark, setDark] = useState(true);
  const themeRef = useRef(theme);
  const themeDarkRef = useRef(themeDark);

  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const controller = new AbortController();
    const update = () => {
      const nextDark = (theme.preference === ThemePreference.Auto && query.matches) || theme.preference === ThemePreference.Dark;
      console.debug('ThemeProvider', { preference: theme.preference, matches: query.matches, nextDark });
      if (nextDark !== themeDarkRef.current) {
        setDark(nextDark);
        themeDarkRef.current = nextDark;
      }
      const [remove, add] = nextDark ? ['scheme-only-light', 'scheme-only-dark'] : ['scheme-only-dark', 'scheme-only-light'];
      document.body.classList.remove(remove);
      document.body.classList.add(add);
    };
    query.addEventListener('change', update, { signal: controller.signal });
    update();
    return () => controller.abort();
  }, [theme.preference]);

  useLayoutEffect(() => {
    console.debug('ThemeProvider', { colour: theme.colour });
    document.body.classList.remove(...themeColours.filter((colour) => colour !== theme.colour));
    document.body.classList.add(theme.colour);
  }, [theme.colour]);

  useEffect(() => {
    themeRef.current = theme;
    writeLocalStorage(theme);
  }, [theme]);

  // biome-ignore format: do not
  const contextValue: Context = useMemo(() => ({
    setTheme,
    theme,
    themeDark,
    themeDarkRef,
    themeRef
  }), [theme, themeDark]);

  return <Context value={contextValue}>{children}</Context>;
}

export function useTheme() {
  const context = useContext(Context);
  if (context === null) throw new Error('useTheme must be used underneath a ThemeProvider');
  return context;
}
