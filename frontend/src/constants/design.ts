import { Platform } from 'react-native';

export const colors = {
  ink: '#20262C', muted: '#606A75', line: '#E1E5E9', canvas: '#F5F7F9',
  white: '#FFFFFF', green: '#226650', greenDark: '#174E3C', greenSoft: '#EAF4EE',
  amber: '#936522', amberSoft: '#FBF2DF', red: '#B14F48', redSoft: '#FAECE9',
  blue: '#365F91', blueSoft: '#EDF2F9',
  navigation: '#252A30', navigationHover: '#30373F', navigationActive: '#37443F',
  navigationText: '#D3D9DF', navigationMuted: '#A6B0BB', navigationLine: '#3A4149',
};
const family = (name: string) => Platform.OS === 'web' ? `${name}, system-ui, sans-serif` : name;
export const fonts = {
  regular: family('SourceSans3Regular'), medium: family('SourceSans3Medium'),
  semibold: family('SourceSans3Semibold'), bold: family('SourceSans3Bold'),
};
export const font = fonts.regular;
export const typeScale = {
  title: { fontSize: 30, lineHeight: 38 },
  section: { fontSize: 20, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 19 },
};
export const desktopWidth = 1000;
