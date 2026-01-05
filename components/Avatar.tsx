import React, { useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';

interface AvatarProps {
  photoURL?: string | null;
  nickname: string;
  size?: number;
}

const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return '?';

  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

export function Avatar({ photoURL, nickname, size = 40 }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const showImage = photoURL && !imageError;
  const backgroundColor = getAvatarColor(nickname);
  const initials = getInitials(nickname);
  const fontSize = size * 0.4;

  if (showImage) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E0E0E0',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
