import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import type { ReactNode } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { Text } from './text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** replaces the helper line and turns the border red */
  error?: string;
  helper?: string;
  left?: ReactNode;
  right?: ReactNode;
  /** grow with the content — used by the diary body field */
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helper, left, right, multiline = false, containerStyle, onFocus, onBlur, ...rest },
  ref
) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Text variant="label" tone="textMuted">
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.md,
            borderColor,
            borderWidth: 1,
            paddingHorizontal: spacing.md,
            minHeight: multiline ? 120 : MIN_TOUCH_SIZE,
            alignItems: multiline ? 'flex-start' : 'center',
            gap: spacing.sm,
          },
        ]}>
        {left}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            typography.body,
            {
              color: colors.text,
              paddingVertical: spacing.sm,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
          placeholderTextColor={colors.textFaint}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {right}
      </View>

      {error || helper ? (
        <Text variant="caption" tone={error ? 'danger' : 'textFaint'}>
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { flexDirection: 'row' },
  input: { flex: 1 },
});
