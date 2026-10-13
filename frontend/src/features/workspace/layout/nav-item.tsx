import { type Href, router } from 'expo-router';
import { type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { styles } from '@/features/workspace/styles/workspace-shell.styles';
import { colors } from '@/theme/tokens';

export function NavItem({
  title,
  href,
  icon: Icon,
  active,
  badge,
}: {
  title: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      aria-current={active ? 'page' : undefined}
      accessibilityState={{ selected: active }}
      onPress={() => router.push(href as Href)}
      style={({ hovered }) => [
        styles.navItem,
        active && styles.navActive,
        hovered && !active && { backgroundColor: colors.navigationHover },
      ]}
    >
      <Icon
        size={18}
        color={active ? colors.accent : colors.navigationMuted}
        strokeWidth={active ? 2 : 1.7}
      />
      <Txt style={[styles.navLabel, active && { color: colors.accent, fontWeight: '600' }]}>
        {title}
      </Txt>
      {badge !== undefined && (
        <View style={styles.count}>
          <Txt style={styles.countText}>{badge}</Txt>
        </View>
      )}
    </Pressable>
  );
}
