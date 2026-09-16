import { Platform } from 'react-native';

export const colors = {
  ink: '#232D29', muted: '#728078', line: '#E5EAE6', canvas: '#F7F9F7',
  white: '#FFFFFF', green: '#28664C', greenDark: '#1D4D39', greenSoft: '#EAF3ED',
  amber: '#936522', amberSoft: '#FBF2DF', red: '#B14F48', redSoft: '#FAECE9',
  blue: '#4C6F99', blueSoft: '#EDF2F9',
};
export const font = Platform.OS === 'web' ? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : undefined;
export const desktopWidth = 1000;
