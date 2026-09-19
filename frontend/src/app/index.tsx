import React from 'react';
import { StyleSheet, Platform, Pressable, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';


import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Echo Ring
          </ThemedText>
          <ThemedText style={{ textAlign: 'center', marginTop: 10 }}>
            Projeto API - FATEC SJC
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <ThemedText style={{ textAlign: 'center', marginBottom: 15 }}>
            Aceda aos módulos do sistema:
          </ThemedText>
          
        
        {/* Botão de navegação imperativa para a rota /tradutor */}
          <Button title="Ir para Área do Tradutor" onPress={() => router.push('/tradutor')} />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: {
    flex: 1, paddingHorizontal: Spacing.four, alignItems: 'center',
    gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center', justifyContent: 'center', flex: 1,
    paddingHorizontal: Spacing.four, gap: Spacing.four,
  },
  title: { textAlign: 'center' },
  stepContainer: {
    gap: Spacing.three, alignSelf: 'stretch', paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four, borderRadius: Spacing.four, marginBottom: 40,
  },
  button: {
    backgroundColor: '#0a7ea4', padding: 15, borderRadius: 8, textAlign: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});