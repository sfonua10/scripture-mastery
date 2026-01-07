/**
 * Color System
 *
 * A comprehensive color palette for the Scripture Mastery app.
 * Colors are organized by theme (light/dark) and include:
 * - Base colors: primary UI colors
 * - Semantic colors: purpose-driven colors (success, error, etc.)
 * - Surface colors: layered backgrounds for depth
 * - Text colors: hierarchical text styles
 *
 * Usage:
 * import { Colors } from '@/constants/Colors';
 *
 * const { effectiveColorScheme } = useTheme();
 * const colors = Colors[effectiveColorScheme];
 *
 * <View style={{ backgroundColor: colors.surface }} />
 */

// Brand Colors
const tintColorLight = '#b45309'; // warm amber - primary brand color
const tintColorDark = '#f59e0b'; // golden amber - brighter for dark mode

// Accent Colors (for variety in UI)
const accentAmber = {
  light: '#f59e0b',
  dark: '#fbbf24',
};

const accentBlue = {
  light: '#3b82f6',
  dark: '#60a5fa',
};

export const Colors = {
  light: {
    // Base Colors
    text: '#11181C',
    background: '#fffdfb',  // Warm off-white for cohesive feel
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#fdfaf7',  // Warm cream
    border: '#e0e0e0',
    buttonText: '#ffffff',

    // Semantic Colors - Feedback States
    success: '#4CAF50',
    successLight: '#E8F5E9',
    error: '#F44336',
    errorLight: '#FFEBEE',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    info: '#2196F3',
    infoLight: '#E3F2FD',

    // Surface Colors - Layered Backgrounds
    /** Base background color */
    surface: '#fffdfb',  // Warm off-white
    /** Slightly elevated surface (cards, list items) */
    surfaceElevated: '#fdfaf7',  // Warm cream
    /** Secondary elevated surface (nested cards, modals) */
    surfaceSecondary: '#f3f4f6',
    /** Tertiary surface for subtle containers */
    surfaceTertiary: '#e5e7eb',
    /** Overlay background for modals/sheets */
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Text Colors - Typography Hierarchy
    /** Primary text - headings, important content */
    textPrimary: '#11181C',
    /** Secondary text - supporting content, labels */
    textSecondary: '#687076',
    /** Tertiary text - hints, placeholders, disabled */
    textTertiary: '#9BA1A6',
    /** Inverted text - text on dark backgrounds */
    textInverse: '#ffffff',
    /** Link text color */
    textLink: tintColorLight,

    // Border & Divider Colors
    /** Standard border color */
    borderDefault: '#e0e0e0',
    /** Subtle divider for lists */
    divider: '#f0f0f0',
    /** Focus ring color */
    borderFocus: tintColorLight,

    // Interactive States
    /** Pressed state overlay */
    pressedOverlay: 'rgba(0, 0, 0, 0.05)',
    /** Disabled state background */
    disabled: '#e5e7eb',
    /** Disabled text color */
    disabledText: '#9BA1A6',

    // Accent Colors
    accent: accentAmber.light,
    accentSecondary: accentBlue.light,

    // Input Colors
    inputBackground: '#fdfaf7',  // Warm cream
    inputBorder: '#e0e0e0',
    inputBorderFocus: tintColorLight,
    inputPlaceholder: '#9BA1A6',
  },

  dark: {
    // Base Colors
    text: '#ECEDEE',
    background: '#121212',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#1E1E1E',
    border: '#333333',
    buttonText: '#ffffff',

    // Semantic Colors - Feedback States
    success: '#66BB6A',
    successLight: '#1B3D1F',
    error: '#EF5350',
    errorLight: '#3D1B1B',
    warning: '#FFB74D',
    warningLight: '#3D2E1B',
    info: '#64B5F6',
    infoLight: '#1B2D3D',

    // Surface Colors - Layered Backgrounds
    /** Base background color */
    surface: '#121212',
    /** Slightly elevated surface (cards, list items) */
    surfaceElevated: '#1E1E1E',
    /** Secondary elevated surface (nested cards, modals) */
    surfaceSecondary: '#252525',
    /** Tertiary surface for subtle containers */
    surfaceTertiary: '#2D2D2D',
    /** Overlay background for modals/sheets */
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Text Colors - Typography Hierarchy
    /** Primary text - headings, important content */
    textPrimary: '#ECEDEE',
    /** Secondary text - supporting content, labels */
    textSecondary: '#9BA1A6',
    /** Tertiary text - hints, placeholders, disabled */
    textTertiary: '#687076',
    /** Inverted text - text on light backgrounds */
    textInverse: '#11181C',
    /** Link text color */
    textLink: tintColorDark,

    // Border & Divider Colors
    /** Standard border color */
    borderDefault: '#333333',
    /** Subtle divider for lists */
    divider: '#252525',
    /** Focus ring color */
    borderFocus: tintColorDark,

    // Interactive States
    /** Pressed state overlay */
    pressedOverlay: 'rgba(255, 255, 255, 0.05)',
    /** Disabled state background */
    disabled: '#2D2D2D',
    /** Disabled text color */
    disabledText: '#687076',

    // Accent Colors
    accent: accentAmber.dark,
    accentSecondary: accentBlue.dark,

    // Input Colors
    inputBackground: '#1E1E1E',
    inputBorder: '#333333',
    inputBorderFocus: tintColorDark,
    inputPlaceholder: '#687076',
  },
};

/**
 * Type definitions for color keys
 */
export type ColorScheme = 'light' | 'dark';
export type ColorKey = keyof typeof Colors.light;

/**
 * Get colors for the current theme
 *
 * @param colorScheme - Current color scheme
 * @returns Color palette for the specified scheme
 */
export function getColors(colorScheme: ColorScheme) {
  return Colors[colorScheme];
}

/**
 * Semantic color mappings for consistent usage patterns
 */
export const SemanticColors = {
  /** Background colors by elevation level */
  backgroundElevation: {
    0: 'surface',
    1: 'surfaceElevated',
    2: 'surfaceSecondary',
    3: 'surfaceTertiary',
  },
  /** Text colors by importance */
  textHierarchy: {
    primary: 'textPrimary',
    secondary: 'textSecondary',
    tertiary: 'textTertiary',
  },
  /** Feedback state colors */
  feedback: {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get color with opacity
 * @param color - Hex color string
 * @param opacity - Opacity value 0-1
 */
export function withOpacity(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Get semantic color based on score performance
 * @param score - Score out of 10
 * @param colorScheme - Current color scheme
 */
export function getScoreColor(
  score: number,
  colorScheme: ColorScheme = 'light'
): string {
  const colors = Colors[colorScheme];

  if (score >= 8) return colors.success;
  if (score >= 5) return colors.warning;
  return colors.error;
}

/**
 * Get shadow style for elevation
 * Optimized for both light and dark modes
 */
export function getShadowStyle(
  elevation: 1 | 2 | 3 | 4,
  colorScheme: ColorScheme = 'light'
) {
  const isDark = colorScheme === 'dark';

  // Shadows are more subtle in dark mode but need more spread
  const baseOpacity = isDark ? 0.4 : 0.1;

  const shadowConfig = {
    1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: baseOpacity,
      shadowRadius: 2,
      elevation: 1,
    },
    2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: baseOpacity * 1.2,
      shadowRadius: 4,
      elevation: 2,
    },
    3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: baseOpacity * 1.5,
      shadowRadius: 8,
      elevation: 4,
    },
    4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: baseOpacity * 2,
      shadowRadius: 16,
      elevation: 8,
    },
  };

  return shadowConfig[elevation];
}
