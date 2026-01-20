import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    border: string;
    text: string;
    textSecondary: string;
    primary: string;
    primaryHover: string;
    accent: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'dark-slate',
    name: 'Темна (Сланцева)',
    type: 'dark',
    colors: {
      background: '#0f172a', // slate-900
      surface: '#1e293b', // slate-800
      surfaceSecondary: '#334155', // slate-700
      border: '#475569', // slate-600
      text: '#f1f5f9', // slate-100
      textSecondary: '#cbd5e1', // slate-300
      primary: '#3b82f6', // blue-500
      primaryHover: '#2563eb', // blue-600
      accent: '#60a5fa', // blue-400
    },
  },
  {
    id: 'dark-blue',
    name: 'Темна (Синя)',
    type: 'dark',
    colors: {
      background: '#0c1226',
      surface: '#1a2332',
      surfaceSecondary: '#2a3441',
      border: '#3a4550',
      text: '#e2e8f0',
      textSecondary: '#b8c5d6',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      accent: '#60a5fa',
    },
  },
  {
    id: 'dark-green',
    name: 'Темна (Зелена)',
    type: 'dark',
    colors: {
      background: '#1a2f1e',
      surface: '#28422c',
      surfaceSecondary: '#36543a',
      border: '#4a6848',
      text: '#f5faf6',
      textSecondary: '#d8e5da',
      primary: '#22c55e',
      primaryHover: '#16a34a',
      accent: '#4ade80',
    },
  },
  {
    id: 'light-gray',
    name: 'Світла (Сіра)',
    type: 'light',
    colors: {
      background: '#e2e8f0', // slate-200 (темніше за slate-50)
      surface: '#cbd5e1', // slate-300 (темніше за slate-100)
      surfaceSecondary: '#94a3b8', // slate-400 (темніше за slate-200)
      border: '#64748b', // slate-500 (темніше за slate-300)
      text: '#0f172a', // slate-900
      textSecondary: '#334155', // slate-700 (темніше за slate-600)
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      accent: '#60a5fa',
    },
  },
  {
    id: 'light-blue',
    name: 'Світла (Блакитна)',
    type: 'light',
    colors: {
      background: '#eff6ff',
      surface: '#dbeafe',
      surfaceSecondary: '#bfdbfe',
      border: '#93c5fd',
      text: '#1e3a8a',
      textSecondary: '#1e40af', // Темніший для кращої видимості
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      accent: '#3b82f6',
    },
  },
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  rainbowEnabled: boolean;
  setRainbowEnabled: (enabled: boolean) => void;
  rainbowSpeed: number;
  setRainbowSpeed: (speed: number) => void;
  rainbowBrightness: number;
  setRainbowBrightness: (brightness: number) => void;
  rainbowThickness: number;
  setRainbowThickness: (thickness: number) => void;
  rainbowLength: number;
  setRainbowLength: (length: number) => void;
  themeBrightness: number;
  setThemeBrightness: (brightness: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [themeBrightness, setThemeBrightness] = useState<number>(100); // percentage, 100 = normal

  // Rainbow settings
  const [rainbowEnabled, setRainbowEnabled] = useState<boolean>(false);
  const [rainbowSpeed, setRainbowSpeed] = useState<number>(5); // seconds
  const [rainbowBrightness, setRainbowBrightness] = useState<number>(0.5);
  const [rainbowThickness, setRainbowThickness] = useState<number>(2); // px
  const [rainbowLength, setRainbowLength] = useState<number>(100); // percentage/spread

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme');
    if (savedThemeId) {
      const theme = themes.find(t => t.id === savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }

    const savedRainbowEnabled = localStorage.getItem('rainbowEnabled');
    if (savedRainbowEnabled) setRainbowEnabled(savedRainbowEnabled === 'true');

    const savedRainbowSpeed = localStorage.getItem('rainbowSpeed');
    if (savedRainbowSpeed) setRainbowSpeed(parseFloat(savedRainbowSpeed));

    const savedRainbowBrightness = localStorage.getItem('rainbowBrightness');
    if (savedRainbowBrightness) setRainbowBrightness(parseFloat(savedRainbowBrightness));

    const savedRainbowThickness = localStorage.getItem('rainbowThickness');
    if (savedRainbowThickness) setRainbowThickness(parseFloat(savedRainbowThickness));

    const savedRainbowLength = localStorage.getItem('rainbowLength');
    if (savedRainbowLength) setRainbowLength(parseFloat(savedRainbowLength));

    const savedThemeBrightness = localStorage.getItem('themeBrightness');
    if (savedThemeBrightness) setThemeBrightness(parseFloat(savedThemeBrightness));
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;

    root.style.setProperty('--theme-bg', colors.background);
    root.style.setProperty('--theme-surface', colors.surface);
    root.style.setProperty('--theme-surface-secondary', colors.surfaceSecondary);
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-text', colors.text);
    root.style.setProperty('--theme-text-secondary', colors.textSecondary);
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-hover', colors.primaryHover);
    root.style.setProperty('--theme-accent', colors.accent);

    // Set theme ID for specific CSS styling
    root.setAttribute('data-theme', currentTheme.id);
    root.setAttribute('data-theme-type', currentTheme.type);

    // Toggle standard tailwind 'dark' class
    if (currentTheme.type === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.text;
  }, [currentTheme]);

  // Apply brightness filter
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-brightness', `${themeBrightness}%`);
    root.style.filter = `brightness(${themeBrightness}%)`;
  }, [themeBrightness]);

  // Apply rainbow settings to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--rainbow-enabled', rainbowEnabled ? '1' : '0');
    root.style.setProperty('--rainbow-speed', `${rainbowSpeed}s`);
    root.style.setProperty('--rainbow-brightness', rainbowBrightness.toString());
    root.style.setProperty('--rainbow-thickness', `${rainbowThickness}px`);
    root.style.setProperty('--rainbow-length', `${rainbowLength}%`);

    if (rainbowEnabled) {
      document.body.classList.add('rainbow-mode');
    } else {
      document.body.classList.remove('rainbow-mode');
    }
  }, [rainbowEnabled, rainbowSpeed, rainbowBrightness, rainbowThickness, rainbowLength]);

  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      // Only save to localStorage if this is not a temporary change
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme !== themeId) {
        localStorage.setItem('theme', themeId);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        rainbowEnabled,
        setRainbowEnabled: (val: boolean) => { setRainbowEnabled(val); localStorage.setItem('rainbowEnabled', val.toString()); },
        rainbowSpeed,
        setRainbowSpeed: (val: number) => { setRainbowSpeed(val); localStorage.setItem('rainbowSpeed', val.toString()); },
        rainbowBrightness,
        setRainbowBrightness: (val: number) => { setRainbowBrightness(val); localStorage.setItem('rainbowBrightness', val.toString()); },
        rainbowThickness,
        setRainbowThickness: (val: number) => { setRainbowThickness(val); localStorage.setItem('rainbowThickness', val.toString()); },
        rainbowLength,
        setRainbowLength: (val: number) => { setRainbowLength(val); localStorage.setItem('rainbowLength', val.toString()); },
        themeBrightness,
        setThemeBrightness: (val: number) => { setThemeBrightness(val); localStorage.setItem('themeBrightness', val.toString()); },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
