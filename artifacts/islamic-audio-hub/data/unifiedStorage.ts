import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_TRACKS_KEY   = 'db_tracks_v4';
const DB_QUIZZES_KEY  = 'db_quizzes_v4';
const DB_INIT_KEY     = 'db_initialized_v4';
const DB_CATS_KEY     = 'db_categories_v1';
const DB_SUBS_KEY     = 'db_subcategories_v1';

// ─── INTERFACES ────────────────────────────────────────────────────────────

export interface StoredCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  sortOrder: number;
  createdAt: number;
}

export interface StoredSubcategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  createdAt: number;
}

export interface UnifiedTrack {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
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

// ─── BUILT-IN CATEGORIES (migration seed) ─────────────────────────────────

const BUILT_IN_CATS: StoredCategory[] = [
  { id: 'quran',  name: 'குர்ஆன் விளக்கம்',   icon: '📖', color: '#f0bc42', sortOrder: 1, createdAt: 0 },
  { id: 'hadith', name: 'ஹதீஸ் விளக்கம்',     icon: '📜', color: '#4ade80', sortOrder: 2, createdAt: 0 },
  { id: 'iman',   name: 'ஈமான் அடிப்படைகள்', icon: '✨', color: '#60a5fa', description: 'நம்பிக்கையின் அடிப்படைகளை அல்லாஹ்வின் 99 பெயர்களுடன் அறிக', sortOrder: 3, createdAt: 0 },
  { id: 'seerah', name: 'நபி வரலாறு',         icon: '🌙', color: '#f472b6', sortOrder: 4, createdAt: 0 },
  { id: 'daily',  name: 'அன்றாட வழிகாட்டி', icon: '☀️', color: '#fb923c', description: 'தினமும் படிக்க வேண்டிய துஆக்கள் மற்றும் வழிகாட்டல்', sortOrder: 5, createdAt: 0 },
];

// ─── INIT ──────────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

export async function initDB(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit(): Promise<void> {
  const flag = await AsyncStorage.getItem(DB_INIT_KEY);
  if (flag === '1') {
    await _ensureCategorySeeded();
    return;
  }

  const { TRACKS_BY_CATEGORY, QUIZ_QUESTIONS } = require('./categories');

  const allTracks: UnifiedTrack[] = Object.values(TRACKS_BY_CATEGORY as Record<string, any[]>)
    .flat()
    .map((t: any) => {
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
    id: t.id, title: t.title, categoryId: t.categoryId, categoryName: t.categoryName,
    duration: t.duration ?? 0, audioUrl: t.audioUri ?? t.audioUrl ?? '',
    viewCount: 0, isPremium: false, sortOrder: 9999, hasQuiz: false,
    description: t.description ?? '', fileName: t.fileName,
    uploadedAt: t.uploadedAt ?? Date.now(), isBuiltIn: false,
  }));

  const migratedCustomQuizzes: UnifiedQuiz[] = existingQuizzes.map((q: any) => ({
    id: q.id, trackId: q.trackId ?? '', categoryId: q.categoryId ?? '',
    question: q.question, options: q.options, correctIndex: q.correctIndex,
    addedAt: q.addedAt ?? Date.now(),
  }));

  await AsyncStorage.multiSet([
    [DB_TRACKS_KEY, JSON.stringify([...allTracks, ...migratedCustomTracks])],
    [DB_QUIZZES_KEY, JSON.stringify([...allQuizzes, ...migratedCustomQuizzes])],
    [DB_CATS_KEY, JSON.stringify(BUILT_IN_CATS)],
    [DB_INIT_KEY, '1'],
  ]);
}

async function _ensureCategorySeeded(): Promise<void> {
  const raw = await AsyncStorage.getItem(DB_CATS_KEY);
  if (!raw || JSON.parse(raw).length === 0) {
    await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(BUILT_IN_CATS));
  }
}

// ─── TRACKS ────────────────────────────────────────────────────────────────

