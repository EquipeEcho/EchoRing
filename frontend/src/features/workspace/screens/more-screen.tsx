import { type Href, router } from 'expo-router';
import { ChevronRight, Inbox } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { mobileMoreModulesFor } from '@/features/workspace/navigation/modules';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function MoreScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { session } = useSession();
  const items = mobileMoreModulesFor(session?.role ?? 'translator');
  return (
    <WorkspacePage>
      <PageHeading title="Mais" subtitle="Áreas da Aliança Traduções" />
      {items.map((item) => (
        <Pressable
          key={item.href}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => router.push(item.href as Href)}
          style={styles.moduleRow}
        >
          <View style={styles.moduleIcon}>
            <item.icon size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt style={{ fontWeight: '600' }}>{item.title}</Txt>
            <Txt style={common.caption}>{item.description}</Txt>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </Pressable>
      ))}
      {!items.length && (
        <EmptyState
          icon={Inbox}
          title="Tudo à mão"
          text="As áreas disponíveis para esta conta já estão na navegação principal."
        />
      )}
    </WorkspacePage>
  );
}
