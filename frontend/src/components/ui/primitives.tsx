import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { colors, fonts, typeScale } from '@/constants/design';

export function Txt({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight;
  const family = weight === 'bold' || Number(weight) >= 700 ? fonts.bold
    : Number(weight) >= 600 ? fonts.semibold : Number(weight) >= 500 ? fonts.medium : fonts.regular;
  // Each bundled weight has its own family name on both web and native.
  return <Text {...props} style={[s.text, style, { fontFamily: resolved?.fontFamily ?? family, fontWeight: 'normal' }]}>{children}</Text>;
}

export function Brand({ compact = false, inverse = false, wordmarkOnly = false }: { compact?: boolean; inverse?: boolean; wordmarkOnly?: boolean }) {
  return <View accessible accessibilityLabel="Echo Ring, traduções que conectam" style={s.brand}>
    {!wordmarkOnly && <Image source={require('@/assets/images/echoring-mark.png')} resizeMode="contain" style={[s.brandMark, compact && s.brandMarkCompact]} />}
    <View><View style={s.wordmark}><Txt style={[s.brandName, compact && s.brandNameCompact, inverse && { color: colors.white }]}>echo</Txt><Txt style={[s.brandName, s.brandAccent, compact && s.brandNameCompact]}>ring</Txt></View>
      {!compact && <Txt style={[s.brandCaption, inverse && { color: colors.navigationMuted }]}>TRADUÇÕES QUE CONECTAM</Txt>}
    </View>
  </View>;
}

export function Button({ children, onPress, icon: Icon, variant = 'primary', disabled, loading, style, testID }: {
  children: ReactNode; onPress: () => void; icon?: LucideIcon; variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const primary = variant === 'primary';
  return <Pressable testID={testID} accessibilityRole="button" aria-disabled={disabled || loading} aria-busy={loading} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed, hovered }) => [s.button, primary ? s.primary : variant === 'secondary' ? s.secondary : s.ghost,
      hovered && { backgroundColor: primary ? colors.accentStrong : colors.accentSoft }, pressed && { opacity: 0.8 },
      (disabled || loading) && { opacity: 0.65 }, style]}>
    {loading ? <ActivityIndicator size="small" color={primary ? colors.canvas : colors.accent} /> : Icon && <Icon size={17} color={primary ? colors.canvas : colors.accent} />}
    <Txt style={[s.buttonText, { color: primary ? colors.canvas : colors.accent }]}>{children}</Txt>
  </Pressable>;
}

export function IconButton({ icon: Icon, label, onPress, active = false }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean }) {
  const [hover, setHover] = useState(false);
  return <View style={{ position: 'relative', zIndex: hover ? 20 : 1 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
      style={({ pressed }) => [s.iconButton, (hover || active) && { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}>
      <Icon size={20} color={active ? colors.accent : colors.muted} strokeWidth={1.7} />
    </Pressable>
    {hover && <View pointerEvents="none" style={s.tooltip}><Txt style={s.tooltipText}>{label}</Txt></View>}
  </View>;
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral' }) {
  const tones = { green: [colors.green, colors.greenSoft], amber: [colors.amber, colors.amberSoft], red: [colors.red, colors.redSoft], blue: [colors.blue, colors.blueSoft], neutral: [colors.muted, colors.canvas] };
  return <View style={[s.badge, { backgroundColor: tones[tone][1] }]}><Txt style={{ ...typeScale.caption, fontWeight: '600', color: tones[tone][0] }}>{children}</Txt></View>;
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  const { width } = useWindowDimensions();
  return <View style={s.heading}><View style={{ flex: 1, minWidth: 180, gap: 7 }}><Txt accessibilityRole="header" style={[s.title, width < 700 && { fontSize: 34, lineHeight: 42 }]}>{title}</Txt><Txt style={s.subtitle}>{subtitle}</Txt></View>{action}</View>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return <View style={s.empty}><View style={s.emptyIcon}><Icon size={27} color={colors.accent} strokeWidth={1.5} /></View><Txt style={s.emptyTitle}>{title}</Txt><Txt style={s.emptyText}>{text}</Txt>{action}</View>;
}

export const common = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { ...typeScale.section, fontWeight: '600', color: colors.ink },
  caption: { ...typeScale.caption, color: colors.muted },
});
const s = StyleSheet.create({
  text: { ...typeScale.body, color: colors.ink, letterSpacing: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42 },
  brandMarkCompact: { width: 34, height: 34 },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  brandName: { fontSize: 25, fontWeight: '700', lineHeight: 27, letterSpacing: -1.1 },
  brandNameCompact: { fontSize: 21, lineHeight: 24, letterSpacing: -0.8 },
  brandAccent: { color: colors.accent },
  brandCaption: { fontSize: 7, color: colors.muted, lineHeight: 11, letterSpacing: 2.25, fontWeight: '600' },
  button: { minHeight: 48, borderRadius: 16, paddingHorizontal: 20, flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderColor: colors.line },
  ghost: { borderColor: 'transparent', backgroundColor: 'transparent' },
  buttonText: { fontSize: 15, lineHeight: 22, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', alignItems: 'center' },
  tooltip: { position: 'absolute', top: 49, right: 0, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.line, borderRadius: 12, minWidth: 100 },
  tooltipText: { color: colors.white, fontSize: 11, textAlign: 'center' },
  badge: { paddingHorizontal: 11, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, alignSelf: 'flex-start' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  title: { ...typeScale.title, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.muted },
  empty: { paddingVertical: 56, paddingHorizontal: 22, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 64, height: 64, backgroundColor: colors.accentSoft, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontWeight: '600', fontSize: 17, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.muted, maxWidth: 380, fontSize: 13 },
});
