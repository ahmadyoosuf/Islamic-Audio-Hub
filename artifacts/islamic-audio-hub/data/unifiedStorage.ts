import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_TRACKS_KEY = 'db_tracks_v4';
const DB_QUIZZES_KEY = 'db_quizzes_v4';
const DB_INIT_KEY = 'db_initialized_v4';

export interface UnifiedTrack {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  duration: number;
  audioUrl: string;
  viewCount: number;
  isPremium: boolean;
  sortOrder: number;
  prizeEnabled?: boolean;
  hasQuiz?: boolean;
  description?: string;
  fileName?: string;
  uploadedAt: number;
  isBuiltIn: boolean;
}

export interface UnifiedQuiz {
  id: string;
  trackId: string;
  categoryId: string;
  question: string;
  options: string[];
  correctIndex: number;
  addedAt: number;
}

let _initPromise: Promise<void> | null = null;

export async function initDB(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit(): Promise<void> {
  const flag = await AsyncStorage.getItem(DB_INIT_KEY);
  if (flag === '1') return;

  const { TRACKS_BY_CATEGORY, QUIZ_QUESTIONS } = require('./categories');

  const allTracks: UnifiedTrack[] = Object.values(TRACKS_BY_CATEGORY as Record<string, any[]>)
    .flat()
    .map((t: any, _, arr) => {
      const hasQ = !!(QUIZ_QUESTIONS[t.id]?.length);
      return {
        id: t.id,
        title: t.title,
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        duration: t.duration,
        audioUrl: t.audioUrl,
        viewCount: t.viewCount ?? 0,
        isPremium: t.isPremium ?? false,
        sortOrder: t.sortOrder ?? 0,
        prizeEnabled: t.prizeEnabled ?? false,
        hasQuiz: hasQ,
        description: '',
        fileName: undefined,
        uploadedAt: Date.now(),
        isBuiltIn: true,
      };
    });

  const allQuizzes: UnifiedQuiz[] = [];
  let idx = 0;
  for (const [trackId, qs] of Object.entries(QUIZ_QUESTIONS as Record<string, any[]>)) {
    for (const q of qs) {
      allQuizzes.push({
        id: `bq_${trackId}_${idx++}`,
        trackId,
        categoryId: trackId.split('-')[0],
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        addedAt: Date.now(),
      });
    }
  }

  const existingTracksRaw = await AsyncStorage.getItem('custom_tracks');
  const existingTracks: any[] = existingTracksRaw ? JSON.parse(existingTracksRaw) : [];

  const existingQuizzesRaw = await AsyncStorage.getItem('custom_quizzes');
  const existingQuizzes: any[] = existingQuizzesRaw ? JSON.parse(existingQuizzesRaw) : [];

  const migratedCustomTracks: UnifiedTrack[] = existingTracks.map((t: any) => ({
    id: t.id,
    title: t.title,
    categoryId: t.categoryId,
    categoryName: t.categoryName,
    duration: t.duration ?? 0,
    audioUrl: t.audioUri ?? t.audioUrl ?? '',
    viewCount: 0,
    isPremium: false,
    sortOrder: 9999,
    hasQuiz: false,
    description: t.description ?? '',
    fileName: t.fileName,
    uploadedAt: t.uploadedAt ?? Date.now(),
    isBuiltIn: false,
  }));

  const migratedCustomQuizzes: UnifiedQuiz[] = existingQuizzes.map((q: any) => ({
    id: q.id,
    trackId: q.trackId ?? '',
    categoryId: q.categoryId ?? '',
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    addedAt: q.addedAt ?? Date.now(),
  }));

  const finalTracks = [...allTracks, ...migratedCustomTracks];
  const finalQuizzes = [...allQuizzes, ...migratedCustomQuizzes];

  await AsyncStorage.multiSet([
    [DB_TRACKS_KEY, JSON.stringify(finalTracks)],
    [DB_QUIZZES_KEY, JSON.stringify(finalQuizzes)],
    [DB_INIT_KEY, '1'],
  ]);
}

export async function getAllTracks(): Promise<UnifiedTrack[]> {
  await initDB();
  const raw = await AsyncStorage.getItem(DB_TRACKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getTracksByCategory(categoryId: string): Promise<UnifiedTrack[]> {
  const all = await getAllTracks();
  return all
    .filter(t => t.categoryId === categoryId)
    .sort((a, b) => (a.isBuiltIn === b.isBuiltIn ? a.sortOrder - b.sortOrder : a.isBuiltIn ? -1 : 1));
}

export async function getTrackById(id: string): Promise<UnifiedTrack | null> {
  const all = await getAllTracks();
  return all.find(t => t.id === id) ?? null;
}

export async function addTrack(track: UnifiedTrack): Promise<void> {
  const all = await getAllTracks();
  all.push(track);
  await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all));
}

export async function updateTrack(id: string, updates: Partial<UnifiedTrack>): Promise<void> {
  const all = await getAllTracks();
  const idx = all.findIndex(t => t.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all));
  }
}

export async function deleteTrack(id: string): Promise<void> {
  const all = await getAllTracks();
  await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all.filter(t => t.id !== id)));
}

export async function getQuizzesByTrack(trackId: string): Promise<UnifiedQuiz[]> {
  await initDB();
  const raw = await AsyncStorage.getItem(DB_QUIZZES_KEY);
  const all: UnifiedQuiz[] = raw ? JSON.parse(raw) : [];
  return all.filter(q => q.trackId === trackId);
}

export async function getAllQuizzes(): Promise<UnifiedQuiz[]> {
  await initDB();
  const raw = await AsyncStorage.getItem(DB_QUIZZES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveQuiz(quiz: UnifiedQuiz): Promise<void> {
  const all = await getAllQuizzes();
  all.push(quiz);
  await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify(all));
  await updateTrack(quiz.trackId, { hasQuiz: true });
}

export async function updateQuiz(id: string, updates: Partial<UnifiedQuiz>): Promise<void> {
  const all = await getAllQuizzes();
  const idx = all.findIndex(q => q.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify(all));
  }
}

export async function deleteQuiz(id: string): Promise<void> {
  const all = await getAllQuizzes();
  const quiz = all.find(q => q.id === id);
  const filtered = all.filter(q => q.id !== id);
  await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify(filtered));
  if (quiz?.trackId) {
    const remaining = filtered.filter(q => q.trackId === quiz.trackId);
    if (remaining.length === 0) await updateTrack(quiz.trackId, { hasQuiz: false });
  }
}

export async function getCategoryTrackCounts(): Promise<Record<string, number>> {
  const all = await getAllTracks();
  const counts: Record<string, number> = {};
  for (const t of all) {
    counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1;
  }
  return counts;
}

export async function resetDB(): Promise<void> {
  _initPromise = null;
  await AsyncStorage.multiRemove([DB_TRACKS_KEY, DB_QUIZZES_KEY, DB_INIT_KEY]);
}
