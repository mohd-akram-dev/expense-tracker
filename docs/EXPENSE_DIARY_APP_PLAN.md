# Offline Expense Tracker + Diary — Architecture & Development Plan

A single codebase that ships an Android `.apk` and an iOS build, works fully offline, and stores everything in on-device storage.

---

## 1. Tech stack decision

**Recommended: React Native + Expo (TypeScript)**

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo (latest stable SDK) | One codebase → Android + iOS |
| Language | TypeScript | Claude Code works best with typed code |
| Navigation | Expo Router (file-based tabs) | Folder = route, easy to reason about |
| Database | `expo-sqlite` | Real SQL, fast monthly aggregation, fully offline |
| Key-value | `expo-secure-store` + `AsyncStorage` | Settings + diary passcode |
| State | Zustand | ~1KB, no boilerplate |
| Styling | Theme tokens + `StyleSheet` | Zero config, no build-step risk |
| Charts | `react-native-gifted-charts` | Simple bar/pie for monthly view |
| Dates | `date-fns` | Month boundaries, formatting |
| Build | EAS Build | Produces `.apk` / `.ipa` in the cloud — **no Mac needed for Android** |

**Alternative: Flutter.** Better raw performance and `flutter build apk` works locally with no cloud account. Pick it only if you already know Dart. Everything else in this document (data model, screens, phases) applies unchanged.

### Important reality check on builds

- **Android `.apk`** — easy. `eas build -p android --profile preview` returns a downloadable APK. Or build locally with Android Studio + JDK 17.
- **iOS** — you cannot produce an installable iOS app without an **Apple Developer account ($99/year)**. Options:
  - EAS cloud build → `.ipa` (needs the paid account, no Mac required)
  - Free simulator-only build for testing: `eas build -p ios --profile simulator`
  - Local Xcode build — requires a macOS machine

Plan Android first, iOS second.

---

## 2. Architecture

Four layers, strictly one-directional (UI never touches SQL).

```
┌──────────────────────────────────────────────┐
│  PRESENTATION   screens/ + components/       │
│  dumb views, no business logic               │
└───────────────────┬──────────────────────────┘
                    │ hooks
┌───────────────────▼──────────────────────────┐
│  STATE          store/ (Zustand)             │
│  in-memory cache, actions, derived totals    │
└───────────────────┬──────────────────────────┘
                    │ repository calls
┌───────────────────▼──────────────────────────┐
│  DOMAIN         domain/                      │
│  types, money math, month/period logic       │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│  DATA           db/ (SQLite + migrations)    │
│  repositories, schema, backup/restore        │
└──────────────────────────────────────────────┘
```

**Rules to enforce from day one**

1. Store money as **integers in the smallest unit (paise/cents)**. Never floats. `₹149.50` → `14950`.
2. All dates stored as `YYYY-MM-DD` text; timestamps as ISO-8601 UTC.
3. Every SQL call lives in `db/repositories/`. If a screen imports `expo-sqlite`, that's a bug.
4. The DB has a `schema_version` — all changes go through numbered migrations, never ad-hoc `ALTER`.

---

## 3. Data model

```sql
-- categories
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,          -- lucide icon name
  color       TEXT NOT NULL,          -- hex
  is_default  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- expenses
CREATE TABLE expenses (
  id           TEXT PRIMARY KEY,      -- uuid
  title        TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,      -- paise/cents
  category_id  TEXT REFERENCES categories(id),
  spent_on     TEXT NOT NULL,         -- 'YYYY-MM-DD'
  note         TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT                   -- soft delete
);
CREATE INDEX idx_expenses_spent_on ON expenses(spent_on);

-- diary
CREATE TABLE diary_entries (
  id          TEXT PRIMARY KEY,
  entry_date  TEXT NOT NULL,          -- 'YYYY-MM-DD'
  title       TEXT,
  body        TEXT NOT NULL,
  mood        TEXT,                   -- 'great' | 'ok' | 'low' | ...
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX idx_diary_entry_date ON diary_entries(entry_date);

-- settings
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Monthly total in one query:

```sql
SELECT SUM(amount_minor) AS total
FROM expenses
WHERE deleted_at IS NULL
  AND spent_on BETWEEN ? AND ?;   -- '2026-09-01', '2026-09-30'
