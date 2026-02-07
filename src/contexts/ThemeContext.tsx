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

export interface WeatherMappings {
  sunny: string | null;
  cloudy: string | null;
  rainy: string | null;
  snowy: string | null;
  stormy: string | null;
}

export interface ThemePreset {
  id: string;
  name: string;
  settings: {
    themeId: string;
    themeBrightness: number;
    surfaceOpacity: number;
    rainbowEnabled: boolean;
    rainbowSpeed: number;
    rainbowBrightness: number;
    rainbowThickness: number;
    rainbowMode: string;
    rainbowColor: string;
    matrixEnabled: boolean;
    matrixSpeed: number;
    matrixBrightness: number;
    snowflakesEnabled: boolean;
    snowflakesCount: number;
    snowflakesSpeed: number;
    snowflakesBrightness: number;
    celestialEnabled: boolean;
    moonType: 'full' | 'crescent';
    celestialSize: number;
    rainEnabled: boolean;
    rainIntensity: number;
    rainSpeed: number;
    weatherEnabled: boolean;
    weatherXOffset: number;
    weatherYOffset: number;
    weatherOpacity: number;
    weatherIsLocked: boolean;
    cosmosEnabled: boolean;
    cosmosSpeed: number;
    aquariumEnabled: boolean;
    aquariumFishCount: number;
    particlesEnabled: boolean;
    particlesCount: number;
    dnaEnabled: boolean;
    dnaSpeed: number;
    firefliesEnabled: boolean;
    firefliesCount: number;
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
    name: 'Сіра (Дощова)',
    type: 'light',
    colors: {
      background: '#e2e8f0', // slate-200
      surface: '#cbd5e1',    // slate-300
      surfaceSecondary: '#94a3b8', // slate-400
      border: '#64748b',    // slate-500
      text: '#1e293b',      // slate-900
      textSecondary: '#334155', // slate-800
      primary: '#475569',   // slate-600
      primaryHover: '#334155',
      accent: '#64748b',
    },
  },
  {
    id: 'light-blue',
    name: 'Світла (Блакитна)',
    type: 'light',
    colors: {
      background: '#dbeafe',
      surface: '#bfdbfe',
      surfaceSecondary: '#93c5fd',
      border: '#60a5fa',
      text: '#1e3a8a',
      textSecondary: '#1e40af',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      accent: '#3b82f6',
    },
  },
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string, isAuto?: boolean) => void;
  rainbowEnabled: boolean;
  setRainbowEnabled: (enabled: boolean) => void;
  rainbowSpeed: number;
  setRainbowSpeed: (speed: number) => void;
  rainbowBrightness: number;
  setRainbowBrightness: (brightness: number) => void;
  rainbowThickness: number;
  setRainbowThickness: (thickness: number) => void;

  rainbowMode: string;
  setRainbowMode: (mode: string) => void;
  rainbowColor: string;
  setRainbowColor: (color: string) => void;
  themeBrightness: number;
  setThemeBrightness: (brightness: number) => void;
  matrixEnabled: boolean;
  setMatrixEnabled: (enabled: boolean) => void;
  matrixSpeed: number;
  setMatrixSpeed: (speed: number) => void;
  matrixBrightness: number;
  setMatrixBrightness: (brightness: number) => void;
  surfaceOpacity: number;
  setSurfaceOpacity: (opacity: number) => void;
  snowflakesEnabled: boolean;
  setSnowflakesEnabled: (enabled: boolean) => void;
  snowflakesCount: number;
  setSnowflakesCount: (count: number) => void;
  snowflakesSpeed: number;
  setSnowflakesSpeed: (speed: number) => void;
  snowflakesBrightness: number;
  setSnowflakesBrightness: (brightness: number) => void;
  celestialEnabled: boolean;
  setCelestialEnabled: (enabled: boolean) => void;
  moonType: 'full' | 'crescent';
  setMoonType: (type: 'full' | 'crescent') => void;
  celestialSize: number;
  setCelestialSize: (size: number) => void;
  rainEnabled: boolean;
  setRainEnabled: (enabled: boolean) => void;
  rainIntensity: number;
  setRainIntensity: (intensity: number) => void;
  rainSpeed: number;
  setRainSpeed: (speed: number) => void;
  lightningEnabled: boolean;
  setLightningEnabled: (enabled: boolean) => void;
  lightningFrequency: number;
  setLightningFrequency: (frequency: number) => void;
  lightningIntensity: number;
  setLightningIntensity: (intensity: number) => void;
  weatherEnabled: boolean;
  setWeatherEnabled: (enabled: boolean) => void;
  weatherXOffset: number;
  setWeatherXOffset: (offset: number) => void;
  weatherYOffset: number;
  setWeatherYOffset: (offset: number) => void;
  weatherOpacity: number;
  setWeatherOpacity: (opacity: number) => void;
  weatherIsLocked: boolean;
  setWeatherIsLocked: (locked: boolean) => void;
  weatherAutoTheme: boolean;
  setWeatherAutoTheme: (enabled: boolean) => void;
  weatherMappings: WeatherMappings;
  setWeatherMapping: (weather: keyof WeatherMappings, presetId: string | null) => void;
  updateWeatherTheme: (code: number) => void;
  cosmosEnabled: boolean;
  setCosmosEnabled: (enabled: boolean) => void;
  cosmosSpeed: number;
  setCosmosSpeed: (speed: number) => void;
  aquariumEnabled: boolean;
  setAquariumEnabled: (enabled: boolean) => void;
  aquariumFishCount: number;
  setAquariumFishCount: (count: number) => void;
  particlesEnabled: boolean;
  setParticlesEnabled: (enabled: boolean) => void;
  particlesCount: number;
  setParticlesCount: (count: number) => void;
  dnaEnabled: boolean;
  setDnaEnabled: (enabled: boolean) => void;
  dnaSpeed: number;
  setDnaSpeed: (speed: number) => void;
  firefliesEnabled: boolean;
  setFirefliesEnabled: (enabled: boolean) => void;
  firefliesCount: number;
  setFirefliesCount: (count: number) => void;

  // Presets
  presets: ThemePreset[];
  savePreset: (name: string) => void;
  loadPreset: (presetId: string, isAuto?: boolean) => void;
  updatePreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  exportConfig: () => string;
  importConfig: (json: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);
  const [themeBrightness, setThemeBrightness] = useState<number>(100);
  const [rainbowEnabled, setRainbowEnabled] = useState<boolean>(false);
  const [rainbowSpeed, setRainbowSpeed] = useState<number>(5);
  const [rainbowBrightness, setRainbowBrightness] = useState<number>(0.5);
  const [rainbowThickness, setRainbowThickness] = useState<number>(2);
  const [rainbowMode, setRainbowMode] = useState<string>('rotate');
  const [rainbowColor, setRainbowColor] = useState<string>('#3b82f6');
  const [matrixEnabled, setMatrixEnabled] = useState<boolean>(false);
  const [matrixSpeed, setMatrixSpeed] = useState<number>(33);
  const [matrixBrightness, setMatrixBrightness] = useState<number>(0.25);
  const [surfaceOpacity, setSurfaceOpacity] = useState<number>(100);
  const [snowflakesEnabled, setSnowflakesEnabled] = useState<boolean>(false);
  const [snowflakesCount, setSnowflakesCount] = useState<number>(100);
  const [snowflakesSpeed, setSnowflakesSpeed] = useState<number>(5);
  const [snowflakesBrightness, setSnowflakesBrightness] = useState<number>(0.5);
  const [celestialEnabled, setCelestialEnabled] = useState<boolean>(false);
  const [moonType, setMoonType] = useState<'full' | 'crescent'>('full');
  const [celestialSize, setCelestialSize] = useState<number>(100);
  const [rainEnabled, setRainEnabled] = useState<boolean>(false);
  const [rainIntensity, setRainIntensity] = useState<number>(100);
  const [rainSpeed, setRainSpeed] = useState<number>(10);
  const [lightningEnabled, setLightningEnabled] = useState<boolean>(false);
  const [lightningFrequency, setLightningFrequency] = useState<number>(500);
  const [lightningIntensity, setLightningIntensity] = useState<number>(0.5);
  const [weatherEnabled, setWeatherEnabled] = useState<boolean>(true);
  const [weatherXOffset, setWeatherXOffset] = useState<number>(0);
  const [weatherYOffset, setWeatherYOffset] = useState<number>(0);
  const [weatherOpacity, setWeatherOpacity] = useState<number>(100);
  const [weatherIsLocked, setWeatherIsLocked] = useState<boolean>(false);
  const [weatherAutoTheme, setWeatherAutoTheme] = useState<boolean>(false);
  const [weatherMappings, setWeatherMappings] = useState<WeatherMappings>({
    sunny: null,
    cloudy: null,
    rainy: null,
    snowy: null,
    stormy: null
  });
  const [lastWeatherCode, setLastWeatherCode] = useState<number | null>(null);
  const [cosmosEnabled, setCosmosEnabled] = useState<boolean>(false);
  const [cosmosSpeed, setCosmosSpeed] = useState<number>(50);
  const [aquariumEnabled, setAquariumEnabled] = useState<boolean>(false);
  const [aquariumFishCount, setAquariumFishCount] = useState<number>(30);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(false);
  const [particlesCount, setParticlesCount] = useState<number>(50);
  const [dnaEnabled, setDnaEnabled] = useState<boolean>(false);
  const [dnaSpeed, setDnaSpeed] = useState<number>(100);
  const [firefliesEnabled, setFirefliesEnabled] = useState<boolean>(false);
  const [firefliesCount, setFirefliesCount] = useState<number>(30);

  const [presets, setPresets] = useState<ThemePreset[]>([]);

  // Helper for localStorage
  const saveToLS = (key: string, value: any) => localStorage.setItem(key, value.toString());

  // Load all from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme');
    if (savedThemeId) {
      const theme = themes.find(t => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }

    setRainbowEnabled(localStorage.getItem('rainbowEnabled') === 'true');
    setRainbowSpeed(parseFloat(localStorage.getItem('rainbowSpeed') || '5'));
    setRainbowBrightness(parseFloat(localStorage.getItem('rainbowBrightness') || '0.5'));
    setRainbowThickness(parseFloat(localStorage.getItem('rainbowThickness') || '2'));
    setRainbowMode(localStorage.getItem('rainbowMode') || 'rotate');
    setRainbowColor(localStorage.getItem('rainbowColor') || '#3b82f6');
    setThemeBrightness(parseFloat(localStorage.getItem('themeBrightness') || '100'));
    setMatrixEnabled(localStorage.getItem('matrixEnabled') === 'true');
    setMatrixSpeed(parseFloat(localStorage.getItem('matrixSpeed') || '33'));
    setMatrixBrightness(parseFloat(localStorage.getItem('matrixBrightness') || '0.25'));
    setSurfaceOpacity(parseFloat(localStorage.getItem('surfaceOpacity') || '100'));
    setSnowflakesEnabled(localStorage.getItem('snowflakesEnabled') === 'true');
    setSnowflakesCount(parseInt(localStorage.getItem('snowflakesCount') || '100'));
    setSnowflakesSpeed(parseFloat(localStorage.getItem('snowflakesSpeed') || '5'));
    setSnowflakesBrightness(parseFloat(localStorage.getItem('snowflakesBrightness') || '0.5'));
    setCelestialEnabled(localStorage.getItem('celestialEnabled') === 'true');
    setMoonType((localStorage.getItem('moonType') as 'full' | 'crescent') || 'full');
    setCelestialSize(parseFloat(localStorage.getItem('celestialSize') || '100'));
    setRainEnabled(localStorage.getItem('rainEnabled') === 'true');
    setRainIntensity(parseFloat(localStorage.getItem('rainIntensity') || '100'));
    setRainSpeed(parseFloat(localStorage.getItem('rainSpeed') || '10'));
    setLightningEnabled(localStorage.getItem('lightningEnabled') === 'true');
    setLightningFrequency(parseFloat(localStorage.getItem('lightningFrequency') || '500'));
    setLightningIntensity(parseFloat(localStorage.getItem('lightningIntensity') || '0.5'));
    setWeatherEnabled(localStorage.getItem('weatherEnabled') !== 'false');
    setWeatherXOffset(parseFloat(localStorage.getItem('weatherXOffset') || '0'));
    setWeatherYOffset(parseFloat(localStorage.getItem('weatherYOffset') || '0'));
    setWeatherOpacity(parseFloat(localStorage.getItem('weatherOpacity') || '100'));
    setWeatherIsLocked(localStorage.getItem('weatherIsLocked') === 'true');
    setWeatherAutoTheme(localStorage.getItem('weatherAutoTheme') === 'true');
    const savedMappings = localStorage.getItem('weatherMappings');
    if (savedMappings) setWeatherMappings(JSON.parse(savedMappings));

    const savedPresets = localStorage.getItem('themePresets');
    if (savedPresets) setPresets(JSON.parse(savedPresets));

    setCosmosEnabled(localStorage.getItem('cosmosEnabled') === 'true');
    setCosmosSpeed(parseInt(localStorage.getItem('cosmosSpeed') || '50'));
    setAquariumEnabled(localStorage.getItem('aquariumEnabled') === 'true');
    setAquariumFishCount(parseInt(localStorage.getItem('aquariumFishCount') || '30'));
    setParticlesEnabled(localStorage.getItem('particlesEnabled') === 'true');
    setParticlesCount(parseInt(localStorage.getItem('particlesCount') || '50'));
    setDnaEnabled(localStorage.getItem('dnaEnabled') === 'true');
    setDnaSpeed(parseInt(localStorage.getItem('dnaSpeed') || '100'));
    setFirefliesEnabled(localStorage.getItem('firefliesEnabled') === 'true');
    setFirefliesCount(parseInt(localStorage.getItem('firefliesCount') || '30'));
  }, []);

  // Persist individual settings to localStorage
  useEffect(() => { saveToLS('themeBrightness', themeBrightness); }, [themeBrightness]);
  useEffect(() => { saveToLS('rainbowEnabled', rainbowEnabled); }, [rainbowEnabled]);
  useEffect(() => { saveToLS('rainbowSpeed', rainbowSpeed); }, [rainbowSpeed]);
  useEffect(() => { saveToLS('rainbowBrightness', rainbowBrightness); }, [rainbowBrightness]);
  useEffect(() => { saveToLS('rainbowThickness', rainbowThickness); }, [rainbowThickness]);
  useEffect(() => { saveToLS('rainbowMode', rainbowMode); }, [rainbowMode]);
  useEffect(() => { saveToLS('rainbowColor', rainbowColor); }, [rainbowColor]);
  useEffect(() => { saveToLS('matrixEnabled', matrixEnabled); }, [matrixEnabled]);
  useEffect(() => { saveToLS('matrixSpeed', matrixSpeed); }, [matrixSpeed]);
  useEffect(() => { saveToLS('matrixBrightness', matrixBrightness); }, [matrixBrightness]);
  useEffect(() => { saveToLS('surfaceOpacity', surfaceOpacity); }, [surfaceOpacity]);
  useEffect(() => { saveToLS('snowflakesEnabled', snowflakesEnabled); }, [snowflakesEnabled]);
  useEffect(() => { saveToLS('snowflakesCount', snowflakesCount); }, [snowflakesCount]);
  useEffect(() => { saveToLS('snowflakesSpeed', snowflakesSpeed); }, [snowflakesSpeed]);
  useEffect(() => { saveToLS('snowflakesBrightness', snowflakesBrightness); }, [snowflakesBrightness]);
  useEffect(() => { saveToLS('celestialEnabled', celestialEnabled); }, [celestialEnabled]);
  useEffect(() => { saveToLS('moonType', moonType); }, [moonType]);
  useEffect(() => { saveToLS('celestialSize', celestialSize); }, [celestialSize]);
  useEffect(() => { saveToLS('rainEnabled', rainEnabled); }, [rainEnabled]);
  useEffect(() => { saveToLS('rainIntensity', rainIntensity); }, [rainIntensity]);
  useEffect(() => { saveToLS('rainSpeed', rainSpeed); }, [rainSpeed]);
  useEffect(() => { saveToLS('weatherXOffset', weatherXOffset); }, [weatherXOffset]);
  useEffect(() => { saveToLS('weatherYOffset', weatherYOffset); }, [weatherYOffset]);
  useEffect(() => { saveToLS('weatherIsLocked', weatherIsLocked); }, [weatherIsLocked]);
  useEffect(() => { saveToLS('weatherOpacity', weatherOpacity); }, [weatherOpacity]);
  useEffect(() => { saveToLS('weatherAutoTheme', weatherAutoTheme); }, [weatherAutoTheme]);
  useEffect(() => { localStorage.setItem('weatherMappings', JSON.stringify(weatherMappings)); }, [weatherMappings]);
  useEffect(() => { saveToLS('cosmosEnabled', cosmosEnabled); }, [cosmosEnabled]);
  useEffect(() => { saveToLS('cosmosSpeed', cosmosSpeed); }, [cosmosSpeed]);
  useEffect(() => { saveToLS('aquariumEnabled', aquariumEnabled); }, [aquariumEnabled]);
  useEffect(() => { saveToLS('aquariumFishCount', aquariumFishCount); }, [aquariumFishCount]);
  useEffect(() => { saveToLS('particlesEnabled', particlesEnabled); }, [particlesEnabled]);
  useEffect(() => { saveToLS('particlesCount', particlesCount); }, [particlesCount]);
  useEffect(() => { saveToLS('dnaEnabled', dnaEnabled); }, [dnaEnabled]);
  useEffect(() => { saveToLS('dnaSpeed', dnaSpeed); }, [dnaSpeed]);
  useEffect(() => { saveToLS('firefliesEnabled', firefliesEnabled); }, [firefliesEnabled]);
  useEffect(() => { saveToLS('firefliesCount', firefliesCount); }, [firefliesCount]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    let colors = { ...currentTheme.colors };

    // Special logic for light-gray theme when rain is enabled
    if (currentTheme.id === 'light-gray' && rainEnabled) {
      colors.background = '#cbd5e1'; // Darker background (slate-300)
      colors.surface = '#94a3b8';    // Surface becomes slate-400
      colors.surfaceSecondary = '#64748b'; // Secondary becomes slate-500
      colors.border = '#475569';    // Border becomes slate-600
      colors.text = '#0f172a';      // Text becomes darker (slate-950)
    }

    const applyOpacity = (hex: string, opacityPercent: number) => {
      if (opacityPercent === 100) return hex;
      const alpha = Math.round((opacityPercent / 100) * 255).toString(16).padStart(2, '0');
      return `${hex}${alpha}`;
    };
    root.style.setProperty('--theme-bg', colors.background);
    root.style.setProperty('--theme-surface', applyOpacity(colors.surface, surfaceOpacity));
    root.style.setProperty('--theme-surface-secondary', applyOpacity(colors.surfaceSecondary, surfaceOpacity));
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-text', colors.text);
    root.style.setProperty('--theme-text-secondary', colors.textSecondary);
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-hover', colors.primaryHover);
    root.style.setProperty('--theme-accent', colors.accent);
    root.setAttribute('data-theme', currentTheme.id);
    root.setAttribute('data-theme-type', currentTheme.type);
    root.style.colorScheme = currentTheme.type;
    if (currentTheme.type === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.text;
  }, [currentTheme, surfaceOpacity, rainEnabled]);

  // Weather Auto-Theme Logic using Mappings
  useEffect(() => {
    if (!weatherAutoTheme || lastWeatherCode === null) return;

    let category: keyof WeatherMappings | null = null;
    const code = lastWeatherCode;

    if (code === 0) category = 'sunny';
    else if (code >= 1 && code <= 3) category = 'cloudy';
    else if (code >= 51 && code <= 67) category = 'rainy';
    else if (code >= 71 && code <= 77) category = 'snowy';
    else if (code >= 95) category = 'stormy';

    if (category && weatherMappings[category]) {
      loadPreset(weatherMappings[category]!, true);
    }
  }, [lastWeatherCode, weatherAutoTheme, weatherMappings]);

  const updateWeatherTheme = (code: number) => {
    setLastWeatherCode(code);
  };

  const setWeatherMapping = (weather: keyof WeatherMappings, presetId: string | null) => {
    setWeatherMappings(prev => ({ ...prev, [weather]: presetId }));
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-brightness', `${themeBrightness}%`);
    root.style.filter = `brightness(${themeBrightness}%)`;
  }, [themeBrightness]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--rainbow-enabled', rainbowEnabled ? '1' : '0');
    root.style.setProperty('--rainbow-speed', `${rainbowSpeed}s`);
    root.style.setProperty('--rainbow-brightness', rainbowBrightness.toString());
    root.style.setProperty('--rainbow-thickness', `${rainbowThickness}px`);
    root.style.setProperty('--rainbow-color', rainbowColor);
    root.style.setProperty('--rainbow-mode', rainbowMode);
    if (rainbowEnabled) document.body.classList.add('rainbow-mode');
    else document.body.classList.remove('rainbow-mode');
    document.body.setAttribute('data-rainbow-mode', rainbowMode);
  }, [rainbowEnabled, rainbowSpeed, rainbowBrightness, rainbowThickness, rainbowColor, rainbowMode]);

  const setTheme = (themeId: string, isAuto = false) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      saveToLS('theme', themeId);
      if (!isAuto) setWeatherAutoTheme(false);
    }
  };

  const savePreset = (name: string) => {
    const newPreset: ThemePreset = {
      id: Date.now().toString(),
      name,
      settings: {
        themeId: currentTheme.id,
        themeBrightness,
        surfaceOpacity,
        rainbowEnabled,
        rainbowSpeed,
        rainbowBrightness,
        rainbowThickness,
        rainbowMode,
        rainbowColor,
        matrixEnabled,
        matrixSpeed,
        matrixBrightness,
        snowflakesEnabled,
        snowflakesCount,
        snowflakesSpeed,
        snowflakesBrightness,
        celestialEnabled,
        moonType,
        celestialSize,
        rainEnabled,
        rainIntensity,
        rainSpeed,
        weatherEnabled,
        weatherXOffset,
        weatherYOffset,
        weatherOpacity,
        weatherIsLocked,
        cosmosEnabled,
        cosmosSpeed,
        aquariumEnabled,
        aquariumFishCount,
        particlesEnabled,
        particlesCount,
        dnaEnabled,
        dnaSpeed,
        firefliesEnabled,
        firefliesCount,
      }
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('themePresets', JSON.stringify(updatedPresets));
  };

  const updatePreset = (presetId: string) => {
    const updatedPresets = presets.map(p => {
      if (p.id === presetId) {
        return {
          ...p,
          settings: {
            themeId: currentTheme.id,
            themeBrightness,
            surfaceOpacity,
            rainbowEnabled,
            rainbowSpeed,
            rainbowBrightness,
            rainbowThickness,
            rainbowMode,
            rainbowColor,
            matrixEnabled,
            matrixSpeed,
            matrixBrightness,
            snowflakesEnabled,
            snowflakesCount,
            snowflakesSpeed,
            snowflakesBrightness,
            celestialEnabled,
            moonType,
            celestialSize,
            rainEnabled,
            rainIntensity,
            rainSpeed,
            weatherEnabled,
            weatherXOffset,
            weatherYOffset,
            weatherOpacity,
            weatherIsLocked,
            cosmosEnabled,
            cosmosSpeed,
            aquariumEnabled,
            aquariumFishCount,
            particlesEnabled,
            particlesCount,
            dnaEnabled,
            dnaSpeed,
            firefliesEnabled,
            firefliesCount,
          }
        };
      }
      return p;
    });
    setPresets(updatedPresets as ThemePreset[]);
    localStorage.setItem('themePresets', JSON.stringify(updatedPresets));
  };

  const loadPreset = (presetId: string, isAuto = false) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    const s = preset.settings;
    setTheme(s.themeId, true);
    setThemeBrightness(s.themeBrightness);
    setSurfaceOpacity(s.surfaceOpacity);
    setRainbowEnabled(s.rainbowEnabled);
    setRainbowSpeed(s.rainbowSpeed);
    setRainbowBrightness(s.rainbowBrightness);
    setRainbowThickness(s.rainbowThickness);
    setRainbowMode(s.rainbowMode);
    setRainbowColor(s.rainbowColor);
    setMatrixEnabled(s.matrixEnabled);
    setMatrixSpeed(s.matrixSpeed);
    setMatrixBrightness(s.matrixBrightness);
    setSnowflakesEnabled(s.snowflakesEnabled);
    setSnowflakesCount(s.snowflakesCount);
    setSnowflakesSpeed(s.snowflakesSpeed);
    setSnowflakesBrightness(s.snowflakesBrightness);
    setCelestialEnabled(s.celestialEnabled);
    setMoonType(s.moonType);
    setCelestialSize(s.celestialSize);
    setRainEnabled(s.rainEnabled ?? false);
    setRainIntensity(s.rainIntensity ?? 100);
    setRainSpeed(s.rainSpeed ?? 10);
    setWeatherEnabled(s.weatherEnabled ?? true);
    setCosmosEnabled(s.cosmosEnabled ?? false);
    setCosmosSpeed(s.cosmosSpeed ?? 50);
    setAquariumEnabled(s.aquariumEnabled ?? false);
    setAquariumFishCount(s.aquariumFishCount ?? 30);
    setParticlesEnabled(s.particlesEnabled ?? false);
    setParticlesCount(s.particlesCount ?? 50);
    setDnaEnabled(s.dnaEnabled ?? false);
    setDnaSpeed(s.dnaSpeed ?? 100);
    setFirefliesEnabled(s.firefliesEnabled ?? false);
    setFirefliesCount(s.firefliesCount ?? 30);

    if (!isAuto) setWeatherAutoTheme(false);


    // Persist all loaded settings
    Object.entries(s).forEach(([key, val]) => {
      const lsKey = key === 'themeId' ? 'theme' : key;
      localStorage.setItem(lsKey, val.toString());
    });
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    localStorage.setItem('themePresets', JSON.stringify(updatedPresets));
  };

  const exportConfig = () => {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      currentSettings: {
        themeId: currentTheme.id,
        themeBrightness,
        surfaceOpacity,
        rainbowEnabled,
        rainbowSpeed,
        rainbowBrightness,
        rainbowThickness,
        rainbowMode,
        rainbowColor,
        matrixEnabled,
        matrixSpeed,
        matrixBrightness,
        snowflakesEnabled,
        snowflakesCount,
        snowflakesSpeed,
        snowflakesBrightness,
        celestialEnabled,
        moonType,
        celestialSize,
        rainEnabled,
        rainIntensity,
        rainSpeed,
        weatherEnabled,
        weatherXOffset,
        weatherYOffset,
        weatherOpacity,
        weatherIsLocked,
        cosmosEnabled,
        cosmosSpeed,
        aquariumEnabled,
        aquariumFishCount,
        particlesEnabled,
        particlesCount,
        dnaEnabled,
        dnaSpeed,
        firefliesEnabled,
        firefliesCount,
      },
      presets: presets
    };
    return JSON.stringify(config, null, 2);
  };

  const importConfig = (json: string) => {
    try {
      const config = JSON.parse(json);
      if (config.currentSettings) {
        // Load current settings from import
        const s = config.currentSettings;
        setTheme(s.themeId);
        setThemeBrightness(s.themeBrightness);
        setSurfaceOpacity(s.surfaceOpacity);
        setRainbowEnabled(s.rainbowEnabled);
        setRainbowSpeed(s.rainbowSpeed);
        setRainbowBrightness(s.rainbowBrightness);
        setRainbowThickness(s.rainbowThickness);
        setRainbowMode(s.rainbowMode);
        setRainbowColor(s.rainbowColor);
        setMatrixEnabled(s.matrixEnabled);
        setMatrixSpeed(s.matrixSpeed);
        setMatrixBrightness(s.matrixBrightness);
        setSnowflakesEnabled(s.snowflakesEnabled);
        setSnowflakesCount(s.snowflakesCount);
        setSnowflakesSpeed(s.snowflakesSpeed);
        setSnowflakesBrightness(s.snowflakesBrightness);
        setCelestialEnabled(s.celestialEnabled);
        setMoonType(s.moonType);
        setCelestialSize(s.celestialSize);
        setRainEnabled(s.rainEnabled ?? false);
        setRainIntensity(s.rainIntensity ?? 100);
        setRainSpeed(s.rainSpeed ?? 10);
        setWeatherEnabled(s.weatherEnabled ?? true);
        setWeatherXOffset(s.weatherXOffset ?? 0);
        setWeatherYOffset(s.weatherYOffset ?? 0);
        setWeatherOpacity(s.weatherOpacity ?? 100);
        setWeatherIsLocked(s.weatherIsLocked ?? false);
        setWeatherAutoTheme(s.weatherAutoTheme ?? false);
        setCosmosEnabled(s.cosmosEnabled ?? false);
        setCosmosSpeed(s.cosmosSpeed ?? 50);
        setAquariumEnabled(s.aquariumEnabled ?? false);
        setAquariumFishCount(s.aquariumFishCount ?? 30);
        setParticlesEnabled(s.particlesEnabled ?? false);
        setParticlesCount(s.particlesCount ?? 50);
        setDnaEnabled(s.dnaEnabled ?? false);
        setDnaSpeed(s.dnaSpeed ?? 100);
        setFirefliesEnabled(s.firefliesEnabled ?? false);
        setFirefliesCount(s.firefliesCount ?? 30);

        // Persist
        Object.entries(s).forEach(([key, val]) => {
          const lsKey = key === 'themeId' ? 'theme' : key;
          localStorage.setItem(lsKey, String(val));
        });
      }
      if (config.presets) {
        setPresets(config.presets);
        localStorage.setItem('themePresets', JSON.stringify(config.presets));
      }
    } catch (e) {
      console.error('Import failed', e);
      alert('Не вдалося імпортувати файл. Невірний формат.');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme, setTheme,
        rainbowEnabled, setRainbowEnabled: (val: boolean) => { setRainbowEnabled(val); saveToLS('rainbowEnabled', val); },
        rainbowSpeed, setRainbowSpeed: (val: number) => { setRainbowSpeed(val); saveToLS('rainbowSpeed', val); },
        rainbowBrightness, setRainbowBrightness: (val: number) => { setRainbowBrightness(val); saveToLS('rainbowBrightness', val); },
        rainbowThickness, setRainbowThickness: (val: number) => { setRainbowThickness(val); saveToLS('rainbowThickness', val); },
        rainbowMode, setRainbowMode: (val: string) => { setRainbowMode(val); saveToLS('rainbowMode', val); },
        rainbowColor, setRainbowColor: (val: string) => { setRainbowColor(val); saveToLS('rainbowColor', val); },
        themeBrightness, setThemeBrightness: (val: number) => { setThemeBrightness(val); saveToLS('themeBrightness', val); },
        matrixEnabled, setMatrixEnabled: (val: boolean) => {
          setMatrixEnabled(val);
          saveToLS('matrixEnabled', val);
          if (val) {
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        matrixSpeed, setMatrixSpeed: (val: number) => { setMatrixSpeed(val); saveToLS('matrixSpeed', val); },
        matrixBrightness, setMatrixBrightness: (val: number) => { setMatrixBrightness(val); saveToLS('matrixBrightness', val); },
        surfaceOpacity, setSurfaceOpacity: (val: number) => { setSurfaceOpacity(val); saveToLS('surfaceOpacity', val); },
        snowflakesEnabled, setSnowflakesEnabled: (val: boolean) => {
          setSnowflakesEnabled(val);
          saveToLS('snowflakesEnabled', val);
          if (val) {
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        snowflakesCount, setSnowflakesCount: (val: number) => { setSnowflakesCount(val); saveToLS('snowflakesCount', val); },
        snowflakesSpeed, setSnowflakesSpeed: (val: number) => { setSnowflakesSpeed(val); saveToLS('snowflakesSpeed', val); },
        snowflakesBrightness, setSnowflakesBrightness: (val: number) => { setSnowflakesBrightness(val); saveToLS('snowflakesBrightness', val); },
        celestialEnabled, setCelestialEnabled: (val: boolean) => {
          setCelestialEnabled(val);
          saveToLS('celestialEnabled', val);
          if (val) {
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        moonType, setMoonType: (val: 'full' | 'crescent') => { setMoonType(val); saveToLS('moonType', val); },
        celestialSize, setCelestialSize: (val: number) => { setCelestialSize(val); saveToLS('celestialSize', val); },
        rainEnabled, setRainEnabled: (val: boolean) => {
          setRainEnabled(val);
          saveToLS('rainEnabled', val);
          if (val) {
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        rainIntensity, setRainIntensity: (val: number) => { setRainIntensity(val); saveToLS('rainIntensity', val); },
        rainSpeed, setRainSpeed: (val: number) => { setRainSpeed(val); saveToLS('rainSpeed', val); },
        lightningEnabled, setLightningEnabled: (val: boolean) => {
          setLightningEnabled(val);
          saveToLS('lightningEnabled', val);
          if (val) {
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        lightningFrequency, setLightningFrequency: (val: number) => { setLightningFrequency(val); saveToLS('lightningFrequency', val); },
        lightningIntensity, setLightningIntensity: (val: number) => { setLightningIntensity(val); saveToLS('lightningIntensity', val); },
        weatherEnabled, setWeatherEnabled: (val: boolean) => { setWeatherEnabled(val); saveToLS('weatherEnabled', val); },
        weatherXOffset, setWeatherXOffset: (val: number) => { setWeatherXOffset(val); saveToLS('weatherXOffset', val); },
        weatherYOffset, setWeatherYOffset: (val: number) => { setWeatherYOffset(val); saveToLS('weatherYOffset', val); },
        weatherOpacity, setWeatherOpacity: (val: number) => { setWeatherOpacity(val); saveToLS('weatherOpacity', val); },
        weatherIsLocked, setWeatherIsLocked: (val: boolean) => { setWeatherIsLocked(val); saveToLS('weatherIsLocked', val); },
        weatherAutoTheme, setWeatherAutoTheme: (enabled: boolean) => {
          if (enabled && !weatherAutoTheme) {
            // Saving current state before enabling auto-theme
            const currentConfig = exportConfig();
            localStorage.setItem('preAutoThemeConfig', currentConfig);
          } else if (!enabled && weatherAutoTheme) {
            // Restore state when disabling auto-theme
            const savedConfig = localStorage.getItem('preAutoThemeConfig');
            if (savedConfig) {
              importConfig(savedConfig);
              localStorage.removeItem('preAutoThemeConfig');
            }
          }
          setWeatherAutoTheme(enabled);
          saveToLS('weatherAutoTheme', enabled);
        },
        weatherMappings, setWeatherMapping,
        updateWeatherTheme,
        cosmosEnabled,
        setCosmosEnabled: (val: boolean) => {
          setCosmosEnabled(val);
          saveToLS('cosmosEnabled', val);
          if (val) {
            setMatrixEnabled(false);
            setSnowflakesEnabled(false);
            setRainEnabled(false);
            setLightningEnabled(false);
            setCelestialEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        cosmosSpeed,
        setCosmosSpeed: (val: number) => {
          setCosmosSpeed(val);
          saveToLS('cosmosSpeed', val);
        },
        aquariumEnabled,
        setAquariumEnabled: (val: boolean) => {
          setAquariumEnabled(val);
          saveToLS('aquariumEnabled', val);
          if (val) {
            setMatrixEnabled(false);
            setSnowflakesEnabled(false);
            setRainEnabled(false);
            setLightningEnabled(false);
            setCelestialEnabled(false);
            setCosmosEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        aquariumFishCount,
        setAquariumFishCount: (val: number) => {
          setAquariumFishCount(val);
          saveToLS('aquariumFishCount', val);
        },
        particlesEnabled,
        setParticlesEnabled: (val: boolean) => {
          setParticlesEnabled(val);
          saveToLS('particlesEnabled', val);
          if (val) {
            setMatrixEnabled(false);
            setSnowflakesEnabled(false);
            setRainEnabled(false);
            setLightningEnabled(false);
            setCelestialEnabled(false);
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setDnaEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        particlesCount,
        setParticlesCount: (val: number) => {
          setParticlesCount(val);
          saveToLS('particlesCount', val);
        },
        dnaEnabled,
        setDnaEnabled: (val: boolean) => {
          setDnaEnabled(val);
          saveToLS('dnaEnabled', val);
          if (val) {
            setMatrixEnabled(false);
            setSnowflakesEnabled(false);
            setRainEnabled(false);
            setLightningEnabled(false);
            setCelestialEnabled(false);
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setFirefliesEnabled(false);
          }
        },
        dnaSpeed,
        setDnaSpeed: (val: number) => {
          setDnaSpeed(val);
          saveToLS('dnaSpeed', val);
        },
        firefliesEnabled,
        setFirefliesEnabled: (val: boolean) => {
          setFirefliesEnabled(val);
          saveToLS('firefliesEnabled', val);
          if (val) {
            setMatrixEnabled(false);
            setSnowflakesEnabled(false);
            setRainEnabled(false);
            setLightningEnabled(false);
            setCelestialEnabled(false);
            setCosmosEnabled(false);
            setAquariumEnabled(false);
            setParticlesEnabled(false);
            setDnaEnabled(false);
          }
        },
        firefliesCount,
        setFirefliesCount: (val: number) => {
          setFirefliesCount(val);
          saveToLS('firefliesCount', val);
        },
        presets, savePreset, updatePreset, loadPreset, deletePreset, exportConfig, importConfig
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
