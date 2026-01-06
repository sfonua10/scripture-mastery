import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { GradientButton } from '@/components/GradientButton';
import { BaseModal } from '@/components/BaseModal';
import { DailyChallengeBadge } from '@/types/scripture';

interface BadgeEarnedModalProps {
  badge: DailyChallengeBadge | null;
  visible: boolean;
  onDismiss: () => void;
}

export function BadgeEarnedModal({ badge, visible, onDismiss }: BadgeEarnedModalProps) {
  // Animation values for badge unveil
  const badgeScale = useSharedValue(0);
  const badgeRotation = useSharedValue(-10);
  const glowOpacity = useSharedValue(0.4);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    if (visible && badge) {
      // Trigger haptic on open
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animation values
      badgeScale.value = 0;
      badgeRotation.value = -10;
      glowOpacity.value = 0.4;
      textOpacity.value = 0;
      textTranslateY.value = 20;

      // Badge unveil: scale from 0 with overshoot
      badgeScale.value = withDelay(
        200,
        withSpring(1, {
          damping: 8,
          stiffness: 120,
          mass: 0.8,
        })
      );

      // Subtle rotation correction
      badgeRotation.value = withDelay(
        200,
        withSpring(0, {
          damping: 15,
          stiffness: 100,
        })
      );

      // Glow pulse animation (repeating)
      glowOpacity.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1, // Infinite repeat
          true
        )
      );

      // Text fade in and slide up
      textOpacity.value = withDelay(
        400,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      textTranslateY.value = withDelay(
        400,
        withSpring(0, { damping: 15, stiffness: 100 })
      );
    }
  }, [visible, badge]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      {
        scale: interpolate(glowOpacity.value, [0.4, 0.8], [1, 1.15]),
      },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  if (!badge) return null;

  return (
    <BaseModal
      visible={visible}
      onClose={onDismiss}
      animationType="spring"
      testID="badge-earned-modal"
      accessibilityLabel={`Badge earned: ${badge.name}`}
    >
      <View style={styles.content}>
        {/* Badge Icon with Glow */}
        <View style={styles.iconWrapper}>
          {/* Glow effect behind the badge */}
          <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.6)', 'rgba(255, 183, 0, 0)']}
              style={styles.glowGradient}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Badge icon */}
          <Animated.View style={[styles.iconContainer, badgeAnimatedStyle]}>
            <LinearGradient
              colors={['#ffd700', '#ffb700']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={badge.icon as keyof typeof Ionicons.glyphMap}
                size={48}
                color="white"
              />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Text Content */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <ThemedText
            style={styles.congratsText}
            accessibilityRole="header"
          >
            Badge Earned!
          </ThemedText>
          <ThemedText style={styles.badgeName}>{badge.name}</ThemedText>
          <ThemedText style={styles.badgeDescription}>
            {badge.description}
          </ThemedText>
        </Animated.View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <GradientButton
            onPress={onDismiss}
            label="Awesome!"
            variant="primary"
          />
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrapper: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  glowContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  iconContainer: {
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  congratsText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
  },
});
