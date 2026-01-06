/**
 * Border Radius Tokens
 *
 * Consistent border radius values for rounded corners throughout the app.
 * These values create a cohesive, modern look with soft edges.
 *
 * Usage:
 * import { BorderRadius } from '@/constants/BorderRadius';
 *
 * <View style={{ borderRadius: BorderRadius.md }} />
 */

export const BorderRadius = {
  /** 0px - No rounding (sharp corners) */
  none: 0,
  /** 4px - Minimal rounding for subtle softness */
  xs: 4,
  /** 8px - Small rounding for buttons, inputs, chips */
  sm: 8,
  /** 12px - Medium rounding for cards, modals */
  md: 12,
  /** 16px - Large rounding for prominent cards */
  lg: 16,
  /** 20px - Extra large rounding for feature cards */
  xl: 20,
  /** 24px - Maximum structured rounding */
  xxl: 24,
  /** 9999px - Full rounding for pills, avatars, circular elements */
  full: 9999,
} as const;

/**
 * Semantic border radius aliases for common components
 */
export const SemanticBorderRadius = {
  /** Standard button corner radius */
  button: BorderRadius.md,
  /** Primary action button (more prominent) */
  buttonPrimary: BorderRadius.lg,
  /** Text input fields */
  input: BorderRadius.md,
  /** Standard card containers */
  card: BorderRadius.lg,
  /** Modal and sheet containers */
  modal: BorderRadius.xl,
  /** Bottom sheet handle area */
  bottomSheet: BorderRadius.xxl,
  /** Chip and tag elements */
  chip: BorderRadius.full,
  /** Avatar images */
  avatar: BorderRadius.full,
  /** Badge and indicator dots */
  badge: BorderRadius.full,
  /** Toast notifications */
  toast: BorderRadius.md,
  /** Tooltip containers */
  tooltip: BorderRadius.sm,
} as const;

export type BorderRadiusKey = keyof typeof BorderRadius;
export type SemanticBorderRadiusKey = keyof typeof SemanticBorderRadius;
