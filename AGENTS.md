# Expense Diary — project rules

Offline-first expense tracker + personal diary. React Native + Expo (TypeScript).
Everything is stored on-device in SQLite. There is no server and no sync.

Full plan: `docs/EXPENSE_DIARY_APP_PLAN.md`

## Non-negotiables

- **Money is ALWAYS an integer in minor units** (paise/cents). `₹149.50` is stored as `14950`.
  Use `src/domain/money.ts`. Never do float arithmetic on amounts, never store a `Number` with a decimal point.
- **No component or screen imports `expo-sqlite`.** All SQL lives in `src/db/repositories/`.
  UI → hooks → store → repositories → SQLite. Strictly one direction.
- **Schema changes are a new numbered file in `src/db/migrations/`.** Never edit a migration that has shipped.
  The runner tracks `PRAGMA user_version`.
- **Dates are `YYYY-MM-DD` strings. Timestamps are ISO-8601 UTC strings.** Never store a JS `Date` or epoch number.
- **Rows are soft-deleted** via `deleted_at`. Every read query must filter `deleted_at IS NULL`.
- Use the tokens in `src/theme`. No hardcoded hex values or magic spacing numbers in components.
- TypeScript strict mode. No `any`.

## Layout

```
src/app/          Expo Router routes (file = route)
src/components/   dumb views, no business logic
src/store/        Zustand stores — in-memory cache + actions
src/hooks/        screen-shaped data hooks
src/domain/       types, money math, period logic — pure, no I/O
src/db/           client, migrations, repositories, seed
src/services/     backup, csv, lock
src/theme/        colors, typography, spacing
```

## Commands

```bash
npm start                                  # dev server
npx tsc --noEmit                           # typecheck
npm run lint
eas build -p android --profile preview     # → installable .apk
```
