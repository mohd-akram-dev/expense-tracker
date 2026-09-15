# Expense Diary — project rules

A small, offline expense tracker with a plain diary. React Native + Expo (TypeScript).
Everything is stored on the phone in SQLite. No server, no account, no sync.

**Keep it simple.** This is a personal app shared with friends as an APK, not a product.
Before adding anything, ask whether it earns its place. Things deliberately left out:
charts libraries, passcodes and biometrics, CSV export, moods, onboarding, category
management, cloud sync.

## Non-negotiables

- **Money is ALWAYS an integer in minor units** (paise/cents). `₹149.50` is stored as `14950`.
  Use `src/domain/money.ts`. Never do float arithmetic on amounts.
- **No component or screen imports `expo-sqlite`.** All SQL lives in `src/db/repositories/`.
- **Schema changes are a new numbered file in `src/db/migrations/`.** Never edit a shipped one.
  The runner tracks `PRAGMA user_version`.
- **Dates are `YYYY-MM-DD` strings. Timestamps are ISO-8601 UTC strings.**
- **Rows are soft-deleted** via `deleted_at`. Every read query filters `deleted_at IS NULL`.
- Use the tokens in `src/theme` via `useTheme()`. No hardcoded hex or magic spacing in
  components. The one exception is a category's own `color`, which is user data.
- **Build screens out of `@/components/ui`** — `Screen`, `Card`, `Button`, `Input`, `Chip`,
  `ListRow`, `Sheet`, `EmptyState`, `Fab`, `Text`. Never import `Text` from `react-native`
  in a screen.
- **Screens read data with `useFocusQuery`**, not a store. It refetches when the screen
  regains focus, which is why returning from a modal just works. The only Zustand store is
  `settingsStore`, because the theme has to be global.
- TypeScript strict mode. No `any`.
- `useRef(new Animated.Value(0)).current` is banned by the React Compiler's refs rule —
  use `useState(() => new Animated.Value(0))` instead.
- Dynamic navigation uses the object form: `router.push({ pathname: '/expense/[id]',
  params: { id } })`. A template-literal href does not typecheck.

## Layout

```
src/app/          Expo Router routes — (tabs) and (modals)
src/components/   ui/ primitives + expense/ pieces
src/hooks/        useFocusQuery
src/domain/       types, money math, date/period helpers — pure, no I/O
src/db/           client, migrations, repositories, seed
src/services/     backup.ts — JSON export/import
src/theme/        colors, typography, spacing
src/store/        settingsStore only
```

## Commands

```bash
npm start                                  # dev server, scan with Expo Go
npm run typecheck
npm run lint
npx expo-doctor
npx eas-cli@latest build -p android --profile preview   # → installable .apk
```
