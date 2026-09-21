import { Platform } from 'react-native';

export const colors = {
  ink: '#F7F7F8', muted: '#9B9BA3', line: '#29292D', canvas: '#050506',
  surface: '#111113', elevated: '#1A1A1D', white: '#FFFFFF',
  accent: '#FF365B', accentStrong: '#E51F49', accentSoft: '#35131D',
  green: '#77D9AB', greenSoft: '#14271F',
  amber: '#F2BF66', amberSoft: '#2C2315', red: '#FF807E', redSoft: '#30191B',
  blue: '#9CB8FF', blueSoft: '#1B2235',
  navigation: '#0B0B0D', navigationHover: '#19191C', navigationActive: '#2A151C',
  navigationText: '#ECECEF', navigationMuted: '#929299', navigationLine: '#242427',
};
const family = (name: string) => Platform.OS === 'web' ? `${name}, system-ui, sans-serif` : name;
export const fonts = {
  regular: family('InterRegular'), medium: family('InterMedium'),
  semibold: family('InterSemibold'), bold: family('InterBold'),
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
