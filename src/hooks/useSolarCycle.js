import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSolarCycle — fetches sunrise/sunset from Open-Meteo and computes
 * real-time solar position, moon position, and time-of-day classification.
 */

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'solar_cycle_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const UPDATE_INTERVAL = 60 * 1000; // 60s

function loadCache(lat, lng) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.lat !== lat || cached.lng !== lng) return null;
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return { sunrise: new Date(cached.sunrise), sunset: new Date(cached.sunset) };
  } catch { return null; }
}

function saveCache(lat, lng, sunrise, sunset) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      lat, lng, ts: Date.now(),
      sunrise: sunrise.toISOString(),
      sunset: sunset.toISOString(),
    }));
  } catch { /* quota exceeded — ignore */ }
}

function classifyTime(now, sunrise, sunset) {
  const ms = now.getTime();
  const rise = sunrise.getTime();
  const set = sunset.getTime();
  const dayLen = set - rise;
  const solarNoon = rise + dayLen / 2;

  const M = 60 * 1000;
  const preDawnStart = rise - 90 * M;
  const dawnStart = rise - 15 * M;
  const dawnEnd = rise + 15 * M;
  const goldenStart = set - 45 * M;
  const sunsetStart = set - 15 * M;
  const sunsetEnd = set + 15 * M;
  const duskEnd = set + 45 * M;

  // sunPosition: 0 at sunrise, 0.5 at noon, 1 at sunset — null below horizon
  let sunPosition = null;
  if (ms >= rise && ms <= set) {
    sunPosition = (ms - rise) / dayLen;
  }

  // moonPosition: 0–1 arc across the night (sunset → sunrise next day)
  let moonPosition = null;
  const nightLen = 24 * 60 * M - dayLen;
  if (ms > set) {
    moonPosition = (ms - set) / nightLen;
    if (moonPosition > 1) moonPosition = null;
  } else if (ms < rise) {
    // We're in the tail end of last night's arc
    const prevSunset = set - 24 * 60 * M;
    const prevNightLen = nightLen;
    moonPosition = (ms - prevSunset) / prevNightLen;
    if (moonPosition < 0 || moonPosition > 1) moonPosition = null;
  }

  // goldenHourProgress: 0 at start, 1 at sunset
  let goldenHourProgress = null;
  if (ms >= goldenStart && ms <= set) {
    goldenHourProgress = (ms - goldenStart) / (set - goldenStart);
  }

  // timeOfDay classification
  let timeOfDay = 'night';
  if (ms >= preDawnStart && ms < dawnStart) timeOfDay = 'pre-dawn';
  else if (ms >= dawnStart && ms < dawnEnd) timeOfDay = 'dawn';
  else if (ms >= dawnEnd && ms < solarNoon) timeOfDay = 'morning';
  else if (ms >= solarNoon && ms < goldenStart) timeOfDay = 'afternoon';
  else if (ms >= goldenStart && ms < sunsetStart) timeOfDay = 'golden-hour';
  else if (ms >= sunsetStart && ms < sunsetEnd) timeOfDay = 'sunset';
  else if (ms >= sunsetEnd && ms < duskEnd) timeOfDay = 'dusk';

  const isDaytime = ms >= rise && ms <= set;

  return { sunPosition, moonPosition, timeOfDay, isDaytime, goldenHourProgress };
}

export default function useSolarCycle(latitude = 47.6, longitude = -122.3) {
  const [solarData, setSolarData] = useState(() => {
    const cached = loadCache(latitude, longitude);
    return cached || { sunrise: null, sunset: null };
  });

  const [computed, setComputed] = useState({
    sunPosition: null,
    moonPosition: null,
    timeOfDay: 'morning',
    isDaytime: true,
    goldenHourProgress: null,
  });

  const fetchRef = useRef(false);

  const fetchSolarData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const url = `${API_BASE}?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      const data = await res.json();
      const sunrise = new Date(data.daily.sunrise[0]);
      const sunset = new Date(data.daily.sunset[0]);
      saveCache(latitude, longitude, sunrise, sunset);
      setSolarData({ sunrise, sunset });
    } catch (err) {
      console.warn('[useSolarCycle] fetch failed, using fallback:', err);
      // Fallback: approximate sunrise 6:30 AM, sunset 6:30 PM local
      const today = new Date();
      const fallbackRise = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 30);
      const fallbackSet = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30);
      setSolarData({ sunrise: fallbackRise, sunset: fallbackSet });
    } finally {
      fetchRef.current = false;
    }
  }, [latitude, longitude]);

  // Fetch on mount if no cache
  useEffect(() => {
    if (!solarData.sunrise) fetchSolarData();
    // Refetch every 24h
    const refetchTimer = setInterval(fetchSolarData, CACHE_TTL);
    return () => clearInterval(refetchTimer);
  }, [fetchSolarData, solarData.sunrise]);

  // Recompute every 60s
  useEffect(() => {
    if (!solarData.sunrise || !solarData.sunset) return;

    const update = () => {
      setComputed(classifyTime(new Date(), solarData.sunrise, solarData.sunset));
    };
    update();
    const timer = setInterval(update, UPDATE_INTERVAL);
    return () => clearInterval(timer);
  }, [solarData]);

  return {
    sunrise: solarData.sunrise,
    sunset: solarData.sunset,
    ...computed,
  };
}
