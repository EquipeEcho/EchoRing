import { Platform } from 'react-native';

export const darkColors = {
  ink: '#F7F7F8',
  muted: '#9B9BA3',
  line: '#29292D',
  canvas: '#050506',
  surface: '#111113',
  elevated: '#1A1A1D',
  white: '#FFFFFF',
  accent: '#FF365B',
  accentStrong: '#E61F49',
  accentSoft: '#35131D',
  green: '#77D9AB',
  greenSoft: '#14271F',
  amber: '#F2BF66',
  amberSoft: '#2C2315',
  red: '#FF807E',
  redSoft: '#30191B',
  blue: '#9CB8FF',
  blueSoft: '#1B2235',
  navigation: '#0B0B0D',
  navigationHover: '#19191C',
  navigationActive: '#2A151C',
  navigationText: '#ECECEF',
  navigationMuted: '#929299',
  navigationLine: '#242427',
  onAccent: '#050506',
  disabled: '#55545A',
  overlay: 'rgba(0,0,0,0.84)',
  controlLine: '#48484F',
};

export type ThemeColors = { [Key in keyof typeof darkColors]: string };
export type ThemeMode = 'dark' | 'light';

export const lightColors: ThemeColors = {
  ink: '#202027',
  muted: '#60606C',
  line: '#D7D7DF',
  canvas: '#F7F7FA',
  surface: '#FFFFFF',
  elevated: '#EEEEF3',
  white: '#FFFFFF',
  accent: '#CC244B',
  accentStrong: '#B51B3E',
  accentSoft: '#FCE9EE',
  green: '#236747',
  greenSoft: '#E5F4EC',
  amber: '#805209',
  amberSoft: '#FFF2DA',
  red: '#B32E32',
  redSoft: '#FDEBEC',
  blue: '#3159A0',
  blueSoft: '#EAF0FF',
  navigation: '#FFFFFF',
  navigationHover: '#F2F2F6',
  navigationActive: '#FCE9EE',
  navigationText: '#282831',
  navigationMuted: '#656571',
  navigationLine: '#DDDDE5',
  onAccent: '#FFFFFF',
  disabled: '#777782',
  overlay: 'rgba(25,25,35,0.42)',
  controlLine: '#8D8D9D',
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
  title: { fontSize: 42, lineHeight: 50 },
  section: { fontSize: 24, lineHeight: 32 },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 19 },
};

export const desktopWidth = 1000;
