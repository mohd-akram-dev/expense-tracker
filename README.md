# Expense Diary

Offline-first expense tracker and personal diary. Android + iOS from one Expo codebase.
All data lives on the device in SQLite — no server, no account, no sync.

Architecture and phase plan: [`docs/EXPENSE_DIARY_APP_PLAN.md`](docs/EXPENSE_DIARY_APP_PLAN.md)
Project rules: [`AGENTS.md`](AGENTS.md)

## Develop

```bash
npm install
npm start              # then scan the QR with Expo Go
npm run typecheck
npm run lint
```

If your phone and PC are on different networks (or the QR just hangs), use a tunnel:

```bash
npx expo start --tunnel
```

## Build an installable Android APK

Compiles on Expo's servers. Needs a free Expo account — no Android Studio, no JDK, no Mac.

```bash
npx eas-cli@latest login                              # or `register` for a new account
npx eas-cli@latest init                               # links the project, writes the project id
npx eas-cli@latest build -p android --profile preview
```

The first build asks **"Generate a new Android Keystore?"** — answer **yes**. EAS creates and
stores the signing key for you. Keep the same key for every later build or Android will refuse
to install the update over the old one.

The build takes roughly 10–20 minutes on the free queue. When it finishes the CLI prints a URL,
and the build also appears at <https://expo.dev> under your account. Open that URL on the phone
and tap download, or scan the QR the CLI prints.

On the phone, allow **"Install unknown apps"** for your browser when Android prompts — the APK
is not from the Play Store, so this is expected.

### Checking a build later

```bash
npx eas-cli@latest build:list
npx eas-cli@latest build:view
```

## Build profiles

| Profile | Output | Use for |
|---|---|---|
| `preview` | `.apk` | sideloading onto your own phone |
| `development` | dev-client `.apk` | debugging with native modules Expo Go lacks |
| `production` | `.aab` | Play Store upload |
| `simulator` | iOS `.app` | free iOS simulator testing, needs a Mac to run |

## iOS

A build that installs on a real iPhone requires an **Apple Developer account ($99/year)**:

```bash
npx eas-cli@latest build -p ios --profile preview
```

Without one, the free option is `--profile simulator`, which only runs in Xcode's simulator
on macOS.
