import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider, useSession } from '@/features/auth/session';
import { colors } from '@/constants/design';
import '@/global.css';

function Routes() {
  const { session, ready } = useSession();
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator color={colors.green} accessibilityLabel="Carregando" /></View>;
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={!session}>
      <Stack.Screen name="login" />
      <Stack.Screen name="recuperar-senha" />
    </Stack.Protected>
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="(workspace)" />
    </Stack.Protected>
  </Stack>;
}

export default function RootLayout() {
  return <SessionProvider><StatusBar style="dark" /><Routes /></SessionProvider>;
}
