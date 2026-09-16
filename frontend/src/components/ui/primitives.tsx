import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Orbit, type LucideIcon } from 'lucide-react-native';
import { colors, font } from '@/constants/design';

export function Txt({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[s.text, style]}>{children}</Text>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={s.brand}><View style={s.brandMark}><Orbit size={26} color={colors.green} strokeWidth={1.6} /></View>
    <View><Txt style={s.brandName}>echo ring<Txt style={{ color: colors.green }}>.</Txt></Txt>
      {!compact && <Txt style={s.brandCaption}>ALIANÇA TRADUÇÕES</Txt>}
    </View></View>;
}

export function Button({ children, onPress, icon: Icon, variant = 'primary', disabled, loading, style, testID }: {
  children: ReactNode; onPress: () => void; icon?: LucideIcon; variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const primary = variant === 'primary';
  return <Pressable testID={testID} accessibilityRole="button" aria-disabled={disabled || loading} aria-busy={loading} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed, hovered }) => [s.button, primary ? s.primary : variant === 'secondary' ? s.secondary : s.ghost,
      hovered && { backgroundColor: primary ? colors.greenDark : colors.greenSoft }, pressed && { opacity: 0.8 },
      (disabled || loading) && { opacity: 0.65 }, style]}>
    {loading ? <ActivityIndicator size="small" color={primary ? colors.white : colors.green} /> : Icon && <Icon size={17} color={primary ? colors.white : colors.green} />}
    <Txt style={[s.buttonText, { color: primary ? colors.white : colors.green }]}>{children}</Txt>
  </Pressable>;
}

export function IconButton({ icon: Icon, label, onPress, active = false }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean }) {
  const [hover, setHover] = useState(false);
  return <View style={{ position: 'relative', zIndex: hover ? 20 : 1 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={({ pressed }) => [s.iconButton, (hover || active) && { backgroundColor: colors.greenSoft }, pressed && { opacity: 0.7 }]}>
      <Icon size={20} color={active ? colors.green : colors.muted} strokeWidth={1.7} />
    </Pressable>
    {hover && <View pointerEvents="none" style={s.tooltip}><Txt style={s.tooltipText}>{label}</Txt></View>}
  </View>;
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral' }) {
  const tones = { green: [colors.green, colors.greenSoft], amber: [colors.amber, colors.amberSoft], red: [colors.red, colors.redSoft], blue: [colors.blue, colors.blueSoft], neutral: [colors.muted, colors.canvas] };
  return <View style={[s.badge, { backgroundColor: tones[tone][1] }]}><View style={[s.dot, { backgroundColor: tones[tone][0] }]} /><Txt style={{ fontSize: 11, fontWeight: '600', color: tones[tone][0] }}>{children}</Txt></View>;
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <View style={s.heading}><View style={{ flex: 1, minWidth: 180, gap: 7 }}><Txt accessibilityRole="header" style={s.title}>{title}</Txt><Txt style={s.subtitle}>{subtitle}</Txt></View>{action}</View>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return <View style={s.empty}><View style={s.emptyIcon}><Icon size={27} color={colors.green} strokeWidth={1.5} /></View><Txt style={s.emptyTitle}>{title}</Txt><Txt style={s.emptyText}>{text}</Txt>{action}</View>;
}

export const common = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 12, color: colors.muted },
});
const s = StyleSheet.create({
  text: { fontFamily: font, fontSize: 14, color: colors.ink, lineHeight: 21, letterSpacing: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft, borderRadius: 8 },
  brandName: { fontSize: 23, fontWeight: '700', lineHeight: 28 },
  brandCaption: { fontSize: 8, color: colors.muted, lineHeight: 14, fontWeight: '600' },
  button: { minHeight: 44, borderRadius: 6, paddingHorizontal: 16, flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  primary: { backgroundColor: colors.green, borderColor: colors.green },
  secondary: { backgroundColor: colors.white, borderColor: colors.line },
  ghost: { borderColor: 'transparent', backgroundColor: 'transparent' },
  buttonText: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  iconButton: { width: 40, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  tooltip: { position: 'absolute', top: 43, right: 0, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: colors.ink, borderRadius: 4, minWidth: 100 },
  tooltipText: { color: colors.white, fontSize: 11, textAlign: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 4, alignSelf: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  title: { fontSize: 27, lineHeight: 35, fontWeight: '600' },
  subtitle: { fontSize: 13, color: colors.muted },
  empty: { paddingVertical: 56, paddingHorizontal: 22, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 60, height: 60, backgroundColor: colors.greenSoft, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontWeight: '600', fontSize: 17, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.muted, maxWidth: 380, fontSize: 13 },
});
