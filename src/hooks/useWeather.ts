import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveLocation } from '@/lib/locationResolver';

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
  unit: 'C' | 'F';
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

const isUSTimezone = (): boolean => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.startsWith('America/') && !tz.includes('Argentina') && !tz.includes('Bogota') && !tz.includes('Lima') && !tz.includes('Santiago') && !tz.includes('Sao_Paulo');
  } catch { return false; }
};

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
  unit: 'C',
};

function loadCache(lat: number, lon: number): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    // Allow small coordinate drift (same general area)
    if (Math.abs(cached.lat - lat) > 0.5 || Math.abs(cached.lon - lon) > 0.5) return null;
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

async function fetchWeatherFromApi(lat: number, lon: number): Promise<WeatherData> {
  const useFahrenheit = isUSTimezone();
  const unitParam = useFahrenheit ? '&temperature_unit=fahrenheit' : '';
  const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation,rain,snowfall&timezone=auto${unitParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();
  const c = json.current;

  const weatherCode = c?.weather_code ?? 0;
  const windSpeed = c?.wind_speed_10m ?? 0;
  const snowfall = c?.snowfall ?? 0;
  const rain = c?.rain ?? 0;

  return {
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
    unit: useFahrenheit ? 'F' : 'C',
  };
}

export const useWeather = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  zipCode?: string | null,
  countryCode?: string | null,
): UseWeatherReturn => {
  const [data, setData] = useState<WeatherData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(false);
  const resolvedCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  // Resolve coordinates: use provided lat/lon, or fall back to zip code lookup
  const resolveCoords = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    // If we have direct coordinates, use them
    if (latitude != null && longitude != null) {
      return { lat: latitude, lon: longitude };
    }

    // If we have a zip code, resolve it
    if (zipCode) {
      try {
        const resolved = await resolveLocation(zipCode, countryCode || 'US');
        if (resolved && resolved.latitude && resolved.longitude) {
          return { lat: resolved.latitude, lon: resolved.longitude };
        }
        console.error('[useWeather] Zip code resolution returned no coordinates for:', zipCode, countryCode);
      } catch (err) {
        console.error('[useWeather] Failed to resolve zip code to coordinates:', zipCode, err);
      }
    }

    // No location data available at all
    if (!latitude && !longitude && !zipCode) {
      console.error('[useWeather] No coordinates or zip code provided — cannot fetch weather');
      return null;
    }

    return null;
  }, [latitude, longitude, zipCode, countryCode]);

  const fetchWeather = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);

    try {
      // Resolve coordinates if not already done
      let coords = resolvedCoordsRef.current;
      if (!coords) {
        coords = await resolveCoords();
        if (!coords) {
          setError('No location available');
          setLoading(false);
          fetchRef.current = false;
          return;
        }
        resolvedCoordsRef.current = coords;
      }

      const { lat, lon } = coords;

      // Check cache (only use if still fresh)
      const cached = loadCache(lat, lon);
      if (cached) {
        setData(cached);
        setError(null);
        setLoading(false);
        fetchRef.current = false;
        return;
      }

      // Fetch fresh from API
      const result = await fetchWeatherFromApi(lat, lon);
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
  }, [resolveCoords]);

  useEffect(() => {
    // Reset resolved coords when inputs change
    resolvedCoordsRef.current = null;
    fetchWeather();
    const timer = setInterval(() => {
      // Force fresh fetch on interval by clearing cache validity
      fetchWeather();
    }, REFETCH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchWeather]);

  return { ...data, loading, error };
};

export default useWeather;
