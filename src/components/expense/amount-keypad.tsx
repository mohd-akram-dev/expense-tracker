import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

import type { Currency } from '@/domain/money';

type Key = { value: string; icon?: 'backspace-outline' };

const KEYS: Key[] = [
  { value: '1' }, { value: '2' }, { value: '3' },
  { value: '4' }, { value: '5' }, { value: '6' },
  { value: '7' }, { value: '8' }, { value: '9' },
  { value: '.' }, { value: '0' }, { value: 'back', icon: 'backspace-outline' },
];

/**
 * Groups the whole part for display only — `1234.5` reads as `1,234.5`, and in
 * an INR locale as `1,234.5`, per that locale's own grouping.
 *
 * The fraction is passed through exactly as typed rather than formatted, so a
 * half-finished `12.` still shows its trailing point instead of jumping to
 * `12.00` under the user's finger.
 */
function groupDigits(value: string, currency: Currency): string {
  if (value === '') return '';

  const [whole, fraction] = value.split('.');
  const grouped = whole === '' ? '' : new Intl.NumberFormat(currency.locale).format(Number(whole));

  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export type AmountKeypadProps = {
  /** the raw typed string, e.g. "149.5" — not a number, so "12." can exist mid-type */
  value: string;
  onChange: (next: string) => void;
  currency: Currency;
};

/**
 * The screen you hit ten times a day, so it is a custom pad rather than the OS
 * keyboard: bigger targets, no keyboard animation, and no way to type a letter
 * into an amount.
 */
export function AmountKeypad({ value, onChange, currency }: AmountKeypadProps) {
  const { colors, spacing, radius } = useTheme();

  function press(key: string) {
    Haptics.selectionAsync();

    if (key === 'back') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === '.') {
      // One decimal point, and never as the first character.
      if (value.includes('.')) return;
      onChange(value === '' ? '0.' : `${value}.`);
      return;
    }

    // Stop at the currency's precision — a third decimal can't be stored.
    const [, fraction] = value.split('.');
    if (fraction !== undefined && fraction.length >= currency.decimals) return;

    // No leading zeros: "0" then "5" is 5, not 05.
    onChange(value === '0' ? key : value + key);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={[styles.display, { paddingVertical: spacing.sm, gap: spacing.xs }]}>
        <Text variant="heading" tone="textFaint">
          {currency.symbol}
        </Text>
        <Text variant="display" tone={value ? 'text' : 'textFaint'} numberOfLines={1} adjustsFontSizeToFit>
          {groupDigits(value, currency) || '0'}
        </Text>
      </View>

      <View style={styles.grid}>
        {KEYS.map((key) => (
          <Pressable
            key={key.value}
            accessibilityRole="button"
            accessibilityLabel={key.value === 'back' ? 'Delete' : key.value}
            onPress={() => press(key.value)}
            style={({ pressed }) => [
              styles.key,
              {
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surfacePressed : colors.surfaceAlt,
              },
            ]}>
            {key.icon ? (
              <Ionicons name={key.icon} size={22} color={colors.text} />
            ) : (
              <Text variant="title">{key.value}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Three columns: (100% - two 6px gaps) / 3. Kept short enough that the whole
  // add-expense screen fits on a phone without scrolling.
  key: {
    width: '31.5%',
    flexGrow: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
