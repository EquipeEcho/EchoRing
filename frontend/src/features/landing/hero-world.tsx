import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Pattern, RadialGradient, Stop } from 'react-native-svg';
import { ArrowUpRight } from 'lucide-react-native';
import { Txt } from '@/components/ui/primitives';
import { colors } from '@/constants/design';

const continents = [
  'M115 151 L135 129 158 119 174 128 191 128 203 144 193 159 173 164 167 179 151 187 159 200 153 214 137 208 133 190 119 178 Z',
  'M158 221 L180 221 198 237 212 245 210 267 197 283 191 309 180 330 170 321 169 297 158 277 152 251 Z',
  'M198 105 L221 98 237 108 226 127 211 133 199 120 Z',
  'M250 146 L265 137 276 146 292 144 302 160 288 174 271 174 259 184 248 176 240 161 Z',
  'M256 185 L281 180 299 193 306 218 291 246 278 277 263 273 256 253 240 235 237 210 Z',
  'M298 145 L323 130 353 141 373 164 379 194 364 209 350 198 337 218 321 209 313 187 293 178 Z',
  'M318 223 L336 233 345 251 358 258 348 268 329 257 Z',
  'M339 280 L366 278 383 294 378 311 353 319 336 306 Z',
];

export function HeroWorld() {
  return <View style={s.world} accessibilityLabel="Ilustração da Aliança: idiomas e rotas conectando o mundo">
    <View testID="language-globe" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 480 480" aria-hidden>
        <Defs>
          <RadialGradient id="allianceHalo"><Stop offset="0" stopColor="#FF375F" stopOpacity="0.15" /><Stop offset="1" stopColor="#FF375F" stopOpacity="0" /></RadialGradient>
          <RadialGradient id="alliancePlanet" cx="32%" cy="28%" r="75%"><Stop offset="0" stopColor="#441A2B" /><Stop offset="0.55" stopColor="#180B12" /><Stop offset="1" stopColor="#030305" /></RadialGradient>
          <LinearGradient id="allianceRoute" x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor="#FF375F" stopOpacity="0.12" /><Stop offset="0.5" stopColor="#FF6686" /><Stop offset="1" stopColor="#FF375F" stopOpacity="0.25" /></LinearGradient>
          <Pattern id="allianceLand" width="6" height="6" patternUnits="userSpaceOnUse"><Circle cx="3" cy="3" r="1.15" fill="#EF7192" /></Pattern>
          <ClipPath id="allianceGlobeClip"><Circle cx="240" cy="240" r="153" /></ClipPath>
        </Defs>
        <Circle cx="240" cy="240" r="238" fill="url(#allianceHalo)" />
        <Circle cx="240" cy="240" r="195" fill="none" stroke="#351521" strokeDasharray="2 8" />
        <Circle cx="240" cy="240" r="175" fill="none" stroke="#25141C" />
        <Circle cx="240" cy="240" r="153" fill="url(#alliancePlanet)" stroke="#8C3C55" strokeWidth="0.8" />
        <G clipPath="url(#allianceGlobeClip)">
          {[55, 110].map(rx => <Ellipse key={rx} cx="240" cy="240" rx={rx} ry="153" fill="none" stroke="#74354A" strokeWidth="0.6" opacity="0.5" />)}
          {[48, 100].map(ry => <Ellipse key={ry} cx="240" cy="240" rx="153" ry={ry} fill="none" stroke="#74354A" strokeWidth="0.6" opacity="0.5" />)}
          {continents.map((path, index) => <Path key={index} d={path} fill="url(#allianceLand)" stroke="#A04B64" strokeWidth="0.5" opacity="0.8" />)}
          <Path d="M172 261 Q186 118 274 161 Q366 161 353 294" fill="none" stroke="url(#allianceRoute)" strokeWidth="1.8" />
          <Path d="M172 261 Q237 346 353 294" fill="none" stroke="#D85578" strokeWidth="0.8" strokeDasharray="3 5" />
          {[[172, 261], [274, 161], [353, 294]].map(([cx, cy]) => <G key={cx}><Circle cx={cx} cy={cy} r="11" fill="#FF375F" opacity="0.12" /><Circle cx={cx} cy={cy} r="4" fill="#FF6E8B" /><Circle cx={cx} cy={cy} r="1.8" fill="#FFF0F4" /></G>)}
        </G>
        <Ellipse cx="240" cy="240" rx="222" ry="83" transform="rotate(-29 240 240)" fill="none" stroke="url(#allianceRoute)" strokeWidth="1.1" />
        <Ellipse cx="240" cy="240" rx="205" ry="91" transform="rotate(35 240 240)" fill="none" stroke="#5D293C" strokeWidth="0.7" />
      </Svg>
    </View>
    <View testID="hero-orbit" pointerEvents="none" style={StyleSheet.absoluteFill}><Svg width="100%" height="100%" viewBox="0 0 480 480" aria-hidden><Circle cx="240" cy="240" r="195" fill="none" stroke="transparent" /><Circle cx="411" cy="146" r="4" fill={colors.accent} /><Circle cx="69" cy="334" r="2.5" fill="#E4A7BD" /></Svg></View>
    <View style={s.seal}><Txt style={s.sealLetter}>a<Txt style={{ color: colors.accent }}>.</Txt></Txt></View>
    <View testID="language-chip-one" style={[s.chip, { top: '13%', left: '1%' }]}><View style={s.chipTop}><Txt style={s.code}>PT</Txt><View style={s.chipDot} /></View><Txt style={s.hello}>Olá<Txt style={{ color: colors.accent }}>.</Txt></Txt><Txt style={s.language}>PORTUGUÊS</Txt></View>
    <View testID="language-chip-two" style={[s.chip, s.chipPink, { top: '32%', right: '0%' }]}><View style={s.chipTop}><Txt style={[s.code, { color: '#FFD7E2' }]}>EN</Txt><ArrowUpRight size={13} color="#FF8EA7" /></View><Txt style={s.hello}>Hello.</Txt><Txt style={[s.language, { color: '#DA9AAC' }]}>ENGLISH</Txt></View>
    <View testID="language-chip-three" style={[s.chip, { bottom: '8%', left: '12%' }]}><View style={s.chipTop}><Txt style={s.code}>FR</Txt><View style={s.chipDot} /></View><Txt style={s.hello}>Bonjour.</Txt><Txt style={s.language}>FRANÇAIS</Txt></View>
    <View style={s.caption}><View style={s.captionLine} /><Txt style={s.captionText}>IDEIAS VIAJAM.{'\n'}SENTIDOS FICAM.</Txt></View>
  </View>;
}
const s = StyleSheet.create({
  world: { width: '100%', aspectRatio: 1, position: 'relative' },
  seal: { position: 'absolute', top: '42%', left: '42%', width: '16%', height: '16%', backgroundColor: '#100B10', borderWidth: 1, borderColor: '#703146', borderRadius: 100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,55,95,0.12)' }, sealLetter: { fontSize: 35, lineHeight: 40, fontWeight: '700', letterSpacing: -2 },
  chip: { position: 'absolute', width: 130, backgroundColor: '#19171BEF', borderWidth: 1, borderColor: '#3B2932', borderRadius: 19, paddingHorizontal: 17, paddingVertical: 13, boxShadow: '0 16px 35px rgba(0,0,0,0.45)' }, chipPink: { backgroundColor: '#3D1826F5', borderColor: '#8D3450' }, chipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }, code: { fontSize: 10, lineHeight: 14, color: colors.muted, fontWeight: '600', letterSpacing: 1 }, chipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent }, hello: { fontSize: 24, lineHeight: 31, fontWeight: '600', letterSpacing: -0.9 }, language: { fontSize: 8, lineHeight: 14, letterSpacing: 1.5, color: colors.muted },
  caption: { position: 'absolute', bottom: '6%', right: '0%', flexDirection: 'row', gap: 9, alignItems: 'center' }, captionLine: { width: 18, height: 1, backgroundColor: '#7C354B' }, captionText: { fontSize: 8, lineHeight: 14, color: '#A27889', letterSpacing: 1.2 },
});
