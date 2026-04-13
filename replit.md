# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Islamic Audio Hub (`artifacts/islamic-audio-hub`)
- **Type**: Expo mobile app
- **Purpose**: Tamil Islamic audio learning platform
- **Theme**: Dark charcoal + gold/amber accent, with system color scheme support
- **Features**:
  - 5 categories: Quran Tafsir, Hadith, Iman, Seerah, Daily Guide (106 tracks)
  - Global audio player (mini + full modal) with playback speed control (0.5x–2x)
  - **Quiz system**: 3-level progressive quiz (Level 1: 5Q, Level 2: 10Q, Level 3: 15Q) — levels unlock sequentially, shuffled questions, A/B/C/D options, Web Audio API tones + haptics, score & streak tracking, progress saved per-track-per-level in AsyncStorage key `quiz_level_progress_v1`
  - Favorites system (AsyncStorage)
  - Playback progress tracking (AsyncStorage)
  - Bottom navigation: Home, Favorites, Profile, About
  - Category browse screen, Track detail screen
  - React contexts: AppContext (favorites/progress/theme), AudioContext (audio playback)
- **Key packages**: expo-av, expo-linear-gradient, @react-native-async-storage/async-storage, expo-document-picker
- **Data architecture**: Unified storage (`data/unifiedStorage.ts`) is the single source of truth. Seeds 106 built-in tracks + quiz questions from `data/categories.ts` into AsyncStorage on first launch. All CRUD goes through unifiedStorage — no more direct imports of TRACKS/QUIZ_QUESTIONS in UI code.
  - Storage keys: `db_tracks_v4`, `db_quizzes_v4`, `db_initialized_v4`
  - Functions: `initDB`, `getAllTracks`, `getTracksByCategory`, `getTrackById`, `addTrack`, `updateTrack`, `deleteTrack`, `saveQuiz`, `updateQuiz`, `deleteQuiz`, `getQuizzesByTrack`, `getCategoryTrackCounts`
- **Admin CMS (Audio)**: `app/admin/` — login (`admin@example.com` / `123456`), category view with drag-to-reorder, edit/delete all tracks, upload audio, edit audio with quiz management
- **Library CMS (Hierarchical)**: 5-level content hierarchy stored in AsyncStorage (`data/cmsStorage.ts`):
  - Storage keys: `cms_categories_v1`, `cms_subcategories_v1`, `cms_cards_v1`, `cms_tracks_v1`, `cms_quizzes_v1`
  - **Admin flow**: `/admin/cms` → category CRUD → `/admin/cms/sub` → subcategory CRUD → `/admin/cms/cards` → card CRUD (with track counts) → `/admin/cms/card` → track management (add/edit/delete/reorder + inline quiz editor)
  - **Frontend flow**: `/cms` → category grid → `/cms/sub` → subcategory list → `/cms/cards` → card list (with track count badge) → `/cms/card` → track list → `/cms/track/[id]` → audio player with quiz modal + share
  - Home screen has Library banner (purple, "புதியது" badge) below the 5 categories
- **5-tab nav**: Home, Favorites (பிடித்தவை), Profile (சுயவிவரம்), About (பற்றி), Request (கோரிக்கை — opens modal)
- **Firebase Integration** (added):
  - Project: `bismillah-573d3` (Firebase config in `services/firebase.config.ts`)
  - Firestore collections: `categories`, `subcategories`, `cards`
  - CRUD functions in `services/firebase.firestore.ts`: `addCategory`, `addSubCategory`, `addCard`, `updateCard`, `deleteCard`, `getCategories`, `getSubcategories`, `getCards`
  - Real-time listeners: `subscribeCategories`, `subscribeSubcategories`, `subscribeCards`, `subscribeAllCards` (using onSnapshot)
  - Firebase Storage audio upload in `services/firebase.storage.ts`: `uploadAudio` (with progress), `deleteAudio`, `getAudioUrl`
  - React hooks in `hooks/useFirebaseData.ts`: `useCategories`, `useSubcategories`, `useCards`, `useAllCards`
  - Data strategy: Firebase is primary source; seeded AsyncStorage data is fallback (shown immediately while Firebase loads)
  - Firebase CMS admin panel: `app/admin/firebase/index.tsx` — 3-tab UI (Categories / Subcategories / Cards) with full CRUD + audio upload
  - Metro config: `unstable_enablePackageExports: true` required for Firebase v11 conditional exports; `_tmp_\d+` blockList prevents pnpm temp dir watcher crashes
  - **IMPORTANT**: Must create Firestore database in Firebase Console and set security rules before data flows. Firebase Storage bucket must also be enabled.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
