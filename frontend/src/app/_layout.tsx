import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { SessionProvider, useSession } from '@/features/auth/contexts/session-context';
import '@/styles/global.css';
import { ThemeProvider, useTheme } from '@/theme/theme-context';

function Routes() {
  const { colors, theme, ready: themeReady } = useTheme();
  const { ready } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    InterRegular: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemibold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
  });
  const loaded = ready && themeReady && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.canvas,
        }}
      >
        <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando" />
      </View>
    );
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="recuperar-senha" />
        <Stack.Screen name="completar-cadastro" />
        <Stack.Screen name="orcamento/[id]" />
        <Stack.Screen name="(workspace)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <Routes />
      </SessionProvider>
    </ThemeProvider>
  );
}
