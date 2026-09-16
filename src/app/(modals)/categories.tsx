import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Divider, Input, ListRow, Sheet, Text } from '@/components/ui';
import {
  countExpensesInCategory,
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '@/db/repositories/categoryRepo';
import { CATEGORY_COLORS, CATEGORY_ICONS, iconOrFallback } from '@/domain/icons';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/theme';

import type { IconName } from '@/domain/icons';
import type { Category } from '@/domain/types';

type Draft = {
  /** null when adding a new one */
  id: string | null;
  name: string;
  icon: IconName;
  color: string;
};

const BLANK: Draft = { id: null, name: '', icon: CATEGORY_ICONS[0], color: CATEGORY_COLORS[0] };

export default function CategoriesModal() {
  const { colors, spacing, radius } = useTheme();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useCallback(() => listCategories(), []);
  const { data: categories, refresh } = useFocusQuery<Category[]>(query, []);

  const save = useCallback(async () => {
    if (!draft || draft.name.trim().length === 0) return;

    setSaving(true);
    try {
      const payload = { name: draft.name.trim(), icon: draft.icon, color: draft.color };
      if (draft.id) await updateCategory(draft.id, payload);
      else await createCategory(payload);

      setDraft(null);
      refresh();
    } finally {
      setSaving(false);
    }
  }, [draft, refresh]);

  /** Moving an item is a whole-list reorder, so sort_order stays contiguous. */
  const move = useCallback(
    async (index: number, by: -1 | 1) => {
      const target = index + by;
      if (target < 0 || target >= categories.length) return;

      const next = [...categories];
      [next[index], next[target]] = [next[target], next[index]];

      await reorderCategories(next.map((category) => category.id));
      refresh();
    },
    [categories, refresh]
  );

  const confirmDelete = useCallback(
    async (category: Category) => {
      if (categories.length <= 1) {
        Alert.alert(
          'Keep at least one',
          'Expenses need a category to go in. Add another one before deleting this.'
        );
        return;
      }

      const inUse = await countExpensesInCategory(category.id);

      if (inUse === 0) {
        Alert.alert(`Delete ${category.name}?`, 'Nothing is using it.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteCategory(category.id, null);
              refresh();
            },
          },
        ]);
        return;
      }

      // In use: pick where those expenses should land before the category goes.
      const others = categories.filter((c) => c.id !== category.id);
      Alert.alert(
        `Delete ${category.name}?`,
        `${inUse} ${inUse === 1 ? 'expense uses' : 'expenses use'} it. Move ${inUse === 1 ? 'it' : 'them'} to:`,
        [
          { text: 'Cancel', style: 'cancel' },
          ...others.slice(0, 3).map((other) => ({
            text: other.name,
            onPress: async () => {
              await deleteCategory(category.id, other.id);
              refresh();
            },
          })),
        ]
      );
    },
    [categories, refresh]
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Button label="Done" variant="ghost" size="sm" haptic={false} onPress={() => router.back()} />
        <Text variant="heading">Categories</Text>
        <Button label="Add" variant="ghost" size="sm" onPress={() => setDraft(BLANK)} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card flush>
          {categories.map((category, index) => (
            <View key={category.id}>
              {index > 0 ? <Divider inset={spacing.lg} /> : null}
              <ListRow
                icon={iconOrFallback(category.icon)}
                iconColor={category.color}
                title={category.name}
                onPress={() =>
                  setDraft({
                    id: category.id,
                    name: category.name,
                    icon: iconOrFallback(category.icon),
                    color: category.color,
                  })
                }
                right={
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <IconButton
                      name="chevron-up"
                      disabled={index === 0}
                      onPress={() => move(index, -1)}
                    />
                    <IconButton
                      name="chevron-down"
                      disabled={index === categories.length - 1}
                      onPress={() => move(index, 1)}
                    />
                    <IconButton name="trash-outline" danger onPress={() => confirmDelete(category)} />
                  </View>
                }
              />
            </View>
          ))}
        </Card>

        <Text variant="caption" tone="textFaint" center>
          Deleting a category keeps its expenses — you choose where they move to.
        </Text>
      </ScrollView>

      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit category' : 'New category'}
        footer={
          <Button
            label="Save"
            size="lg"
            block
            loading={saving}
            disabled={!draft?.name.trim()}
            onPress={save}
          />
        }>
        {draft ? (
          <View style={{ gap: spacing.lg }}>
            <Input
              placeholder="Name"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              autoFocus
            />

            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="textMuted">
                Icon
              </Text>
              <View style={styles.grid}>
                {CATEGORY_ICONS.map((name) => {
                  const active = draft.icon === name;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setDraft({ ...draft, icon: name })}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? draft.color : colors.surfaceAlt,
                      }}>
                      <Ionicons
                        name={name}
                        size={20}
                        color={active ? colors.textInverse : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="textMuted">
                Colour
              </Text>
              <View style={styles.grid}>
                {CATEGORY_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.color === color }}
                    onPress={() => setDraft({ ...draft, color })}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color,
                      borderWidth: draft.color === color ? 3 : 0,
                      borderColor: colors.text,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );

  function IconButton({
    name,
    onPress,
    disabled = false,
    danger = false,
  }: {
    name: IconName;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={String(name)}
        disabled={disabled}
        onPress={onPress}
        hitSlop={6}
        style={{ padding: spacing.xs, opacity: disabled ? 0.25 : 1 }}>
        <Ionicons name={name} size={20} color={danger ? colors.danger : colors.textMuted} />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
