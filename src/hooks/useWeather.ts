import { useState, useEffect } from 'react';

interface WeatherData {
  weatherCode: number;
  windSpeed: number;
  temperature: number;
  unit: 'C' | 'F';
}

interface UseWeatherReturn extends WeatherData {
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'under_pines_weather_cache';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  lat: number;
  lon: number;
  data: WeatherData;
  timestamp: number;
}

const getCache = (lat: number, lon: number): WeatherData | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (
      cached.lat === lat &&
      cached.lon === lon &&
      Date.now() - cached.timestamp < CACHE_DURATION_MS
    ) {
      return cached.data;
    }
  } catch {
    // ignore
  }
  return null;
};

const setCache = (lat: number, lon: number, data: WeatherData) => {
  try {
    const entry: CachedWeather = { lat, lon, data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
};

const DEFAULTS: WeatherData = { weatherCode: 0, windSpeed: 0, temperature: 20, unit: 'C' };

const isUSTimezone = (): boolean => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.startsWith('America/') && !tz.includes('Argentina') && !tz.includes('Bogota') && !tz.includes('Lima') && !tz.includes('Santiago') && !tz.includes('Sao_Paulo');
  } catch {
    return false;
  }
};

export const useWeather = (latitude: number | null | undefined, longitude: number | null | undefined): UseWeatherReturn => {
  const [data, setData] = useState<WeatherData>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!latitude || !longitude) {
      setData(DEFAULTS);
      return;
    }

    const cached = getCache(latitude, longitude);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,wind_speed_10m,temperature_2m&timezone=auto`
    )
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        const result: WeatherData = {
          weatherCode: json.current?.weather_code ?? 0,
          windSpeed: json.current?.wind_speed_10m ?? 0,
          temperature: json.current?.temperature_2m ?? 20,
        };
        setData(result);
        setCache(latitude, longitude, result);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to fetch weather');
        setData(DEFAULTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [latitude, longitude]);

  return { ...data, loading, error };
};
