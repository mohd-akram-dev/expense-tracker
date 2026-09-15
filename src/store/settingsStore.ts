import { create } from 'zustand';

import * as settingsRepo from '@/db/repositories/settingsRepo';

import type { CurrencyCode } from '@/domain/money';
import type { AppSettings, ThemePreference } from '@/db/repositories/settingsRepo';

const DEFAULTS: AppSettings = {
  currency: 'INR',
  theme: 'system',
  diaryLockEnabled: false,
  onboarded: false,
};

type SettingsState = AppSettings & {
  /** false until the first read from SQLite lands */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  setDiaryLockEnabled: (enabled: boolean) => Promise<void>;
  setOnboarded: (done: boolean) => Promise<void>;
};

/**
 * Settings live in SQLite but are read on every render, so the store keeps an
 * in-memory copy. Writes apply to memory first and persist after — the toggle
 * moves under the user's finger without waiting on a disk round-trip.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const settings = await settingsRepo.loadAppSettings();
    set({ ...settings, hydrated: true });
  },

  setTheme: async (theme) => {
    set({ theme });
    await settingsRepo.setTheme(theme);
  },

  setCurrency: async (currency) => {
    set({ currency });
    await settingsRepo.setCurrency(currency);
  },

  setDiaryLockEnabled: async (diaryLockEnabled) => {
    set({ diaryLockEnabled });
    await settingsRepo.setDiaryLockEnabled(diaryLockEnabled);
  },

  setOnboarded: async (onboarded) => {
    set({ onboarded });
    await settingsRepo.setOnboarded(onboarded);
  },
}));

/** Selector helpers — keep components subscribed to one field, not the whole object. */
export const useThemePreference = () => useSettingsStore((state) => state.theme);
export const useCurrencyCode = () => useSettingsStore((state) => state.currency);
