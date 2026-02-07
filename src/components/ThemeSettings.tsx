import React, { useState, useRef } from 'react';
import { useTheme, themes, WeatherMappings } from '../contexts/ThemeContext';
import {
  Download, Upload, Trash2, Save, Play, Moon, Sun,
  Palette, Layers, RefreshCw,
  CloudRain, Zap, FileJson, Rocket, Fish,
  Share2, Dna, Flame
} from 'lucide-react';

export function ThemeSettings() {
  const {
    currentTheme, setTheme: setThemeContext,
    rainbowEnabled, setRainbowEnabled,
    rainbowBrightness, setRainbowBrightness, rainbowThickness, setRainbowThickness,
    rainbowMode, setRainbowMode, rainbowColor, setRainbowColor,
    matrixEnabled, setMatrixEnabled, matrixSpeed, setMatrixSpeed, matrixBrightness, setMatrixBrightness,
    surfaceOpacity, setSurfaceOpacity,
    snowflakesEnabled, setSnowflakesEnabled, snowflakesCount, setSnowflakesCount, snowflakesSpeed, setSnowflakesSpeed,
    celestialEnabled, setCelestialEnabled, moonType, setMoonType, celestialSize, setCelestialSize,
    rainEnabled, setRainEnabled, rainIntensity, setRainIntensity, rainSpeed, setRainSpeed,
    lightningEnabled, setLightningEnabled, lightningFrequency, setLightningFrequency, lightningIntensity, setLightningIntensity,
    weatherEnabled, setWeatherEnabled,
    setWeatherXOffset,
    weatherOpacity, setWeatherOpacity,
    weatherIsLocked, setWeatherIsLocked,
    weatherAutoTheme, setWeatherAutoTheme,
    weatherMappings, setWeatherMapping,
    cosmosEnabled, setCosmosEnabled,
    cosmosSpeed, setCosmosSpeed,
    aquariumEnabled, setAquariumEnabled,
    aquariumFishCount, setAquariumFishCount,
    particlesEnabled, setParticlesEnabled,
    particlesCount, setParticlesCount,
    dnaEnabled, setDnaEnabled,
    dnaSpeed, setDnaSpeed,
    firefliesEnabled, setFirefliesEnabled,
    firefliesCount, setFirefliesCount,
    presets, savePreset, updatePreset, loadPreset, deletePreset, exportConfig, importConfig
  } = useTheme();

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [confirmTimer, setConfirmTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'effects' | 'weather' | 'presets'>('effects');

  const handleThemeSelect = (themeId: string) => {
    if (themeId === currentTheme.id) return;
    const previousThemeId = localStorage.getItem('theme') || currentTheme.id;
    localStorage.setItem('previousTheme', previousThemeId);
    setPendingTheme(themeId);
    setConfirmTimer(15);
    setThemeContext(themeId);
    const interval = setInterval(() => {
      setConfirmTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setThemeContext(themeId);
          localStorage.setItem('theme', themeId);
          localStorage.removeItem('previousTheme');
          setPendingTheme(null);
          setTimerInterval(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);
  };

  const handleConfirmTheme = () => {
    if (pendingTheme) {
      setThemeContext(pendingTheme);
      if (timerInterval) clearInterval(timerInterval);
      setPendingTheme(null);
      setConfirmTimer(0);
      setTimerInterval(null);
    }
  };

  const handleCancelTheme = () => {
    if (pendingTheme) {
      const previousThemeId = localStorage.getItem('previousTheme') || themes[0].id;
      setThemeContext(previousThemeId);
      localStorage.setItem('theme', previousThemeId);
      localStorage.removeItem('previousTheme');
      if (timerInterval) clearInterval(timerInterval);
      setPendingTheme(null);
      setConfirmTimer(0);
      setTimerInterval(null);
    }
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim());
      setNewPresetName('');
    }
  };

  const handleExport = () => {
    const config = exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme_config_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importConfig(content);
      };
      reader.readAsText(file);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-4 lg:space-y-0" style={{ color: 'var(--theme-text)' }}>
      {/* Left Column: Theme Selection */}
      <div
        className="rounded-lg shadow-sm p-4 border flex flex-col h-full rainbow-groupbox"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
          <Palette className="w-5 h-5" />
          Вибір теми
        </h2>

        {pendingTheme && (
          <div className="mb-4 p-4 rounded-lg border-2 flex items-center justify-between" style={{ backgroundColor: 'var(--theme-surface-secondary)', borderColor: 'var(--theme-primary)' }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--theme-text)' }}>Тема змінена. Перевірте читабельність</p>
                <p className="text-sm opacity-80" style={{ color: 'var(--theme-text)' }}>Підтвердження автоматично через {confirmTimer} секунд</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmTheme}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--theme-primary)', color: '#ffffff' }}
              >
                Підтвердити
              </button>
              <button
                onClick={handleCancelTheme}
                className="px-4 py-2 border rounded-lg font-medium transition-colors"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Скасувати
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`relative p-2.5 rounded-lg border-2 transition-all text-left ${currentTheme.id === theme.id ? 'ring-2 ring-opacity-50' : ''}`}
              style={{
                borderColor: currentTheme.id === theme.id ? theme.colors.primary : theme.colors.border,
                boxShadow: currentTheme.id === theme.id ? `0 0 0 2px ${theme.colors.primary}40` : 'none',
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm truncate">{theme.name}</span>
                {currentTheme.id === theme.id && (
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: theme.colors.primary }}></div>
                )}
              </div>
              <div className="flex gap-1">
                <div className="flex-1 h-5 rounded-sm" style={{ backgroundColor: theme.colors.background }}></div>
                <div className="flex-1 h-5 rounded-sm" style={{ backgroundColor: theme.colors.surface }}></div>
                <div className="flex-1 h-5 rounded-sm" style={{ backgroundColor: theme.colors.primary }}></div>
              </div>
              <div className="mt-1 text-[10px] opacity-75">{theme.type === 'dark' ? '🌙 Темна' : '☀️ Світла'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        {/* Brightness & Opacity */}
        <div className="space-y-2 rounded-lg shadow-sm p-4 border rainbow-groupbox" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
          <div>
            <label className="block text-xs font-medium mb-2">Прозорість панелей: {surfaceOpacity}%</label>
            <input
              type="range" min="10" max="100" step="5" value={surfaceOpacity}
              onChange={(e) => setSurfaceOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-surface-secondary)',
                background: `linear-gradient(to right, var(--theme-primary) 0%, var(--theme-primary) ${((surfaceOpacity - 10) / 90) * 100}%, var(--theme-border) ${((surfaceOpacity - 10) / 90) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* RGB Settings */}
        <div className="rounded-lg shadow-sm p-4 border rainbow-groupbox" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 animate-pulse"></div>
            Ефекти RGB
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs">Рамки групбоксів</span>
              <button
                onClick={() => setRainbowEnabled(!rainbowEnabled)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${rainbowEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
              >
                {rainbowEnabled ? 'УВІМК' : 'ВИМК'}
              </button>
            </div>
            {rainbowEnabled && (
              <div className="space-y-3 pt-3 border-t border-slate-600/30">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] opacity-70 mb-1">Яскравість</label>
                    <input type="range" min="0" max="1" step="0.05" value={rainbowBrightness} onChange={(e) => setRainbowBrightness(parseFloat(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] opacity-70 mb-1">Товщина</label>
                    <input type="range" min="1" max="5" step="1" value={rainbowThickness} onChange={(e) => setRainbowThickness(parseFloat(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[{ id: 'rotate', name: 'Цикл' }, { id: 'fire', name: 'Вогонь' }, { id: 'pulse', name: 'Пульс' }].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setRainbowMode(mode.id)}
                      className={`px-1 py-1 text-[10px] font-medium rounded transition-all border ${rainbowMode === mode.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>
                {rainbowMode === 'pulse' && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                    <label className="block text-[10px] opacity-70 mb-1">Колір пульсації</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={rainbowColor}
                        onChange={(e) => setRainbowColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer p-0 overflow-hidden"
                      />
                      <span className="text-[10px] uppercase font-mono">{rainbowColor}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tabs Selection */}
      <div className="lg:col-span-2 space-y-4 pt-4 border-t border-slate-700/50">
        <div className="flex flex-wrap gap-2 px-1">
          {[
            { id: 'effects', name: 'Фонові ефекти', icon: <Layers className="w-4 h-4" /> },
            { id: 'weather', name: 'Погода та Автотема', icon: <CloudRain className="w-4 h-4" /> },
            { id: 'presets', name: 'Менеджер пресетів', icon: <FileJson className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeTab === tab.id ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {activeTab === 'effects' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Matrix */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><div className="w-4 h-4 text-green-500 font-mono font-bold text-xs flex items-center justify-center">M</div><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Матриця</span></div>
                <button onClick={() => setMatrixEnabled(!matrixEnabled)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${matrixEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{matrixEnabled ? 'ON' : 'OFF'}</button>
              </div>
              {matrixEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Яскравість: {Math.round(matrixBrightness * 100)}%</label><input type="range" min="0.05" max="0.6" step="0.05" value={matrixBrightness} onChange={(e) => setMatrixBrightness(parseFloat(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Швидкість: {matrixSpeed}%</label><input type="range" min="10" max="100" step="5" value={matrixSpeed} onChange={(e) => setMatrixSpeed(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                </div>
              )}
            </div>

            {/* Snowflakes */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><span>❄️</span><span>Снігопад</span></div>
                <button onClick={() => setSnowflakesEnabled(!snowflakesEnabled)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${snowflakesEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{snowflakesEnabled ? 'ON' : 'OFF'}</button>
              </div>
              {snowflakesEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Кількість: {snowflakesCount}</label><input type="range" min="50" max="400" step="25" value={snowflakesCount} onChange={(e) => setSnowflakesCount(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Швидкість: {snowflakesSpeed}</label><input type="range" min="1" max="10" step="1" value={snowflakesSpeed} onChange={(e) => setSnowflakesSpeed(parseFloat(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                </div>
              )}
            </div>

            {/* Rain */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><CloudRain className="w-3 h-3 text-blue-400" /><span>Дощ</span></div>
                <button onClick={() => setRainEnabled(!rainEnabled)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${rainEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{rainEnabled ? 'ON' : 'OFF'}</button>
              </div>
              {rainEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Інтенсивність: {rainIntensity}</label><input type="range" min="50" max="500" step="10" value={rainIntensity} onChange={(e) => setRainIntensity(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Швидкість: {rainSpeed}x</label><input type="range" min="5" max="30" step="1" value={rainSpeed} onChange={(e) => setRainSpeed(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                </div>
              )}
            </div>

            {/* Lightning */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Zap className="w-3 h-3 text-yellow-400" /><span>Блискавка</span></div>
                <button
                  onClick={() => setLightningEnabled(!lightningEnabled)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${lightningEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  {lightningEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {lightningEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Частота: {Math.round(lightningFrequency / 10)}%</label><input type="range" min="10" max="900" step="10" value={lightningFrequency} onChange={(e) => setLightningFrequency(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Яскравість: {Math.round(lightningIntensity * 100)}%</label><input type="range" min="0.1" max="1" step="0.1" value={lightningIntensity} onChange={(e) => setLightningIntensity(parseFloat(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                </div>
              )}
            </div>

            {/* Celestial Body */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><span className="text-yellow-500">{currentTheme.type === 'dark' ? '🌙' : '☀️'}</span><span>Небесне тіло</span></div>
                <button onClick={() => setCelestialEnabled(!celestialEnabled)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${celestialEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{celestialEnabled ? 'ON' : 'OFF'}</button>
              </div>
              {celestialEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex-grow text-center">
                  <div><label className="block text-[9px] opacity-70 mb-0.5 text-left">Розмір: {celestialSize}%</label><input type="range" min="100" max="300" step="10" value={celestialSize} onChange={(e) => setCelestialSize(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  {!rainEnabled && (
                    <div className="grid grid-cols-2 gap-1 mt-auto">
                      {[{ id: 'full', name: 'Повний' }, { id: 'crescent', name: 'Серп' }].map((t) => (
                        <button key={t.id} onClick={() => setMoonType(t.id as any)} className={`px-1 py-1 text-[9px] font-medium rounded transition-all border ${moonType === t.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-transparent border-slate-600 text-slate-400'}`}>{t.name}</button>
                      ))}
                    </div>
                  )}
                  {rainEnabled && <p className="text-[9px] italic opacity-50 mt-auto text-center">Замінено хмарами</p>}
                </div>
              )}
            </div>

            {/* Cosmos Effect */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Rocket className="w-3 h-3 text-indigo-400" /><span>Космос</span></div>
                <button
                  onClick={() => setCosmosEnabled(!cosmosEnabled)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${cosmosEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  {cosmosEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex-grow">
                {cosmosEnabled && (
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Швидкість: {cosmosSpeed}%</label><input type="range" min="10" max="100" step="5" value={cosmosSpeed} onChange={(e) => setCosmosSpeed(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                )}
                <p className="text-[9px] opacity-60 italic text-center py-2">
                  {cosmosEnabled ? 'Режим гіперстрибка активовано' : 'Ефект польоту крізь зірки у стилі No Man\'s Sky'}
                </p>
                {cosmosEnabled && (
                  <p className="text-[8px] text-amber-500 font-bold text-center leading-tight">
                    Інші погодні ефекти призупинено
                  </p>
                )}
              </div>
            </div>

            {/* Aquarium Effect */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Fish className="w-3 h-3 text-cyan-400" /><span>Акваріум</span></div>
                <button
                  onClick={() => setAquariumEnabled(!aquariumEnabled)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${aquariumEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  {aquariumEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {aquariumEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex-grow">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Кількість рибок: {aquariumFishCount}</label><input type="range" min="10" max="80" step="5" value={aquariumFishCount} onChange={(e) => setAquariumFishCount(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <p className="text-[8px] text-amber-500 font-bold text-center leading-tight">
                    Інші погодні ефекти призупинено
                  </p>
                </div>
              )}
              {!aquariumEnabled && (
                <div className="flex-grow flex items-center">
                  <p className="text-[9px] opacity-60 italic text-center py-2 w-full">
                    Анімований підводний світ
                  </p>
                </div>
              )}
            </div>

            {/* Particles Effect */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Share2 className="w-3 h-3 text-purple-400" /><span>Частинки</span></div>
                <button
                  onClick={() => setParticlesEnabled(!particlesEnabled)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${particlesEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  {particlesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {particlesEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex-grow">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Кількість: {particlesCount}</label><input type="range" min="20" max="150" step="10" value={particlesCount} onChange={(e) => setParticlesCount(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <p className="text-[8px] text-amber-500 font-bold text-center leading-tight">Вимикає погодні ефекти</p>
                </div>
              )}
              {!particlesEnabled && (
                <div className="flex-grow flex items-center">
                  <p className="text-[9px] opacity-60 italic text-center py-2 w-full">Мережа живих частинок</p>
                </div>
              )}
            </div>

            {/* DNA Helix Effect */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Dna className="w-3 h-3 text-red-400" /><span>ДНК</span></div>
                <button
                  onClick={() => setDnaEnabled(!dnaEnabled)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${dnaEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  {dnaEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {dnaEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex-grow">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Швидкість: {dnaSpeed}%</label><input type="range" min="20" max="200" step="10" value={dnaSpeed} onChange={(e) => setDnaSpeed(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <p className="text-[8px] text-amber-500 font-bold text-center leading-tight">Вимикає погодні ефекти</p>
                </div>
              )}
              {!dnaEnabled && (
                <div className="flex-grow flex items-center">
                  <p className="text-[9px] opacity-60 italic text-center py-2 w-full">Спіраль ДНК життя</p>
                </div>
              )}
            </div>

            {/* Fireflies Effect */}
            <div className="rounded-lg shadow-sm p-2.5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Flame className="w-3 h-3 text-orange-400" /><span>Світлячки</span></div>
                <button
                  onClick={() => setFirefliesEnabled(!firefliesEnabled)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${firefliesEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  {firefliesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {firefliesEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex-grow">
                  <div><label className="block text-[9px] opacity-70 mb-0.5">Кількість: {firefliesCount}</label><input type="range" min="10" max="100" step="5" value={firefliesCount} onChange={(e) => setFirefliesCount(parseInt(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700" /></div>
                  <p className="text-[8px] text-amber-500 font-bold text-center leading-tight">Вимикає погодні ефекти</p>
                </div>
              )}
              {!firefliesEnabled && (
                <div className="flex-grow flex items-center">
                  <p className="text-[9px] opacity-60 italic text-center py-2 w-full">Магічні світлячки</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'weather' && (
          <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Weather Widget Control */}
            <div className="rounded-lg shadow-sm p-5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <CloudRain className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-tight">Віджет погоди</h3>
                    <p className="text-[10px] opacity-60">Стан та видимість на головній</p>
                  </div>
                </div>
                <button
                  onClick={() => setWeatherEnabled(!weatherEnabled)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${weatherEnabled ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
                >
                  {weatherEnabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
                </button>
              </div>

              {weatherEnabled && (
                <div className="space-y-5 pt-2">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-[11px] font-semibold opacity-80 uppercase tracking-widest">Прозорість</label>
                      <span className="text-[11px] font-mono font-bold text-blue-400">{weatherOpacity}%</span>
                    </div>
                    <input
                      type="range" min="10" max="100" step="5" value={weatherOpacity}
                      onChange={(e) => setWeatherOpacity(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700/50 accent-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold opacity-80 uppercase tracking-widest">Блокування</span>
                      <span className="text-[9px] opacity-50">Заборона перетягування</span>
                    </div>
                    <button
                      onClick={() => setWeatherIsLocked(!weatherIsLocked)}
                      className={`px-4 py-2 rounded-lg border text-[10px] font-bold transition-all min-w-[120px] ${weatherIsLocked ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-inner' : 'bg-blue-500/10 border-blue-500/50 text-blue-500 shadow-inner'}`}
                    >
                      {weatherIsLocked ? 'ЗАКРІПЛЕНО' : 'РУХОМИЙ'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setWeatherXOffset(0);
                      setWeatherOpacity(100);
                    }}
                    className="w-full py-2 text-[10px] font-bold text-red-400 hover:bg-red-400/10 border border-red-500/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    СКИНУТИ ВИГЛЯД
                  </button>
                </div>
              )}
            </div>

            {/* Auto-Theme Mapping Tab */}
            <div className="rounded-lg shadow-sm p-5 border rainbow-groupbox flex flex-col" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <RefreshCw className={`w-5 h-5 text-purple-400 ${weatherAutoTheme ? 'animate-spin-slow' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-tight">Розумна Автотема</h3>
                    <p className="text-[10px] opacity-60">Прив'язка пресетів до умов погоди</p>
                  </div>
                </div>
                <button
                  onClick={() => setWeatherAutoTheme(!weatherAutoTheme)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold transition-all border ${weatherAutoTheme ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/40' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}
                >
                  {weatherAutoTheme ? 'СТАТУС: АКТИВНО' : 'СТАТУС: ВИМКНЕНО'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'sunny', name: 'Ясно (Suncase)', icon: <Sun className="w-4 h-4 text-yellow-400" /> },
                  { id: 'cloudy', name: 'Хмарність', icon: <Moon className="w-4 h-4 text-slate-400" /> },
                  { id: 'rainy', name: 'Дощова погода', icon: <CloudRain className="w-4 h-4 text-blue-400" /> },
                  { id: 'snowy', name: 'Снігопад', icon: <Layers className="w-4 h-4 text-cyan-200" /> },
                  { id: 'stormy', name: 'Гроза/Шторм', icon: <Zap className="w-4 h-4 text-purple-500" /> },
                ].map((weather) => (
                  <div key={weather.id} className="p-3 rounded-xl border flex flex-col gap-2 transition-all hover:border-purple-500/30" style={{ backgroundColor: 'var(--theme-surface-secondary)', borderColor: 'var(--theme-border)' }}>
                    <div className="flex items-center gap-2">
                      {weather.icon}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{weather.name}</span>
                    </div>
                    <select
                      value={weatherMappings[weather.id as keyof WeatherMappings] || ''}
                      onChange={(e) => setWeatherMapping(weather.id as keyof WeatherMappings, e.target.value || null)}
                      className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-2 py-1.5 text-[11px] font-medium outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      <option value="" className="bg-slate-800"> -- Без пресета --</option>
                      {presets.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-[10px] opacity-70 leading-relaxed italic">
                  <span className="font-bold text-blue-400 mr-1">Інфо:</span>
                  Автотема автоматично завантажує обраний пресет, коли погода змінюється на відповідний стан.
                  Це дозволяє повністю змінити атмосферу додатка (кольори, ефекти, прозорість) під реальну погоду.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-lg shadow-sm p-4 border rainbow-groupbox" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow flex flex-col gap-3">
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--theme-primary)' }}>
                    <FileJson className="w-4 h-4" />
                    Керування пресетами
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Новий пресет..."
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded border outline-none bg-transparent"
                      style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    />
                    <button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Зберегти
                    </button>
                  </div>
                </div>

                <div className="flex-grow flex flex-col gap-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {presets.length === 0 ? (
                      <p className="col-span-full text-[10px] text-slate-500 italic text-center py-4">Немає збережених пресетів</p>
                    ) : (
                      presets.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded border group transition-all hover:border-blue-500/50" style={{ backgroundColor: 'var(--theme-surface-secondary)', borderColor: 'var(--theme-border)' }}>
                          <span className="text-[10px] font-medium truncate flex-1" style={{ color: 'var(--theme-text)' }}>{p.name}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { loadPreset(p.id); setActivePresetId(p.id); }} className={`p-1 rounded ${activePresetId === p.id ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 hover:bg-green-400/10'}`} title="Завантажити"><Play className="w-3 h-3" /></button>
                            <button onClick={() => updatePreset(p.id)} className="p-1 text-yellow-400 hover:bg-yellow-400/10 rounded" title="Оновити"><Save className="w-3 h-3" /></button>
                            <button onClick={() => { deletePreset(p.id); if (activePresetId === p.id) setActivePresetId(null); }} className="p-1 text-red-400 hover:bg-red-400/10 rounded" title="Видалити"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button onClick={handleExport} className="flex-1 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-700/50" style={{ backgroundColor: 'var(--theme-surface-secondary)', color: 'var(--theme-text)' }}><Download className="w-3 h-3" /> Експорт конфігу</button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-700/50" style={{ backgroundColor: 'var(--theme-surface-secondary)', color: 'var(--theme-text)' }}><Upload className="w-3 h-3" /> Імпорт конфігу</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
    </div>
  );
}
