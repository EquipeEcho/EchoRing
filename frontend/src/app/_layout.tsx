import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SessionProvider, useSession } from '@/features/auth/session';
import { colors } from '@/constants/design';
import '@/global.css';

function Routes() {
  const { ready } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    InterRegular: Inter_400Regular, InterMedium: Inter_500Medium,
    InterSemibold: Inter_600SemiBold, InterBold: Inter_700Bold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator color={colors.accent} accessibilityLabel="Carregando" /></View>;
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="login" />
    <Stack.Screen name="recuperar-senha" />
    <Stack.Screen name="(workspace)" />
  </Stack>;
}

export default function RootLayout() {
  return <SessionProvider><StatusBar style="light" /><Routes /></SessionProvider>;
}
