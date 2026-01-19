import React, { useState } from 'react';
import { useTheme, themes } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';

export function ThemeSettings() {
  const {
    currentTheme, setTheme: setThemeContext,
    rainbowEnabled, setRainbowEnabled, rainbowSpeed, setRainbowSpeed,
    rainbowBrightness, setRainbowBrightness, rainbowThickness, setRainbowThickness,
    rainbowLength, setRainbowLength, themeBrightness, setThemeBrightness
  } = useTheme();
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [confirmTimer, setConfirmTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);



  const handleThemeSelect = (themeId: string) => {
    if (themeId === currentTheme.id) return;

    // Save current theme ID before changing
    const previousThemeId = localStorage.getItem('theme') || currentTheme.id;
    localStorage.setItem('previousTheme', previousThemeId);

    // Set pending theme and start timer
    setPendingTheme(themeId);
    setConfirmTimer(15);

    // Apply theme temporarily (will be saved on confirmation)
    setThemeContext(themeId);

    // Start countdown timer
    const interval = setInterval(() => {
      setConfirmTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-confirm after 15 seconds - use themeId from closure
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
      // Save theme permanently
      setThemeContext(pendingTheme);

      // Clear timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      setPendingTheme(null);
      setConfirmTimer(0);
      setTimerInterval(null);
    }
  };

  const handleCancelTheme = () => {
    if (pendingTheme) {
      // Revert to previous theme
      const previousThemeId = localStorage.getItem('previousTheme') || themes[0].id;

      // Set previous theme
      setThemeContext(previousThemeId);
      localStorage.setItem('theme', previousThemeId);
      localStorage.removeItem('previousTheme');

      // Clear timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      setPendingTheme(null);
      setConfirmTimer(0);
      setTimerInterval(null);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);



  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-4 lg:space-y-0" style={{ color: 'var(--theme-text)' }}>
      {/* Left Column: Theme Selection */}
      <div
        className="rounded-lg shadow-sm p-4 border flex flex-col h-full"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <h2
          className="text-lg font-semibold mb-3 flex items-center gap-2"
          style={{ color: 'var(--theme-text)' }}
        >
          <Palette className="w-5 h-5" />
          Вибір теми
        </h2>

        {/* Confirmation Banner */}
        {pendingTheme && (
          <div
            className="mb-4 p-4 rounded-lg border-2 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--theme-surface-secondary)',
              borderColor: 'var(--theme-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              ></div>
              <div>
                <p style={{ color: 'var(--theme-text)' }} className="font-semibold">
                  Тема змінена. Перевірте читабельність
                </p>
                <p style={{ color: 'var(--theme-text-secondary)' }} className="text-sm">
                  Підтвердження автоматично через {confirmTimer} секунд
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmTheme}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-primary)';
                }}
              >
                Підтвердити
              </button>
              <button
                onClick={handleCancelTheme}
                className="px-4 py-2 rounded-lg font-medium transition-colors border"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-surface-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
              className={`
                relative p-2.5 rounded-lg border-2 transition-all text-left
                ${currentTheme.id === theme.id
                  ? 'ring-2 ring-opacity-50'
                  : ''
                }
              `}
              style={{
                borderColor: currentTheme.id === theme.id
                  ? theme.colors.primary
                  : theme.colors.border,
                boxShadow: currentTheme.id === theme.id
                  ? `0 0 0 2px ${theme.colors.primary}40`
                  : 'none',
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm truncate">{theme.name}</span>
                {currentTheme.id === theme.id && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: theme.colors.primary }}
                  ></div>
                )}
              </div>
              <div className="flex gap-1">
                <div
                  className="flex-1 h-5 rounded-sm"
                  style={{ backgroundColor: theme.colors.background }}
                ></div>
                <div
                  className="flex-1 h-5 rounded-sm"
                  style={{ backgroundColor: theme.colors.surface }}
                ></div>
                <div
                  className="flex-1 h-5 rounded-sm"
                  style={{ backgroundColor: theme.colors.primary }}
                ></div>
              </div>
              <div className="mt-1 text-[10px] opacity-75">
                {theme.type === 'dark' ? '🌙 Темна' : '☀️ Світла'}
              </div>
            </button>
          ))}
        </div>

      </div>

      <div className="space-y-4">
        {/* Theme Brightness Slider */}
        <div
          className="rounded-lg shadow-sm p-4 border"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--theme-text)' }}
          >
            Яскравість теми: {themeBrightness}%
          </label>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={themeBrightness}
            onChange={(e) => setThemeBrightness(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              backgroundColor: 'var(--theme-surface-secondary)',
              background: `linear-gradient(to right, var(--theme-primary) 0%, var(--theme-primary) ${((themeBrightness - 50) / 100) * 100}%, var(--theme-border) ${((themeBrightness - 50) / 100) * 100}%)`,
            }}
          />
          <div
            className="flex justify-between text-[10px] mt-1"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <span>Темніше</span>
            <span>Нормально (100%)</span>
            <span>Світліше</span>
          </div>
        </div>

        {/* Rainbow RGB Settings */}
        <div
          className="rounded-lg shadow-sm p-4 border rainbow-groupbox"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--theme-text)' }}
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 animate-pulse"></div>
            RGB (Групбокси)
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--theme-text)' }}>Увімкнути ефект</span>
              <button
                onClick={() => setRainbowEnabled(!rainbowEnabled)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none`}
                style={{
                  backgroundColor: rainbowEnabled ? 'var(--theme-primary)' : 'var(--theme-border)'
                }}
              >
                <span
                  className={`${rainbowEnabled ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>

            {rainbowEnabled && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  {/* Brightness */}
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                      Яскравість: {Math.round(rainbowBrightness * 100)}%
                    </label>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={rainbowBrightness}
                      onChange={(e) => setRainbowBrightness(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--theme-surface-secondary)',
                        background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${rainbowBrightness * 100}%, var(--theme-border) ${rainbowBrightness * 100}%)`,
                      }}
                    />
                  </div>

                  {/* Speed */}
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                      Швидкість: {rainbowSpeed.toFixed(1)}с
                    </label>
                    <input
                      type="range" min="0.5" max="20" step="0.5"
                      value={rainbowSpeed}
                      onChange={(e) => setRainbowSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--theme-surface-secondary)',
                        background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${((rainbowSpeed - 0.5) / 19.5) * 100}%, var(--theme-border) ${((rainbowSpeed - 0.5) / 19.5) * 100}%)`,
                      }}
                    />
                  </div>

                  {/* Thickness */}
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                      Товщина: {rainbowThickness}px
                    </label>
                    <input
                      type="range" min="1" max="15" step="1"
                      value={rainbowThickness}
                      onChange={(e) => setRainbowThickness(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--theme-surface-secondary)',
                        background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${((rainbowThickness - 1) / 14) * 100}%, var(--theme-border) ${((rainbowThickness - 1) / 14) * 100}%)`,
                      }}
                    />
                  </div>

                  {/* Length/Spread */}
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                      Спектр: {rainbowLength}%
                    </label>
                    <input
                      type="range" min="50" max="1000" step="50"
                      value={rainbowLength}
                      onChange={(e) => setRainbowLength(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--theme-surface-secondary)',
                        background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${((rainbowLength - 50) / 950) * 100}%, var(--theme-border) ${((rainbowLength - 50) / 950) * 100}%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

