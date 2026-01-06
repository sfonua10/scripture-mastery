/**
 * Spacing Scale
 *
 * A consistent spacing system based on an 8-point grid.
 * Use these values for margins, padding, and gaps throughout the app.
 *
 * Usage:
 * import { Spacing } from '@/constants/Spacing';
 *
 * <View style={{ padding: Spacing.base, marginBottom: Spacing.lg }} />
 */

export const Spacing = {
  /** 4px - Minimal spacing for tight elements */
  xs: 4,
  /** 8px - Small spacing for related elements */
  sm: 8,
  /** 12px - Medium spacing for compact layouts */
  md: 12,
  /** 16px - Base unit, default spacing */
  base: 16,
  /** 24px - Large spacing for section separation */
  lg: 24,
  /** 32px - Extra large spacing for major sections */
  xl: 32,
  /** 48px - Maximum spacing for screen-level separation */
  xxl: 48,
} as const;

/**
 * Semantic spacing aliases for common use cases
 */
export const SemanticSpacing = {
  /** Standard horizontal padding for screens */
  screenPaddingHorizontal: Spacing.base,
  /** Standard vertical padding for screens */
  screenPaddingVertical: Spacing.lg,
  /** Gap between cards in a list */
  cardGap: Spacing.md,
  /** Internal padding for cards */
  cardPadding: Spacing.base,
  /** Gap between form elements */
  formGap: Spacing.md,
  /** Gap between inline elements */
  inlineGap: Spacing.sm,
  /** Space between icon and text */
  iconTextGap: Spacing.sm,
  /** Space between section header and content */
  sectionHeaderGap: Spacing.md,
} as const;

export type SpacingKey = keyof typeof Spacing;
export type SemanticSpacingKey = keyof typeof SemanticSpacing;
