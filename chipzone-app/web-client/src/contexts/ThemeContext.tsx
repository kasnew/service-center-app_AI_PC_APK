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
      background: '#0f1f14',
      surface: '#1e2e21',
      surfaceSecondary: '#2d3d30',
      border: '#3c4c3f',
      text: '#f0f5f2',
      textSecondary: '#c8d5ce',
      primary: '#10b981',
      primaryHover: '#059669',
      accent: '#34d399',
    },
  },
  {
    id: 'ukraine',
    name: 'Україна 🇺🇦',
    type: 'dark',
    colors: {
      background: '#0057b7', // Ukrainian blue
      surface: '#1e3a5f',
      surfaceSecondary: '#2d4a6f',
      border: '#3c5a7f',
      text: '#ffd700', // Ukrainian yellow
      textSecondary: '#ffed4e',
      primary: '#ffd700',
      primaryHover: '#ffed4e',
      accent: '#ffed4e',
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
  {
    id: 'light-warm',
    name: 'Світла (Тепла)',
    type: 'light',
    colors: {
      background: '#fff7ed',
      surface: '#ffedd5',
      surfaceSecondary: '#fed7aa',
      border: '#fdba74',
      text: '#7c2d12',
      textSecondary: '#c2410c',
      primary: '#ea580c',
      primaryHover: '#c2410c',
      accent: '#fb923c',
    },
  },
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string, skipSave?: boolean) => void;
  backgroundImage: string | null;
  setBackgroundImage: (imagePath: string | null) => void;
  backgroundOpacity: number;
  setBackgroundOpacity: (opacity: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.3);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme');
    if (savedThemeId) {
      const theme = themes.find(t => t.id === savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }

    const savedBgImage = localStorage.getItem('backgroundImage');
    if (savedBgImage) {
      setBackgroundImage(savedBgImage);
    }

    const savedOpacity = localStorage.getItem('backgroundOpacity');
    if (savedOpacity) {
      setBackgroundOpacity(parseFloat(savedOpacity));
    }
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
    
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.text;
  }, [currentTheme]);

  // Apply background image
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (backgroundImage) {
      root.style.setProperty('--bg-image-url', `url(${backgroundImage})`);
      root.style.setProperty('--bg-image-opacity', backgroundOpacity.toString());
      body.classList.add('has-bg-image');
    } else {
      body.classList.remove('has-bg-image');
      root.style.setProperty('--bg-image-opacity', '0');
    }
  }, [backgroundImage, backgroundOpacity]);

  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      // Only save to localStorage if this is not a temporary change
      // We check if there's a pending theme change in the component
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme !== themeId) {
        // This is a new theme selection, save it
        localStorage.setItem('theme', themeId);
      }
    }
  };

  const handleSetBackgroundImage = (imagePath: string | null) => {
    setBackgroundImage(imagePath);
    if (imagePath) {
      localStorage.setItem('backgroundImage', imagePath);
    } else {
      localStorage.removeItem('backgroundImage');
    }
  };

  const handleSetBackgroundOpacity = (opacity: number) => {
    setBackgroundOpacity(opacity);
    localStorage.setItem('backgroundOpacity', opacity.toString());
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        backgroundImage,
        setBackgroundImage: handleSetBackgroundImage,
        backgroundOpacity,
        setBackgroundOpacity: handleSetBackgroundOpacity,
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

