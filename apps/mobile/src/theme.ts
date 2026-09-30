import { useColorScheme } from 'react-native';

const light = {
  background: '#f7f5f0',
  surface: '#ffffff',
  text: '#1c1b18',
  muted: '#6b6860',
  border: '#e2ded3',
  primary: '#8a6d2f',
  onPrimary: '#ffffff',
  danger: '#b3261e',
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
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 } as const;

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}
