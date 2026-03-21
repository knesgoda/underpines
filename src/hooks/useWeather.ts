import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useWeather — fetches current weather from Open-Meteo and returns
 * structured data for the CabinScene renderer.
 */

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'under_pines_weather_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const REFETCH_INTERVAL = 15 * 60 * 1000; // 15 minutes

// ─── WMO weather code → condition mapping ───
function mapWeatherCode(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly-cloudy';
  if (code === 3) return 'overcast';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 55) return 'light-rain';
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return 'heavy-rain';
  if (code >= 71 && code <= 75) return 'light-snow';
  if (code >= 85 && code <= 86) return 'heavy-snow';
  if (code === 96) return 'hail';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'clear';
}

function classifyWind(speed: number): string {
  if (speed <= 5) return 'calm';
  if (speed <= 20) return 'light';
  if (speed <= 40) return 'moderate';
  if (speed <= 70) return 'strong';
  return 'extreme';
}

export interface WeatherData {
  weatherCode: number;
  condition: string;
  windSpeed: number;
  windDirection: number;
  windIntensity: string;
  cloudCover: number;
  precipitation: number;
  temperature: number;
  isSnowing: boolean;
  isRaining: boolean;
}

interface UseWeatherReturn extends WeatherData {
  loading: boolean;
  error: string | null;
}

interface CachedWeather {
  lat: number;
  lon: number;
  data: WeatherData;
  ts: number;
}

const DEFAULTS: WeatherData = {
  weatherCode: 0,
  condition: 'clear',
  windSpeed: 0,
  windDirection: 0,
  windIntensity: 'calm',
  cloudCover: 0,
  precipitation: 0,
  temperature: 20,
  isSnowing: false,
  isRaining: false,
};

function loadCache(lat: number, lon: number): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (cached.lat !== lat || cached.lon !== lon) return null;
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function saveCache(lat: number, lon: number, data: WeatherData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, data, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

export const useWeather = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): UseWeatherReturn => {
  const lat = latitude ?? 47.6;
  const lon = longitude ?? -122.3;

  const [data, setData] = useState<WeatherData>(() => loadCache(lat, lon) || DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(false);

  const fetchWeather = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);

    try {
      const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation,rain,snowfall&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      const json = await res.json();
      const c = json.current;

      const weatherCode = c?.weather_code ?? 0;
      const windSpeed = c?.wind_speed_10m ?? 0;
      const snowfall = c?.snowfall ?? 0;
      const rain = c?.rain ?? 0;

      const result: WeatherData = {
        weatherCode,
        condition: mapWeatherCode(weatherCode),
        windSpeed,
        windDirection: c?.wind_direction_10m ?? 0,
        windIntensity: classifyWind(windSpeed),
        cloudCover: c?.cloud_cover ?? 0,
        precipitation: c?.precipitation ?? 0,
        temperature: c?.temperature_2m ?? 20,
        isSnowing: snowfall > 0,
        isRaining: rain > 0,
      };

      setData(result);
      saveCache(lat, lon, result);
      setError(null);
    } catch (err: any) {
      console.warn('[useWeather] fetch failed:', err);
      setError('Failed to fetch weather');
    } finally {
      fetchRef.current = false;
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    const cached = loadCache(lat, lon);
    if (!cached) {
      fetchWeather();
    }
    const timer = setInterval(fetchWeather, REFETCH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchWeather]);

  return { ...data, loading, error };
};

export default useWeather;
