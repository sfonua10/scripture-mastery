import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import { Colors } from "@/constants/Colors";

/**
 * Props for the AnimatedInput component
 */
export interface AnimatedInputProps {
  /** Current input value */
  value: string;
  /** Callback when text changes */
  onChangeText: (text: string) => void;
  /** Placeholder text displayed when input is empty */
  placeholder: string;
  /** Theme colors object */
  colors: typeof Colors.light;
  /** Current color scheme for conditional styling */
  colorScheme: "light" | "dark";
  /** Callback when user submits via keyboard */
  onSubmitEditing: () => void;
  /** Ref to the underlying TextInput for focus management */
  inputRef: React.RefObject<TextInput>;
  /** When true, triggers a shake animation (e.g., for incorrect answers) */
  shouldShake: boolean;
  /** Callback invoked after shake animation completes */
  onShakeComplete: () => void;
}

/**
 * An animated text input with focus glow effect and shake animation.
 *
 * Features:
 * - Animated border width and glow on focus
 * - Shake animation for incorrect answer feedback
 * - Theme-aware styling
 * - Teal accent color matching the app's button variant
 *
 * @example
 * ```tsx
 * <AnimatedInput
 *   value={guess}
 *   onChangeText={setGuess}
 *   placeholder="Enter book name"
 *   colors={colors}
 *   colorScheme="dark"
 *   onSubmitEditing={handleSubmit}
 *   inputRef={inputRef}
 *   shouldShake={isIncorrect}
 *   onShakeComplete={() => setIsIncorrect(false)}
 * />
 * ```
 */
export function AnimatedInput({
  value,
  onChangeText,
  placeholder,
  colors,
  colorScheme,
  onSubmitEditing,
  inputRef,
  shouldShake,
  onShakeComplete,
}: AnimatedInputProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const borderWidth = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      borderWidth.value = withTiming(2, { duration: 150 });
      glowOpacity.value = withTiming(1, { duration: 150 });
    } else {
      borderWidth.value = withTiming(1, { duration: 150 });
      glowOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isFocused, borderWidth, glowOpacity]);

  useEffect(() => {
    if (shouldShake) {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      // Notify parent that shake is complete
      setTimeout(onShakeComplete, 300);
    }
  }, [shouldShake, translateX, onShakeComplete]);

  // Teal focus color to match the teal button variant
  const tealFocusColor = colorScheme === "dark" ? "#1a7e7e" : "#0a9ea4";

  const inputContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    borderWidth: borderWidth.value,
    borderColor: isFocused ? tealFocusColor : colors.border,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.inputWrapper}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.inputGlow,
          {
            backgroundColor: tealFocusColor,
            shadowColor: tealFocusColor,
          },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.animatedInputContainer,
          inputContainerStyle,
          { backgroundColor: colors.background },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.guessInputInner, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colorScheme === "dark" ? "#666" : "#888"}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="words"
          returnKeyType="go"
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel="Enter your scripture reference guess"
          accessibilityHint={placeholder}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  inputGlow: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 0,
  },
  animatedInputContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  guessInputInner: {
    width: "100%",
    padding: 15,
    fontSize: 16,
    letterSpacing: 0,
  },
});

export default AnimatedInput;
