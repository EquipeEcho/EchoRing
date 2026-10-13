import { type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

export function IconButton({
  icon: Icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [hover, setHover] = useState(false);
  return (
    <View style={{ position: 'relative', zIndex: hover ? 20 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={({ pressed }) => [
          styles.iconButton,
          disabled && { opacity: 0.5 },
          (hover || active) && { backgroundColor: colors.accentSoft },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon size={20} color={active ? colors.accent : colors.muted} strokeWidth={1.7} />
      </Pressable>
      {hover && (
        <View pointerEvents="none" style={styles.tooltip}>
          <Txt style={styles.tooltipText}>{label}</Txt>
        </View>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors, selectColor) => ({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    top: 49,
    right: 0,
    paddingVertical: 7,
    paddingHorizontal: 11,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    minWidth: 100,
  },
  tooltipText: { color: selectColor(colors.white, colors.ink), fontSize: 11, textAlign: 'center' },
}));