```

Category breakdown:

```sql
SELECT c.name, c.color, SUM(e.amount_minor) AS total
FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
WHERE e.deleted_at IS NULL AND e.spent_on BETWEEN ? AND ?
GROUP BY e.category_id
ORDER BY total DESC;
```

---

## 4. Screens

| Screen | Contents |
|---|---|
| **Dashboard** (tab 1) | Today's total, this-month total card, 7-day mini bar chart, last 5 expenses, big `+` FAB |
| **Add / Edit Expense** (modal) | Numeric keypad for amount, title input, category chips, date picker, optional note. Two taps to save. |
| **Monthly** (tab 2) | Month swiper, total + daily average, bar chart per day, category donut, grouped-by-day list |
| **Diary** (tab 3) | Calendar strip or date list, entry cards, search, mood filter |
| **Diary Editor** (modal) | Date, title, multiline body, mood picker, autosave on blur |
| **Settings** (tab 4) | Currency, theme (light/dark/system), manage categories, diary lock toggle, Export JSON / CSV, Import backup, wipe data |

### Data-loss safety (do not skip)

Everything lives only on the phone. Uninstalling the app deletes it all. Ship **Export / Import backup** in Phase 4, not "later":
- `expo-file-system` writes a JSON dump
- `expo-sharing` lets the user send it to Drive / WhatsApp / Files
- Import reads it back and merges by `id`

---

## 5. Folder structure

Open the repo root in VS Code and this is what you'll see:

```
expense-diary/
├── app/                              # Expo Router — file = route
│   ├── _layout.tsx                   # root: providers, theme, DB init
│   ├── (tabs)/
│   │   ├── _layout.tsx               # bottom tab bar
│   │   ├── index.tsx                 # Dashboard
│   │   ├── monthly.tsx
│   │   ├── diary.tsx
│   │   └── settings.tsx
│   └── (modals)/
│       ├── expense/[id].tsx          # add ("new") + edit
│       └── diary/[id].tsx
│
├── src/
│   ├── components/
│   │   ├── ui/                       # Button, Card, Input, Sheet, Chip, Empty
│   │   ├── expense/                  # AmountKeypad, ExpenseRow, CategoryPicker
│   │   ├── diary/                    # EntryCard, MoodPicker, DateStrip
│   │   └── charts/                   # DailyBarChart, CategoryDonut
│   │
│   ├── db/
│   │   ├── client.ts                 # openDatabaseAsync + singleton
│   │   ├── migrations/
│   │   │   ├── 001_init.ts
│   │   │   └── index.ts              # runner + schema_version
│   │   ├── repositories/
│   │   │   ├── expenseRepo.ts
│   │   │   ├── diaryRepo.ts
│   │   │   ├── categoryRepo.ts
│   │   │   └── settingsRepo.ts
│   │   └── seed.ts                   # default categories
│   │
│   ├── domain/
│   │   ├── types.ts                  # Expense, DiaryEntry, Category
│   │   ├── money.ts                  # toMinor, format, parse
│   │   └── period.ts                 # monthRange, dayRange, labels
│   │
│   ├── store/
│   │   ├── expenseStore.ts
│   │   ├── diaryStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── hooks/
│   │   ├── useMonthlySummary.ts
│   │   ├── useDashboard.ts
│   │   └── useDiaryLock.ts
│   │
│   ├── services/
│   │   ├── backup.ts                 # export / import JSON
│   │   ├── csv.ts
│   │   └── lock.ts                   # passcode via secure-store
│   │
│   └── theme/
│       ├── colors.ts                 # light + dark palettes
│       ├── typography.ts
│       ├── spacing.ts
│       └── index.ts                  # useTheme()
│
├── assets/
│   ├── icon.png                      # 1024×1024
│   ├── splash.png
│   └── fonts/
│
├── app.json                          # name, bundle id, permissions
├── eas.json                          # apk / ipa build profiles
├── tsconfig.json                     # "@/*": ["./src/*"]
├── package.json
├── .gitignore
└── CLAUDE.md                         # project rules for Claude Code
```

### `eas.json` — the profile that gives you an APK

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "simulator": {
      "ios": { "simulator": true }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### `CLAUDE.md` — write this before you write code

Claude Code reads this file automatically on every session. Put the non-negotiables in it:

```md
# Project rules
- Money is ALWAYS integer minor units. Use src/domain/money.ts, never raw arithmetic on floats.
- No component imports expo-sqlite. All SQL lives in src/db/repositories/.
- Schema changes = a new numbered file in src/db/migrations/. Never edit an existing migration.
- Use the theme tokens in src/theme. No hardcoded hex or magic numbers in components.
- All dates are 'YYYY-MM-DD' strings. Timestamps are ISO-8601 UTC.
- TypeScript strict mode. No `any`.
```

---

## 6. Development agenda

Estimates assume part-time evenings. Halve them if you're full-time.

### Phase 0 — Setup (Day 1)
- `npx create-expo-app@latest expense-diary --template` (blank TypeScript)
- Install: `expo-router expo-sqlite expo-secure-store zustand date-fns react-native-gifted-charts expo-file-system expo-sharing`
- Path alias `@/*`, strict TS, folder skeleton, `CLAUDE.md`
- ✅ **Done when:** app runs in Expo Go on your phone

### Phase 1 — Data layer (Days 2–3)
- `db/client.ts`, migration runner, `001_init.ts`, category seed
- All four repositories with full CRUD + the monthly aggregate queries
- ✅ **Done when:** a temporary debug screen can insert and list rows that survive an app restart

### Phase 2 — Design system (Days 4–5)
- Colour palettes (light + dark), spacing scale, type scale
- `ui/` primitives: Button, Card, Input, Chip, Sheet, EmptyState
- Tab bar with icons
- ✅ **Done when:** four empty tabs look intentional and theme switching works

### Phase 3 — Expenses (Days 6–9)
- Add/Edit modal with the custom amount keypad (this is the screen you'll use 10×/day — make it fast)
- Dashboard: today + month totals, recent list, FAB
- Swipe-to-delete, edit on tap
- Monthly screen: month swiper, totals, daily bar chart, category donut, grouped list
- ✅ **Done when:** you can log a real expense in under 5 seconds

### Phase 4 — Diary + backup (Days 10–12)
- Diary list, editor with autosave, mood picker, search
- Optional passcode lock (secure-store + biometric)
- Export/Import JSON, Export CSV
- ✅ **Done when:** you can export a backup, wipe the app, and restore it

### Phase 5 — Polish (Days 13–15)
- App icon + splash, haptics, empty states, loading skeletons
- Dark mode pass, accessibility labels, keyboard handling
- Currency setting, first-run onboarding
- ✅ **Done when:** it feels like a shipped app, not a prototype

### Phase 6 — Android release (Days 16–17)
```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview    # → downloadable .apk
```
- Test the APK on a real device, not just Expo Go
- ✅ **Done when:** the APK installs and runs on your phone with no dev server

### Phase 7 — iOS (Days 18–20)
- Free path: `eas build -p ios --profile simulator`
- Real device: Apple Developer account → `eas build -p ios --profile preview` → TestFlight
- Fix safe-area insets, keyboard behaviour, and the back-gesture differences
- ✅ **Done when:** it runs on an iPhone

---

## 7. First commands

```bash
npx create-expo-app@latest expense-diary
cd expense-diary
npx expo install expo-router expo-sqlite expo-secure-store \
  expo-file-system expo-sharing expo-haptics
npm i zustand date-fns react-native-gifted-charts
code .
```

Then in VS Code, run `claude` in the terminal and start with:

> Read CLAUDE.md. Scaffold the folder structure from the plan, then implement Phase 1: the SQLite client, the migration runner, `001_init.ts`, and `expenseRepo.ts` with full CRUD plus `getMonthlyTotal` and `getCategoryBreakdown`.

Work one phase per session. Commit at the end of each phase so you can always roll back.
