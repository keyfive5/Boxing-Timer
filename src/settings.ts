import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  rounds: number;
  roundSec: number;
  restSec: number;
  prepSec: number;
  soundOn: boolean;
  vibrateOn: boolean;
}

export const DEFAULTS: Settings = {
  rounds: 12,
  roundSec: 180,
  restSec: 60,
  prepSec: 10,
  soundOn: true,
  vibrateOn: true,
};

export interface Preset {
  name: string;
  rounds: number;
  roundSec: number;
  restSec: number;
}

export const PRESETS: Preset[] = [
  { name: 'BOXING', rounds: 12, roundSec: 180, restSec: 60 },
  { name: 'AMATEUR', rounds: 3, roundSec: 180, restSec: 60 },
  { name: 'MMA', rounds: 5, roundSec: 300, restSec: 60 },
  { name: 'HIIT', rounds: 8, roundSec: 30, restSec: 15 },
];

const KEY = 'boxing-timer-settings-v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings): void {
  AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}

export function fmtTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function workoutTotalSec(s: Settings): number {
  return s.prepSec + s.rounds * s.roundSec + Math.max(0, s.rounds - 1) * s.restSec;
}
