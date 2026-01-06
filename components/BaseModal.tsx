import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width: screenWidth } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(screenWidth * 0.85, 340);

// Standardized modal constants
export const MODAL_CONSTANTS = {
  width: MODAL_WIDTH,
  borderRadius: 16,
  padding: 24,
  elevation: 8,
  backdropOpacity: 0.5,
} as const;

export interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  showCloseButton?: boolean;
  width?: number | string;
  /**
   * Animation type for the modal entrance/exit
   * - 'spring': Bouncy spring animation (good for celebratory modals)
   * - 'smooth': Smooth ease animation (good for utility modals)
   */
  animationType?: 'spring' | 'smooth';
  /**
   * Whether to use blur backdrop instead of solid color
   */
  useBlur?: boolean;
  /**
   * Whether to handle keyboard avoidance
   */
  keyboardAvoiding?: boolean;
  /**
   * Test ID for accessibility testing
   */
  testID?: string;
  /**
   * Accessible label for screen readers
   */
  accessibilityLabel?: string;
}

export function BaseModal({
  visible,
  onClose,
  children,
  showCloseButton = false,
  width,
  animationType = 'smooth',
  useBlur = false,
  keyboardAvoiding = false,
  testID,
  accessibilityLabel,
}: BaseModalProps) {
  const colorScheme = useColorScheme() ?? 'light';

  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Check for reduced motion preference
  const [reducedMotion, setReducedMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    return () => subscription.remove();
  }, []);

  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      // Entry animation
      if (reducedMotion) {
        // Skip animation for reduced motion
        scale.value = 1;
        opacity.value = 1;
        backdropOpacity.value = MODAL_CONSTANTS.backdropOpacity;
      } else if (animationType === 'spring') {
        // Spring animation for celebratory modals
        scale.value = withSpring(1, {
          damping: 12,
          stiffness: 180,
          mass: 0.8,
        });
        opacity.value = withTiming(1, { duration: 200 });
        backdropOpacity.value = withTiming(MODAL_CONSTANTS.backdropOpacity, {
          duration: 200,
        });
      } else {
        // Smooth animation for utility modals
        scale.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(MODAL_CONSTANTS.backdropOpacity, {
          duration: 200,
        });
      }
    } else {
      // Exit animation
      if (reducedMotion) {
        scale.value = 0.9;
        opacity.value = 0;
        backdropOpacity.value = 0;
      } else {
        scale.value = withTiming(0.95, {
          duration: 200,
          easing: Easing.in(Easing.cubic),
        });
        opacity.value = withTiming(0, {
          duration: 200,
          easing: Easing.in(Easing.cubic),
        });
        backdropOpacity.value = withTiming(0, { duration: 200 });
      }
    }
  }, [visible, reducedMotion, animationType]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalContent = (
    <View style={styles.overlay}>
      {/* Backdrop */}
      {useBlur ? (
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
          <BlurView
            intensity={20}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            style={[styles.blurBackdrop]}
            activeOpacity={1}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
          />
        </Animated.View>
      ) : (
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </TouchableOpacity>
      )}

      {/* Modal Container */}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: Colors[colorScheme].card,
            width: width || MODAL_CONSTANTS.width,
          },
          modalAnimatedStyle,
        ]}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityViewIsModal={true}
        accessibilityRole="dialog"
      >
        {/* Close Button */}
        {showCloseButton && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme].text}
            />
          </TouchableOpacity>
        )}

        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none" // We handle animation ourselves
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {modalContent}
        </KeyboardAvoidingView>
      ) : (
        modalContent
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 1)', // Full black, opacity controlled by animation
  },
  blurBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    borderRadius: MODAL_CONSTANTS.borderRadius,
    padding: MODAL_CONSTANTS.padding,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: MODAL_CONSTANTS.elevation,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
    // Ensure minimum touch target size of 44x44
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BaseModal;
