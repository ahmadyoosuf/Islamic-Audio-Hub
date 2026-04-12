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
  - Quiz system (Tamil MCQ with 3 options using Tamil letters அ/ஆ/இ)
  - Favorites system (AsyncStorage)
  - Playback progress tracking (AsyncStorage)
  - Bottom navigation: Home, Favorites, Profile, About
  - Category browse screen, Track detail screen
  - React contexts: AppContext (favorites/progress/theme), AudioContext (audio playback)
- **Key packages**: expo-av, expo-linear-gradient, @react-native-async-storage/async-storage, expo-document-picker
- **Data architecture**: Unified storage (`data/unifiedStorage.ts`) is the single source of truth. Seeds 106 built-in tracks + quiz questions from `data/categories.ts` into AsyncStorage on first launch. All CRUD goes through unifiedStorage — no more direct imports of TRACKS/QUIZ_QUESTIONS in UI code.
  - Storage keys: `db_tracks_v4`, `db_quizzes_v4`, `db_initialized_v4`
  - Functions: `initDB`, `getAllTracks`, `getTracksByCategory`, `getTrackById`, `addTrack`, `updateTrack`, `deleteTrack`, `saveQuiz`, `updateQuiz`, `deleteQuiz`, `getQuizzesByTrack`, `getCategoryTrackCounts`
- **Admin CMS**: `app/admin/` — login (`admin@example.com` / `123456`), category view with edit/delete on all tracks, upload audio, edit audio with quiz management
- **5-tab nav**: Home, Favorites (பிடித்தவை), Profile (சுயவிவரம்), About (பற்றி), Request (கோரிக்கை — opens modal)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
