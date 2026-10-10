import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useTheme } from '../theme';

// Readable content width on tablets, foldables and resized windows.
export const MAX_CONTENT_WIDTH = 640;

interface ScreenProps {
  children: ReactNode;
  /** Vertically centre the content when it is shorter than the screen. */
  centered?: boolean;
  /** Apply the status bar inset. Leave off under a navigation header. */
  insetTop?: boolean;
  /** Apply the navigation bar inset. Leave off above a tab bar. */
  insetBottom?: boolean;
  /** Enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Edge-to-edge screen shell. Android 16 (API 36) always draws behind the system
 * bars, so every screen must pad itself with the insets it is responsible for.
 * Left and right insets (display cutouts in landscape) are always applied.
 * It scrolls so content stays reachable on short landscape screens and with the keyboard open.
 */
export function Screen({ children, centered = false, insetTop = false, insetBottom = false, onRefresh, refreshing = false, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        centered && styles.centered,
        {
          paddingLeft: spacing.lg + insets.left,
          paddingRight: spacing.lg + insets.right,
          paddingTop: spacing.lg + (insetTop ? insets.top : 0),
          paddingBottom: spacing.lg + (insetBottom ? insets.bottom : 0),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} /> : undefined}
    >
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1 },
  centered: { justifyContent: 'center' },
  inner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
