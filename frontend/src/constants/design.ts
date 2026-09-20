import { Platform } from 'react-native';

export const colors = {
  ink: '#F5F5F7', muted: '#A1A1AA', line: '#2B2B2E', canvas: '#000000',
  surface: '#19191B', elevated: '#242426', white: '#FFFFFF',
  accent: '#FF375F', accentStrong: '#DD244A', accentSoft: '#32141D',
  green: '#77D9AB', greenSoft: '#14271F',
  amber: '#F2BF66', amberSoft: '#2C2315', red: '#FF807E', redSoft: '#30191B',
  blue: '#9CB8FF', blueSoft: '#1B2235',
  navigation: '#111113', navigationHover: '#242426', navigationActive: '#303033',
  navigationText: '#E8E8ED', navigationMuted: '#A1A1AA', navigationLine: '#2B2B2E',
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
