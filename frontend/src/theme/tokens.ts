import { Platform } from 'react-native';

export const darkColors = {
  ink: '#F3F5F7',
  muted: '#A4AFBD',
  line: '#303945',
  canvas: '#101318',
  surface: '#171C23',
  elevated: '#202732',
  white: '#FFFFFF',
  accent: '#FF7185',
  accentStrong: '#FF8FA0',
  accentSoft: '#35232D',
  green: '#77D9AB',
  greenSoft: '#14271F',
  amber: '#F2BF66',
  amberSoft: '#2C2315',
  red: '#FF807E',
  redSoft: '#30191B',
  blue: '#9CB8FF',
  blueSoft: '#1B2235',
  navigation: '#14181F',
  navigationHover: '#202732',
  navigationActive: '#35232D',
  navigationText: '#E6EBF1',
  navigationMuted: '#A4AFBD',
  navigationLine: '#303945',
  onAccent: '#101318',
  disabled: '#7D8998',
  overlay: 'rgba(6,10,16,0.72)',
  controlLine: '#566374',
};

export type ThemeColors = { [Key in keyof typeof darkColors]: string };
export type ThemeMode = 'dark' | 'light';

export const lightColors: ThemeColors = {
  ink: '#202936',
  muted: '#5E6B7C',
  line: '#DAE1E8',
  canvas: '#F4F6F8',
  surface: '#FFFFFF',
  elevated: '#EDF1F5',
  white: '#FFFFFF',
  accent: '#B83250',
  accentStrong: '#98213C',
  accentSoft: '#FBECEF',
  green: '#236747',
  greenSoft: '#E5F4EC',
  amber: '#805209',
  amberSoft: '#FFF2DA',
  red: '#B32E32',
  redSoft: '#FDEBEC',
  blue: '#3159A0',
  blueSoft: '#EAF0FF',
  navigation: '#F9FAFC',
  navigationHover: '#EDF1F5',
  navigationActive: '#FBECEF',
  navigationText: '#202936',
  navigationMuted: '#5E6B7C',
  navigationLine: '#DAE1E8',
  onAccent: '#FFFFFF',
  disabled: '#717E8F',
  overlay: 'rgba(16,25,40,0.38)',
  controlLine: '#8A98A9',
};

export const palettes = { dark: darkColors, light: lightColors };

export const family = (name: string) =>
  Platform.OS === 'web' ? `${name}, system-ui, sans-serif` : name;

export const fonts = {
  regular: family('InterRegular'),
  medium: family('InterMedium'),
  semibold: family('InterSemibold'),
  bold: family('InterBold'),
};

export const font = fonts.regular;

export const typeScale = {
  title: { fontSize: 36, lineHeight: 44 },
  section: { fontSize: 24, lineHeight: 32 },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 19 },
};

// Shared rhythm across the public site, portal and native layouts.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 48 };
export const radius = { sm: 8, control: 10, card: 16, large: 24, pill: 999 };
export const layout = { content: 1400, form: 880 };

export const desktopWidth = 1000;
