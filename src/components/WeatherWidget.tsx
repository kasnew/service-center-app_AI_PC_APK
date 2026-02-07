import React, { useState, useEffect, useRef } from 'react';
import { Cloud, CloudRain, CloudLightning, Sun, Wind, MapPin, Settings, RefreshCw, X, Search, Ghost, Trash2, Navigation, Lock, Unlock, MoveHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../contexts/ThemeContext';

interface ForecastDay {
    date: string;
    dayName: string;
    temp: number;
    condition: string;
    icon: React.ReactNode;
    code: number;
}

interface WeatherData {
    temp: number;
    condition: string;
    location: string;
    icon: React.ReactNode;
    windSpeed: number;
    forecast: ForecastDay[];
}

export const WeatherWidget: React.FC = () => {
    const {
        currentTheme,
        weatherXOffset, setWeatherXOffset,
        weatherYOffset, setWeatherYOffset,
        weatherOpacity, setWeatherOpacity,
        weatherIsLocked, setWeatherIsLocked,
        weatherAutoTheme, setWeatherAutoTheme,
        updateWeatherTheme,
        matrixEnabled
    } = useTheme();
    const isLight = currentTheme.type === 'light';

    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [manualLocation, setManualLocation] = useState('');
    const [savedLocation, setSavedLocation] = useState(() => localStorage.getItem('weather_location') || 'auto');
    const [recentCities, setRecentCities] = useState<string[]>(() => {
        const saved = localStorage.getItem('weather_recent_cities');
        return saved ? JSON.parse(saved) : [];
    });

    const [showForecast, setShowForecast] = useState(false);
    const [manualMode, setManualMode] = useState(() => localStorage.getItem('weather_manual_mode') === 'true');
    const [manualForecast, setManualForecast] = useState<Omit<ForecastDay, 'icon' | 'dayName'>[]>(() => {
        const saved = localStorage.getItem('weather_manual_data');
        return saved ? JSON.parse(saved) : [];
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const initialOffset = useRef({ x: 0, y: 0 });
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showSettings) {
                setShowSettings(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };

        if (showSettings) {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettings]);

    const fetchWeather = async (location: string) => {
        setLoading(true);
        setError(null);
        try {
            let lat: number, lon: number, city: string;

            if (location === 'auto') {
                const ipRes = await fetch('http://ip-api.com/json');
                const ipData = await ipRes.json();
                if (ipData.status === 'success') {
                    lat = ipData.lat;
                    lon = ipData.lon;
                    city = ipData.city;
                } else {
                    throw new Error('Failed to detect location');
                }
            } else {
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=uk&format=json`);
                const geoData = await geoRes.json();
                if (geoData.results && geoData.results.length > 0) {
                    lat = geoData.results[0].latitude;
                    lon = geoData.results[0].longitude;
                    city = geoData.results[0].name;

                    // Update recent cities if it's a manual search and successful
                    setRecentCities(prev => {
                        const filtered = prev.filter(c => c.toLowerCase() !== city.toLowerCase());
                        const updated = [city, ...filtered].slice(0, 5);
                        localStorage.setItem('weather_recent_cities', JSON.stringify(updated));
                        return updated;
                    });
                } else {
                    throw new Error('Локацію не знайдено');
                }
            }

            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&windspeed_unit=ms`);
            const weatherData = await weatherRes.json();

            if (weatherData.current_weather && weatherData.daily) {
                const cw = weatherData.current_weather;
                updateWeatherTheme(cw.weathercode);
                const daily = weatherData.daily;

                const forecast: ForecastDay[] = daily.time.map((dateStr: string, i: number) => {
                    const date = new Date(dateStr);
                    const isToday = i === 0;
                    return {
                        date: dateStr,
                        dayName: isToday ? 'Сьогодні' : new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(date),
                        temp: Math.round(daily.temperature_2m_max[i]),
                        condition: getWeatherCondition(daily.weathercode[i]),
                        icon: getWeatherIcon(daily.weathercode[i], true),
                        code: daily.weathercode[i]
                    };
                });

                setWeather({
                    temp: Math.round(cw.temperature),
                    condition: getWeatherCondition(cw.weathercode),
                    location: city,
                    icon: getWeatherIcon(cw.weathercode),
                    windSpeed: cw.windspeed,
                    forecast: forecast
                });

                if (manualForecast.length === 0) {
                    const initialManual = forecast.slice(0, 5).map(f => ({
                        date: f.date,
                        temp: f.temp,
                        condition: f.condition,
                        code: f.code
                    }));
                    setManualForecast(initialManual);
                    localStorage.setItem('weather_manual_data', JSON.stringify(initialManual));
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather(savedLocation);
        const interval = setInterval(() => fetchWeather(savedLocation), 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [savedLocation]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (weatherIsLocked) return;
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        initialOffset.current = { x: weatherXOffset, y: weatherYOffset };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - dragStartPos.current.x;
            const deltaY = moveEvent.clientY - dragStartPos.current.y;
            setWeatherXOffset(initialOffset.current.x + deltaX);
            setWeatherYOffset(initialOffset.current.y + deltaY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleSaveLocation = () => {
        const loc = manualLocation.trim();
        if (!loc) return;
        setSavedLocation(loc);
        localStorage.setItem('weather_location', loc);
        setManualLocation('');
    };

    const handleSelectCity = (city: string) => {
        setSavedLocation(city);
        localStorage.setItem('weather_location', city);
    };

    const handleRemoveCity = (e: React.MouseEvent, city: string) => {
        e.stopPropagation();
        const updated = recentCities.filter(c => c !== city);
        setRecentCities(updated);
        localStorage.setItem('weather_recent_cities', JSON.stringify(updated));
    };

    const handleSetAuto = () => {
        setSavedLocation('auto');
        localStorage.setItem('weather_location', 'auto');
    };

    const handleUpdateManualDay = (index: number, field: string, value: any) => {
        const newForecast = [...manualForecast];
        newForecast[index] = { ...newForecast[index], [field]: value };
        setManualForecast(newForecast);
        localStorage.setItem('weather_manual_data', JSON.stringify(newForecast));
    };

    const toggleManualMode = () => {
        const next = !manualMode;
        setManualMode(next);
        localStorage.setItem('weather_manual_mode', String(next));
    };

    const getWeatherIcon = (code: number, small = false) => {
        const size = small ? "w-4 h-4" : "w-6 h-6";
        if (code === 0) return <Sun className={clsx(size, "text-yellow-400")} />;
        if (code >= 1 && code <= 3) return <Cloud className={clsx(size, "text-slate-400")} />;
        if (code >= 51 && code <= 67) return <CloudRain className={clsx(size, "text-blue-400")} />;
        if (code >= 95) return <CloudLightning className={clsx(size, "text-purple-400")} />;
        return <Cloud className={clsx(size, "text-slate-400")} />;
    };

    const getWeatherCondition = (code: number) => {
        if (code === 0) return 'Ясно';
        if (code >= 1 && code <= 3) return 'Хмарно';
        if (code >= 51 && code <= 67) return 'Дощ';
        if (code >= 95) return 'Гроза';
        return 'Мінлива хмарність';
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            style={{
                opacity: weatherOpacity / 100,
                backgroundColor: 'var(--theme-surface)',
                borderColor: (matrixEnabled && !isLight) ? '#00ff41' : 'var(--theme-border)',
                color: 'var(--theme-text)',
                boxShadow: (matrixEnabled && !isLight) ? '0 0 15px rgba(0, 255, 65, 0.2)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                transform: `translate(${weatherXOffset}px, ${weatherYOffset}px)`,
                cursor: weatherIsLocked ? 'default' : (isDragging ? 'grabbing' : 'grab')
            }}
            className={clsx(
                "relative flex flex-col rounded-lg border transition-all duration-300 min-w-[200px] select-none backdrop-blur-md",
                (isDragging || showSettings) && "!z-[100] ring-2 ring-blue-500/50",
                "rainbow-groupbox"
            )}
        >
            <div className="flex items-center gap-4 px-4 py-2 cursor-pointer" onClick={() => { setShowForecast(!showForecast); setShowSettings(false); }}>
                {loading && !weather ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                        <span className="truncate max-w-[100px]">{error}</span>
                        <button onClick={(e) => { e.stopPropagation(); fetchWeather(savedLocation); }}><RefreshCw className="w-3 h-3" /></button>
                    </div>
                ) : weather ? (
                    <>
                        <div className="flex items-center gap-2 pointer-events-none">
                            {weather.icon}
                            <div className="flex flex-col">
                                <span className="text-lg font-bold leading-none">{weather.temp}°C</span>
                                <span className="text-[10px] opacity-70 leading-none">{weather.condition}</span>
                            </div>
                        </div>

                        <div className="h-8 w-px opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--theme-text)' }} />

                        <div className="flex flex-col flex-1 min-w-0 pointer-events-none">
                            <div className="flex items-center gap-1 opacity-80">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="text-xs font-medium truncate">{weather.location}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-60">
                                <Wind className="w-3 h-3 flex-shrink-0" />
                                <span className="text-[10px]">{weather.windSpeed} м/с</span>
                            </div>
                        </div>
                    </>
                ) : null}

                <div className="flex flex-col gap-1 pr-1">
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setShowForecast(false); }}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors"
                    >
                        <Settings className="w-4 h-4 opacity-50 hover:opacity-100" />
                    </button>
                    {!weatherIsLocked && (
                        <MoveHorizontal className="w-3 h-3 opacity-20 mx-auto" strokeWidth={3} />
                    )}
                </div>
            </div>

            {showForecast && weather && (
                <div
                    style={{
                        backgroundColor: 'var(--theme-surface)',
                        borderColor: (matrixEnabled && !isLight) ? '#00ff41' : 'var(--theme-border)',
                        color: 'var(--theme-text)',
                        boxShadow: (matrixEnabled && !isLight) ? '0 10px 30px rgba(0, 255, 65, 0.3)' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                    className="absolute top-full left-0 right-0 mt-2 px-4 pb-3 border rounded-lg z-[105] animate-in fade-in slide-in-from-top-2 backdrop-blur-xl"
                >
                    <div className="grid grid-cols-5 gap-2 pt-3">
                        {(manualMode ? manualForecast : weather.forecast.slice(1, 6)).map((day, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <span className="text-[9px] uppercase opacity-50 font-bold">
                                    {manualMode ? (i === 0 ? 'Завтра' : i === 1 ? 'Післязавтра' : '...') : weather.forecast[i + 1]?.dayName}
                                </span>
                                {manualMode ? getWeatherIcon(day.code, true) : weather.forecast[i + 1]?.icon}
                                <span className="text-xs font-bold">{day.temp}°</span>
                                <span className="text-[8px] opacity-60 truncate w-full text-center">{day.condition}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showSettings && (
                <div
                    ref={settingsRef}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: 'var(--theme-surface)',
                        borderColor: (matrixEnabled && !isLight) ? '#00ff41' : 'var(--theme-border)',
                        color: 'var(--theme-text)',
                        boxShadow: (matrixEnabled && !isLight) ? '0 0 20px rgba(0, 255, 65, 0.4)' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                    className={clsx(
                        "absolute top-full left-1/2 -translate-x-1/2 mt-2 p-4 rounded-lg border z-[110] w-72 animate-in fade-in slide-in-from-top-2 backdrop-blur-xl"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold">Налаштування віджета</h4>
                        <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 hover:text-red-400" /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Пошук міста</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40" />
                                    <input
                                        type="text"
                                        value={manualLocation}
                                        onChange={(e) => setManualLocation(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLocation()}
                                        placeholder="Введіть назву..."
                                        style={{ backgroundColor: 'var(--theme-surface-secondary)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                                        className="w-full border rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveLocation}
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                    className="text-white px-3 py-1 rounded transition-opacity hover:opacity-90 font-bold text-xs"
                                >
                                    Пошук
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Останні міста</label>
                                <button
                                    onClick={handleSetAuto}
                                    className={clsx(
                                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all border",
                                        savedLocation === 'auto'
                                            ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                                            : "opacity-60 hover:opacity-100 border-transparent"
                                    )}
                                    style={savedLocation !== 'auto' ? { backgroundColor: 'var(--theme-surface-secondary)' } : {}}
                                >
                                    <Navigation className="w-2.5 h-2.5" />
                                    Авто
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {recentCities.length === 0 && savedLocation !== 'auto' && (
                                    <span className="text-[10px] opacity-40 italic">Список порожній</span>
                                )}
                                {recentCities.map((city) => (
                                    <div
                                        key={city}
                                        onClick={() => handleSelectCity(city)}
                                        className={clsx(
                                            "group flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-all border",
                                            savedLocation === city
                                                ? "ring-1 ring-blue-500 border-blue-500 font-bold"
                                                : "opacity-70 hover:opacity-100"
                                        )}
                                        style={{
                                            backgroundColor: savedLocation === city ? 'var(--theme-primary-hover)' : 'var(--theme-surface-secondary)',
                                            borderColor: 'var(--theme-border)',
                                            color: savedLocation === city ? '#fff' : 'var(--theme-text)'
                                        }}
                                    >
                                        <span>{city}</span>
                                        <button
                                            onClick={(e) => handleRemoveCity(e, city)}
                                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                        >
                                            <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Opacity */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                                            <Ghost className="w-3 h-3" />
                                            Прозорість
                                        </label>
                                        <span className="text-[10px] font-mono">{weatherOpacity}%</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="100" step="5"
                                        value={weatherOpacity}
                                        onChange={(e) => setWeatherOpacity(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Lock */}
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5 block">Закріпити</label>
                                    <button
                                        onClick={() => setWeatherIsLocked(!weatherIsLocked)}
                                        className={clsx(
                                            "flex items-center justify-center gap-2 py-1.5 rounded border text-xs font-medium transition-all shadow-sm",
                                            weatherIsLocked
                                                ? "bg-amber-500/10 border-amber-500/50 text-amber-500"
                                                : "bg-blue-500/10 border-blue-500/50 text-blue-500"
                                        )}
                                    >
                                        {weatherIsLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        {weatherIsLocked ? 'ТАК' : 'НІ'}
                                    </button>
                                </div>
                            </div>

                            {/* Auto-theme */}
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5 block">Автотема</label>
                                <button
                                    onClick={() => setWeatherAutoTheme(!weatherAutoTheme)}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 py-1.5 rounded border text-xs font-bold transition-all shadow-sm",
                                        weatherAutoTheme
                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                            : "opacity-50 hover:opacity-100"
                                    )}
                                    style={!weatherAutoTheme ? { backgroundColor: 'var(--theme-surface-secondary)', borderColor: 'var(--theme-border)' } : {}}
                                >
                                    <RefreshCw className={clsx("w-3 h-3", weatherAutoTheme && "animate-spin-slow")} />
                                    {weatherAutoTheme ? 'АВТОТEМА: УВІМК' : 'АВТОТEМА: ВИМК'}
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setWeatherXOffset(0);
                                    setWeatherYOffset(0);
                                    setWeatherOpacity(100);
                                    setWeatherIsLocked(false);
                                    setManualLocation('');
                                    setManualMode(false);
                                    setSavedLocation('auto');
                                    setRecentCities([]);
                                    localStorage.removeItem('weather_location');
                                    localStorage.removeItem('weather_recent_cities');
                                    localStorage.removeItem('weather_manual_mode');
                                }}
                                className="w-full py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-400/10 rounded transition-colors border border-red-500/20 uppercase tracking-widest"
                            >
                                Скинути все
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 mt-4 border-t opacity-80" style={{ borderColor: 'var(--theme-border)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Режим редагування</label>
                            <button
                                onClick={toggleManualMode}
                                className={clsx(
                                    "px-2 py-0.5 rounded text-[9px] font-bold",
                                    manualMode ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-400"
                                )}
                            >
                                {manualMode ? 'MANUAL' : 'AUTO'}
                            </button>
                        </div>

                        {manualMode && (
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                {manualForecast.map((day, i) => (
                                    <div key={i} className="p-2 rounded bg-slate-700/30 border border-slate-600/30 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold opacity-50 uppercase">День {i + 1}</span>
                                            <div className="flex gap-1">
                                                {[0, 2, 61, 95].map(code => (
                                                    <button
                                                        key={code}
                                                        onClick={() => {
                                                            handleUpdateManualDay(i, 'code', code);
                                                            handleUpdateManualDay(i, 'condition', getWeatherCondition(code));
                                                        }}
                                                        className={clsx(
                                                            "p-0.5 rounded transition-all",
                                                            day.code === code ? "bg-blue-500/50 scale-110" : "hover:bg-slate-600"
                                                        )}
                                                    >
                                                        {getWeatherIcon(code, true)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[8px] opacity-50 block">Темп.</label>
                                                <input
                                                    type="number"
                                                    value={day.temp}
                                                    onChange={(e) => handleUpdateManualDay(i, 'temp', parseInt(e.target.value))}
                                                    className="w-full bg-slate-800 border-none rounded px-1.5 py-0.5 text-xs outline-none"
                                                />
                                            </div>
                                            <div className="flex-[2]">
                                                <label className="text-[8px] opacity-50 block">Стан</label>
                                                <input
                                                    type="text"
                                                    value={day.condition}
                                                    onChange={(e) => handleUpdateManualDay(i, 'condition', e.target.value)}
                                                    className="w-full bg-slate-800 border-none rounded px-1.5 py-0.5 text-xs outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div >
            )}
        </div >
    );
};
