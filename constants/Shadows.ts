/**
 * Shadow Presets
 *
 * Theme-aware shadow styles for creating depth and elevation.
 * Shadows are subtler in dark mode to maintain visual hierarchy
 * without appearing harsh against dark backgrounds.
 *
 * Usage:
 * import { getShadow, Shadows } from '@/constants/Shadows';
 *
 * // Using the hook-friendly getter
 * const shadow = getShadow('medium', effectiveColorScheme);
 *
 * // Or use presets directly
 * <View style={[styles.card, Shadows.light.medium]} />
 */

import { Platform, ViewStyle } from 'react-native';

type ColorScheme = 'light' | 'dark';

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/**
 * Shadow presets for light mode
 * Uses darker shadows that are clearly visible against light backgrounds
 */
const lightShadows = {
  /** Subtle shadow for minimal elevation - cards at rest */
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  } as ShadowStyle,

  /** Medium shadow for interactive elements - buttons, hovering cards */
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  } as ShadowStyle,

  /** Elevated shadow for prominent elements - modals, floating actions */
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  } as ShadowStyle,

  /** Strong shadow for popovers, tooltips, dropdowns */
  strong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  } as ShadowStyle,
};

/**
 * Shadow presets for dark mode
 * Uses very subtle shadows since dark surfaces naturally appear elevated
 * Shadows in dark mode serve more as a "glow" or soft edge
 */
const darkShadows = {
  /** Subtle shadow - barely visible, just adds slight depth */
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  } as ShadowStyle,

  /** Medium shadow - slight lift effect */
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  } as ShadowStyle,

  /** Elevated shadow - clear separation from background */
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  } as ShadowStyle,

  /** Strong shadow - maximum elevation */
  strong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  } as ShadowStyle,
};

/**
 * Combined shadow presets by theme
 */
export const Shadows = {
  light: lightShadows,
  dark: darkShadows,
} as const;

export type ShadowLevel = keyof typeof lightShadows;

/**
 * Get a shadow style for the current theme
 *
 * @param level - The shadow intensity level
 * @param colorScheme - Current color scheme ('light' or 'dark')
 * @returns Shadow style object
 *
 * @example
 * const { effectiveColorScheme } = useTheme();
 * const cardShadow = getShadow('medium', effectiveColorScheme);
 */
export function getShadow(level: ShadowLevel, colorScheme: ColorScheme): ShadowStyle {
  return Shadows[colorScheme][level];
}

/**
 * Create a custom shadow with theme awareness
 *
 * @param options - Shadow configuration
 * @param colorScheme - Current color scheme
 * @returns Platform-appropriate shadow style
 */
export function createShadow(
  options: {
    offsetY?: number;
    opacity?: number;
    radius?: number;
    elevation?: number;
  },
  colorScheme: ColorScheme
): ShadowStyle {
  const {
    offsetY = 2,
    opacity = colorScheme === 'light' ? 0.08 : 0.4,
    radius = 4,
    elevation = 3,
  } = options;

  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

/**
 * No shadow - useful for removing shadows in certain states
 */
export const noShadow: ShadowStyle = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};
