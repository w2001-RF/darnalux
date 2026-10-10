import { useColorScheme } from 'react-native';
import type { Tone } from '@darnalux/core';

const light = {
  background: '#f7f5f0',
  surface: '#ffffff',
  text: '#1c1b18',
  muted: '#6b6860',
  border: '#e2ded3',
  primary: '#8a6d2f',
  onPrimary: '#ffffff',
  danger: '#b3261e',
  success: '#1e7a46',
  warning: '#a0620a',
  info: '#1d5f8c',
};

const dark: typeof light = {
  background: '#141311',
  surface: '#1f1d1a',
  text: '#f2efe8',
  muted: '#a19d92',
  border: '#34312b',
  primary: '#d4b16a',
  onPrimary: '#141311',
  danger: '#f2b8b5',
  success: '#7fd1a0',
  warning: '#f0c070',
  info: '#8ec5ea',
};

export type Theme = typeof light;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Foreground colour for a status tone; badges draw their background from it at low opacity. */
export function toneColor(theme: Theme, tone: Tone): string {
  switch (tone) {
    case 'success':
      return theme.success;
    case 'warning':
      return theme.warning;
    case 'danger':
      return theme.danger;
    case 'info':
      return theme.info;
    case 'gold':
      return theme.primary;
    default:
      return theme.muted;
  }
}
