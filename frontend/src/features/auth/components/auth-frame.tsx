import { Link } from 'expo-router';
import { ArrowUpRight, FileText, FolderKanban, ListTodo } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/ui/brand';
import { Txt } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useStyles } from '@/features/auth/styles/auth.styles';
import { useTheme } from '@/theme/theme-context';

export function AuthFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const small = width < 600;
  return (
    <SafeAreaView style={styles.background} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.page, small && styles.pageSmall]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.top}>
            <Brand compact={small} wordmarkOnly={width < 380} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 6 : 12 }}>
              <ThemeToggle />
              <Link href="/" asChild>
                <Pressable accessibilityRole="link" style={styles.backToSite}>
                  <Txt style={styles.link}>Voltar ao site</Txt>
                  <ArrowUpRight size={16} color={colors.accent} />
                </Pressable>
              </Link>
            </View>
          </View>
          <View style={[styles.center, width >= 1100 && styles.centerWide]}>
            {width >= 1100 && (
              <View style={styles.intro}>
                <Txt style={styles.eyebrow}>SEU ESPAÇO DE TRABALHO</Txt>
                <Txt style={styles.introTitle}>
                  Cada palavra.{'\n'}Cada projeto.{'\n'}
                  <Txt style={[styles.introTitle, { color: colors.accent }]}>Tudo conectado.</Txt>
                </Txt>
                <Txt style={styles.introText}>
                  Um lugar para organizar suas traduções e acompanhar cada entrega.
                </Txt>
                {[
                  { icon: FileText, title: 'Suas requisições' },
                  { icon: FolderKanban, title: 'Seus projetos' },
                  { icon: ListTodo, title: 'Suas tarefas' },
                ].map((item) => (
                  <View key={item.title} style={styles.introRow}>
                    <item.icon size={25} color={colors.accent} strokeWidth={1.6} />
                    <Txt style={styles.introRowText}>{item.title}</Txt>
                    <ArrowUpRight size={19} color={colors.muted} />
                  </View>
                ))}
              </View>
            )}
            <View style={[styles.form, small && styles.formSmall]}>{children}</View>
          </View>
          <View style={styles.footer}>
            <Txt style={styles.footerText}>© 2026 Aliança Traduções</Txt>
            <Txt style={styles.footerText}>Echo Ring</Txt>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