export async function getAllTracks(): Promise<UnifiedTrack[]> {
  await initDB();
  const raw = await AsyncStorage.getItem(DB_TRACKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getTracksByCategory(categoryId: string): Promise<UnifiedTrack[]> {
  const all = await getAllTracks();
  return all.filter(t => t.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getTracksByCategoryAndSubcategory(
  categoryId: string,
  subcategoryId: string | null,
): Promise<UnifiedTrack[]> {
  const all = await getTracksByCategory(categoryId);
  if (!subcategoryId) return all;
  return all.filter(t => t.subcategoryId === subcategoryId);
}

export async function batchUpdateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const all = await getAllTracks();
  const map = new Map(updates.map(u => [u.id, u.sortOrder]));
  await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all.map(t => map.has(t.id) ? { ...t, sortOrder: map.get(t.id)! } : t)));
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

export async function getCategoryTrackCounts(): Promise<Record<string, number>> {
  const all = await getAllTracks();
  const counts: Record<string, number> = {};
  for (const t of all) { counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1; }
  return counts;
}

// ─── QUIZZES ───────────────────────────────────────────────────────────────

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

// ─── CATEGORIES ────────────────────────────────────────────────────────────

function catUid(): string {
  return 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function getAllCategories(): Promise<StoredCategory[]> {
  await initDB();
  const raw = await AsyncStorage.getItem(DB_CATS_KEY);
  const cats: StoredCategory[] = raw ? JSON.parse(raw) : [];
  if (cats.length === 0) {
    await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(BUILT_IN_CATS));
    return [...BUILT_IN_CATS];
  }
  return cats.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategoryById(id: string): Promise<StoredCategory | null> {
  const all = await getAllCategories();
  return all.find(c => c.id === id) ?? null;
}

export async function addCategory(data: Omit<StoredCategory, 'id' | 'createdAt'>): Promise<StoredCategory> {
  const all = await getAllCategories();
  const item: StoredCategory = { ...data, id: catUid(), createdAt: Date.now() };
  all.push(item);
  await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(all));
  return item;
}

export async function updateCategory(id: string, updates: Partial<StoredCategory>): Promise<void> {
  const raw = await AsyncStorage.getItem(DB_CATS_KEY);
  const all: StoredCategory[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex(c => c.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(all));
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(DB_CATS_KEY);
  const all: StoredCategory[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(all.filter(c => c.id !== id)));
  const subs = await getSubcategoriesByCategory(id);
  for (const s of subs) await deleteSubcategory(s.id);
}

// ─── SUBCATEGORIES ─────────────────────────────────────────────────────────

function subUid(): string {
  return 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function getSubcategoriesByCategory(categoryId: string): Promise<StoredSubcategory[]> {
  const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
  const all: StoredSubcategory[] = raw ? JSON.parse(raw) : [];
  return all.filter(s => s.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addSubcategory(data: Omit<StoredSubcategory, 'id' | 'createdAt'>): Promise<StoredSubcategory> {
  const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
  const all: StoredSubcategory[] = raw ? JSON.parse(raw) : [];
  const item: StoredSubcategory = { ...data, id: subUid(), createdAt: Date.now() };
  all.push(item);
  await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(all));
  return item;
}

export async function updateSubcategory(id: string, updates: Partial<StoredSubcategory>): Promise<void> {
  const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
  const all: StoredSubcategory[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex(s => s.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(all));
  }
}

export async function deleteSubcategory(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
  const all: StoredSubcategory[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(all.filter(s => s.id !== id)));
  const tracks = await getAllTracks();
  const affected = tracks.filter(t => t.subcategoryId === id);
  for (const t of affected) await updateTrack(t.id, { subcategoryId: undefined });
}

// ─── RESET ─────────────────────────────────────────────────────────────────

export async function resetDB(): Promise<void> {
  _initPromise = null;
  await AsyncStorage.multiRemove([DB_TRACKS_KEY, DB_QUIZZES_KEY, DB_INIT_KEY, DB_CATS_KEY, DB_SUBS_KEY]);
}
