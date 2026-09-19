import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import UploadTraducao from '../components/ui/upload-traducao';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function TradutorScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Configura o título no cabeçalho de navegação do telemóvel */}
      <Stack.Screen options={{ title: 'Área do Tradutor' }} />
      
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Painel de Entregas
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            API FATEC SJC - Echo Ring
          </ThemedText>
        </ThemedView>

        <View style={styles.content}>
          {/* O componente que comunica com o Python */}
          <UploadTraducao servicoId="teste-id-001" />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 8, opacity: 0.7 },
  content: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }
});