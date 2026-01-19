import React, { useState, useRef } from 'react';
import { useTheme, themes } from '../contexts/ThemeContext';
import { Palette, Image, X, Upload } from 'lucide-react';

export function ThemeSettings() {
  const {
    currentTheme, setTheme: setThemeContext, backgroundImage, setBackgroundImage, backgroundOpacity, setBackgroundOpacity,
    rainbowEnabled, setRainbowEnabled, rainbowSpeed, setRainbowSpeed,
    rainbowBrightness, setRainbowBrightness, rainbowThickness, setRainbowThickness,
    rainbowLength, setRainbowLength, themeBrightness, setThemeBrightness
  } = useTheme();
  const [previewImage, setPreviewImage] = useState<string | null>(backgroundImage);
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [confirmTimer, setConfirmTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image file
    if (!file.type.startsWith('image/')) {
      alert('Будь ласка, оберіть файл зображення');
      return;
    }

    try {
      // Read file as data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewImage(dataUrl);
      };
      reader.readAsDataURL(file);

      // Save image via IPC
      const { ipcRenderer } = window as any;
      if (ipcRenderer) {
        const result = await ipcRenderer.invoke('save-background-image', {
          fileName: file.name,
          fileData: await file.arrayBuffer(),
        });

        if (result.success) {
          setBackgroundImage(result.filePath);
        } else {
          alert(`Помилка збереження зображення: ${result.error}`);
        }
      } else {
        // Fallback for development - use data URL
        setBackgroundImage(URL.createObjectURL(file));
      }
    } catch (error: any) {
      console.error('Error handling image:', error);
      alert(`Помилка: ${error.message}`);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setBackgroundImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  // Sync preview image with context
  React.useEffect(() => {
    if (backgroundImage && !previewImage) {
      setPreviewImage(backgroundImage);
    }
  }, [backgroundImage]);

  return (
    <div className="space-y-6" style={{ color: 'var(--theme-text)' }}>
      {/* Theme Selection */}
      <div
        className="rounded-lg shadow-sm p-6 border"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <h2
          className="text-xl font-semibold mb-4 flex items-center gap-2"
          style={{ color: 'var(--theme-text)' }}
        >
          <Palette className="w-6 h-6" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all
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
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{theme.name}</span>
                {currentTheme.id === theme.id && (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  ></div>
                )}
              </div>
              <div className="flex gap-1 mt-2">
                <div
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.colors.background }}
                ></div>
                <div
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.colors.surface }}
                ></div>
                <div
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.colors.primary }}
                ></div>
              </div>
              <div className="mt-2 text-xs opacity-75">
                {theme.type === 'dark' ? '🌙 Темна' : '☀️ Світла'}
              </div>
            </button>
          ))}
        </div>

        {/* Theme Brightness Slider */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--theme-border)' }}>
          <label
            className="block text-sm font-medium mb-3"
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
            className="flex justify-between text-xs mt-1"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <span>Темніше</span>
            <span>Нормально (100%)</span>
            <span>Світліше</span>
          </div>
          <p className="text-sm mt-3 opacity-70" style={{ color: 'var(--theme-text-secondary)' }}>
            Цей повзунок пропорційно регулює яскравість усіх кольорів обраної теми.
          </p>
        </div>
      </div>

      {/* Background Image */}
      <div
        className="rounded-lg shadow-sm p-6 border"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <h2
          className="text-xl font-semibold mb-4 flex items-center gap-2"
          style={{ color: 'var(--theme-text)' }}
        >
          <Image className="w-6 h-6" />
          Фонове зображення
        </h2>

        <div className="space-y-4">
          {/* Image Preview */}
          {(previewImage || backgroundImage) && (
            <div className="relative">
              <div
                className="relative w-full h-48 rounded-lg overflow-hidden border"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                <img
                  src={previewImage || backgroundImage || ''}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: currentTheme.colors.background,
                    opacity: 1 - backgroundOpacity,
                  }}
                ></div>
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                  title="Видалити зображення"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: currentTheme.type === 'dark' ? '#ffffff' : '#ffffff',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-primary)';
              }}
            >
              <Upload className="w-5 h-5" />
              {previewImage || backgroundImage ? 'Змінити зображення' : 'Обрати зображення'}
            </button>
          </div>

          {/* Opacity Slider */}
          {(previewImage || backgroundImage) && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--theme-text)' }}
              >
                Прозорість фону: {Math.round(backgroundOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={backgroundOpacity}
                onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-surface-secondary)',
                  background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${backgroundOpacity * 100}%, var(--theme-border) ${backgroundOpacity * 100}%)`,
                }}
              />
              <div
                className="flex justify-between text-xs mt-1"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                <span>Прозоро</span>
                <span>Непрозоро</span>
              </div>
            </div>
          )}

          <p
            className="text-sm"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Фонове зображення буде застосовано до всіх сторінок з автоматичною обробкою для збереження читабельності.
          </p>
        </div>
      </div>

      {/* Rainbow RGB Settings */}
      <div
        className="rounded-lg shadow-sm p-6 border rainbow-groupbox"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <h2
          className="text-xl font-semibold mb-4 flex items-center gap-2"
          style={{ color: 'var(--theme-text)' }}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 animate-pulse"></div>
          RGB Переливання (Групбокси)
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--theme-text)' }}>Увімкнути ефект переливу</span>
            <button
              onClick={() => setRainbowEnabled(!rainbowEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
              style={{
                backgroundColor: rainbowEnabled ? 'var(--theme-primary)' : 'var(--theme-border)'
              }}
            >
              <span
                className={`${rainbowEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>

          {rainbowEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Brightness */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  Яскравість (Luminosity): {Math.round(rainbowBrightness * 100)}%
                </label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={rainbowBrightness}
                  onChange={(e) => setRainbowBrightness(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-surface-secondary)',
                    background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${rainbowBrightness * 100}%, var(--theme-border) ${rainbowBrightness * 100}%)`,
                  }}
                />
              </div>

              {/* Speed */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  Швидкість анімації: {rainbowSpeed.toFixed(1)}с
                </label>
                <input
                  type="range" min="0.5" max="20" step="0.5"
                  value={rainbowSpeed}
                  onChange={(e) => setRainbowSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-surface-secondary)',
                    background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${((rainbowSpeed - 0.5) / 19.5) * 100}%, var(--theme-border) ${((rainbowSpeed - 0.5) / 19.5) * 100}%)`,
                  }}
                />
              </div>

              {/* Thickness */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  Товщина рамки: {rainbowThickness}px
                </label>
                <input
                  type="range" min="1" max="15" step="1"
                  value={rainbowThickness}
                  onChange={(e) => setRainbowThickness(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-surface-secondary)',
                    background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${((rainbowThickness - 1) / 14) * 100}%, var(--theme-border) ${((rainbowThickness - 1) / 14) * 100}%)`,
                  }}
                />
              </div>

              {/* Length/Spread */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                  Довжина/Спектр (Spread): {rainbowLength}%
                </label>
                <input
                  type="range" min="50" max="1000" step="50"
                  value={rainbowLength}
                  onChange={(e) => setRainbowLength(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-surface-secondary)',
                    background: `linear-gradient(to right, transparent 0%, var(--theme-primary) ${((rainbowLength - 50) / 950) * 100}%, var(--theme-border) ${((rainbowLength - 50) / 950) * 100}%)`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="text-sm opacity-70" style={{ color: 'var(--theme-text-secondary)' }}>
            Цей ефект додає анімовану райдужну рамку навколо основних блоків керування (groupbox) у редакторі квитанцій та інших сторінках.
          </p>
        </div>
      </div>
    </div>
  );
}

