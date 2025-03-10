import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Linking, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  
  const handleLearnMorePress = () => {
    Linking.openURL('https://www.churchofjesuschrist.org/study/scriptures?lang=eng');
  };
  
  const handleContactPress = async () => {
    const emailUrl = 'mailto:saiafonua@gmail.com?subject=Scripture%20Mastery%20App%20Feedback';
    
    // Check if linking can be opened
    const canOpen = await Linking.canOpenURL(emailUrl);
    
    if (canOpen) {
      // If we can open the email client, do so
      Linking.openURL(emailUrl);
    } else {
      // Fallback to alert if email client can't be opened
      Alert.alert(
        "Contact Information",
        "Please email us at: saiafonua@gmail.com",
        [
          { text: "Copy Email", onPress: () => {
              // Add clipboard functionality if you have a clipboard library
              // Clipboard.setString('saiafonua@gmail.com');
              Alert.alert("Email Copied", "Email address copied to clipboard");
            }
          },
          { text: "OK", style: "default" }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
          },
          headerTintColor: Colors[colorScheme ?? "light"].tint,
          headerShadowVisible: false,
        }}
      />
      
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Resources</ThemedText>
        
        <TouchableOpacity 
          style={[
            styles.settingContainer, 
            { 
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card 
            }
          ]} 
          onPress={handleLearnMorePress}
        >
          <ThemedText style={styles.settingLabel}>Learn More</ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="open-outline" 
              size={20} 
              color={Colors[colorScheme ?? 'light'].tint} 
            />
          </View>
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>About</ThemedText>
        
        <ThemedView 
          style={[
            styles.infoContainer, 
            { 
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card 
            }
          ]}
        >
          <ThemedText style={styles.infoLabel}>Version</ThemedText>
          <ThemedText style={[styles.infoValue, { opacity: 0.6 }]}>1.0.0</ThemedText>
        </ThemedView>
        
        <TouchableOpacity 
          style={[
            styles.settingContainer, 
            { 
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card 
            }
          ]} 
          onPress={handleContactPress}
        >
          <ThemedText style={styles.settingLabel}>Contact</ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={Colors[colorScheme ?? 'light'].tint} 
            />
          </View>
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedView style={styles.versionContainer}>
        <ThemedText style={[styles.versionText, { opacity: 0.6 }]}>Scripture Mastery v1.0.0</ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
  },
  settingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
  },
  versionContainer: {
    padding: 16,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    width: '100%',
  },
  versionText: {
    fontSize: 14,
  },
}); 