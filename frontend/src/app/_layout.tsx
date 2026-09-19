import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
// O componente AppTabs foi removido para desbloquear a navegação do projeto

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      
      {/* O Stack gere a navegação permitindo que qualquer novo ficheiro funcione */}
      <Stack>
        {/* O index (Home) fica sem a barra superior para manter o teu design customizado */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* A nova rota do tradutor, com um cabeçalho nativo gerado automaticamente */}
        <Stack.Screen name="tradutor" options={{ title: 'Painel do Tradutor' }} />
      </Stack>
      
    </ThemeProvider>
  );
}