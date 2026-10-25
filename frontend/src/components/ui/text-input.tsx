import { forwardRef } from 'react';
import { StyleSheet, TextInput as NativeTextInput, type TextInputProps } from 'react-native';

import { fonts } from '@/theme/tokens';
import { formatPhoneInput } from '@/utils/input-formatters';

// React components and their native instance intentionally share the public name.
export type TextInput = NativeTextInput;

/** Shared typography and keyboard behavior for every editable portal field. */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, onChangeText, ...props }, ref) {
  const resolved = StyleSheet.flatten(style);
  const weight = Number(resolved?.fontWeight);
  const family = resolved?.fontFamily ?? (weight >= 700 ? fonts.bold : weight >= 600 ? fonts.semibold : weight >= 500 ? fonts.medium : fonts.regular);
  const email = props.keyboardType === 'email-address';
  return <NativeTextInput ref={ref} autoCapitalize={email ? 'none' : undefined} autoCorrect={email ? false : undefined}
    {...props} value={props.keyboardType === 'phone-pad' && typeof props.value === 'string' ? formatPhoneInput(props.value) : props.value}
    style={[style, { fontFamily: family, fontWeight: 'normal' }]}
    onChangeText={value => onChangeText?.(props.keyboardType === 'phone-pad' ? formatPhoneInput(value) : value)} />;
});
