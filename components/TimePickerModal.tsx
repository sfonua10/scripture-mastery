import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { BaseModal } from '@/components/BaseModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ... 55
const PERIODS = ['AM', 'PM'];
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;

interface PickerColumnProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  colors: typeof Colors.light;
  formatItem?: (item: string | number) => string;
}

function PickerColumn({ items, selectedIndex, onSelect, colors, formatItem }: PickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, []);

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < items.length && index !== selectedIndex) {
      onSelect(index);
      Haptics.selectionAsync();
    }
  };

  return (
    <View style={styles.pickerColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.pickerContent}
      >
        {/* Top padding for centering */}
        <View style={{ height: ITEM_HEIGHT }} />
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={index}
              style={styles.pickerItem}
              onPress={() => {
                onSelect(index);
                scrollRef.current?.scrollTo({
                  y: index * ITEM_HEIGHT,
                  animated: true,
                });
                Haptics.selectionAsync();
              }}
            >
              <ThemedText
                style={[
                  styles.pickerItemText,
                  isSelected && { color: colors.tint, fontWeight: '700' },
                  !isSelected && { opacity: 0.4 },
                ]}
              >
                {formatItem ? formatItem(item) : String(item)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
        {/* Bottom padding for centering */}
        <View style={{ height: ITEM_HEIGHT }} />
      </ScrollView>
      {/* Selection indicator */}
      <View pointerEvents="none" style={styles.selectionIndicatorContainer}>
        <View style={[styles.selectionIndicator, { backgroundColor: colors.tint + '20' }]} />
      </View>
    </View>
  );
}

export function TimePickerModal({
  visible,
  onClose,
  onConfirm,
  initialHour = 8,
  initialMinute = 0,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Convert 24-hour to 12-hour format
  const initialPeriod = initialHour >= 12 ? 1 : 0;
  const initial12Hour = initialHour % 12 || 12;

  const [selectedHourIndex, setSelectedHourIndex] = useState(HOURS.indexOf(initial12Hour));
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(
    Math.round(initialMinute / 5)
  );
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(initialPeriod);

  // Reset values when modal opens
  useEffect(() => {
    if (visible) {
      const period = initialHour >= 12 ? 1 : 0;
      const hour12 = initialHour % 12 || 12;
      setSelectedHourIndex(HOURS.indexOf(hour12));
      setSelectedMinuteIndex(Math.round(initialMinute / 5));
      setSelectedPeriodIndex(period);
    }
  }, [visible, initialHour, initialMinute]);

  const handleConfirm = () => {
    const hour12 = HOURS[selectedHourIndex];
    const minute = MINUTES[selectedMinuteIndex];
    const isPM = selectedPeriodIndex === 1;

    // Convert to 24-hour format
    let hour24 = hour12;
    if (isPM && hour12 !== 12) {
      hour24 = hour12 + 12;
    } else if (!isPM && hour12 === 12) {
      hour24 = 0;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(hour24, minute);
    onClose();
  };

  const formatMinute = (value: string | number) => {
    return String(value).padStart(2, '0');
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      showCloseButton
      animationType="smooth"
      testID="time-picker-modal"
      accessibilityLabel="Select reminder time"
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="time-outline"
            size={56}
            color={colors.tint}
          />
        </View>

        <ThemedText style={styles.title} accessibilityRole="header">
          Reminder Time
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          When would you like to be reminded?
        </ThemedText>

        {/* Time Picker */}
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <PickerColumn
            items={HOURS}
            selectedIndex={selectedHourIndex}
            onSelect={setSelectedHourIndex}
            colors={colors}
          />
          <ThemedText style={styles.pickerSeparator}>:</ThemedText>
          <PickerColumn
            items={MINUTES}
            selectedIndex={selectedMinuteIndex}
            onSelect={setSelectedMinuteIndex}
            colors={colors}
            formatItem={formatMinute}
          />
          <PickerColumn
            items={PERIODS}
            selectedIndex={selectedPeriodIndex}
            onSelect={setSelectedPeriodIndex}
            colors={colors}
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmButtonContainer}
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel="Confirm time selection"
        >
          <LinearGradient
            colors={
              colorScheme === 'dark'
                ? ['#1a7e7e', '#0a5e5e']
                : ['#0a9ea4', '#087d7a']
            }
            style={styles.confirmButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.confirmButtonText}>Set Time</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 8,
    marginBottom: 24,
  },
  pickerColumn: {
    width: 60,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
  },
  pickerContent: {
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 22,
    fontWeight: '500',
  },
  pickerSeparator: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  selectionIndicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    height: ITEM_HEIGHT,
    width: '100%',
    borderRadius: 8,
  },
  confirmButtonContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButton: {
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
