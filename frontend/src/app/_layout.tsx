import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SourceSans3_400Regular } from '@expo-google-fonts/source-sans-3/400Regular';
import { SourceSans3_500Medium } from '@expo-google-fonts/source-sans-3/500Medium';
import { SourceSans3_600SemiBold } from '@expo-google-fonts/source-sans-3/600SemiBold';
import { SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3/700Bold';
import { SessionProvider, useSession } from '@/features/auth/session';
import { colors } from '@/constants/design';
import '@/global.css';

function Routes() {
  const { session, ready } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    SourceSans3Regular: SourceSans3_400Regular, SourceSans3Medium: SourceSans3_500Medium,
    SourceSans3Semibold: SourceSans3_600SemiBold, SourceSans3Bold: SourceSans3_700Bold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator color={colors.green} accessibilityLabel="Carregando" /></View>;
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
