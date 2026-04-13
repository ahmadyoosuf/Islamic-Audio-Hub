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
  nameEn?: string;
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

// ─── BUILT-IN CATEGORIES ───────────────────────────────────────────────────

const BUILT_IN_CATS: StoredCategory[] = [
  { id: 'quran',  name: 'குர்ஆன் விளக்கம்',   icon: '📖', color: '#f0bc42', sortOrder: 1, createdAt: 0 },
  { id: 'hadith', name: 'ஹதீஸ் விளக்கம்',     icon: '📜', color: '#4ade80', sortOrder: 2, createdAt: 0 },
  { id: 'iman',   name: 'ஈமான் அடிப்படைகள்', icon: '✨', color: '#60a5fa', description: 'நம்பிக்கையின் அடிப்படைகளை அல்லாஹ்வின் 99 பெயர்களுடன் அறிக', sortOrder: 3, createdAt: 0 },
  { id: 'seerah', name: 'நபி வரலாறு',         icon: '🌙', color: '#f472b6', sortOrder: 4, createdAt: 0 },
  { id: 'daily',  name: 'அன்றாட வழிகாட்டி', icon: '☀️', color: '#fb923c', description: 'தினமும் படிக்க வேண்டிய துஆக்கள் மற்றும் வழிகாட்டல்', sortOrder: 5, createdAt: 0 },
];

// ─── SAFE JSON PARSE ───────────────────────────────────────────────────────

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

export async function initDB(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit().catch(err => {
    // Reset so next call can retry instead of always returning rejected promise
    _initPromise = null;
    console.warn('[unifiedStorage] initDB failed, will retry on next call:', err);
  });
  return _initPromise;
}

async function _doInit(): Promise<void> {
  try {
    const flag = await AsyncStorage.getItem(DB_INIT_KEY);
    if (flag === '1') {
      await _ensureCategorySeeded();
      await _migrateQuizData();
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
          duration: t.duration ?? 0,
          audioUrl: t.audioUrl ?? '',
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
    const existingTracks: any[] = safeParseJSON(existingTracksRaw, []);
    const existingQuizzesRaw = await AsyncStorage.getItem('custom_quizzes');
    const existingQuizzes: any[] = safeParseJSON(existingQuizzesRaw, []);

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
  } catch (err) {
    console.error('[unifiedStorage] _doInit error:', err);
    throw err;
  }
}

async function _ensureCategorySeeded(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DB_CATS_KEY);
    const cats = safeParseJSON<StoredCategory[]>(raw, []);
    if (cats.length === 0) {
      await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(BUILT_IN_CATS));
    }
  } catch (err) {
    console.warn('[unifiedStorage] _ensureCategorySeeded error:', err);
  }
}

async function _migrateQuizData(): Promise<void> {
  try {
    const { QUIZ_QUESTIONS } = require('./categories');
    const raw = await AsyncStorage.getItem(DB_QUIZZES_KEY);
    const existing: UnifiedQuiz[] = safeParseJSON<UnifiedQuiz[]>(raw, []);
    const newItems: UnifiedQuiz[] = [];
    let idx = Date.now();

    for (const [trackId, qs] of Object.entries(QUIZ_QUESTIONS as Record<string, any[]>)) {
      const forTrack = existing.filter((q) => q.trackId === trackId);
      for (let i = forTrack.length; i < qs.length; i++) {
        const q = (qs as any[])[i];
        newItems.push({
          id: `bq_${trackId}_m_${idx++}`,
          trackId,
          categoryId: trackId.split('-')[0],
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          addedAt: Date.now(),
        });
      }
    }

    if (newItems.length > 0) {
      const fresh = safeParseJSON<UnifiedQuiz[]>(
        await AsyncStorage.getItem(DB_QUIZZES_KEY),
        [],
      );
      await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify([...fresh, ...newItems]));
      const tracksRaw = await AsyncStorage.getItem(DB_TRACKS_KEY);
      const tracks: UnifiedTrack[] = safeParseJSON<UnifiedTrack[]>(tracksRaw, []);
      const updatedTracks = tracks.map((t) =>
        QUIZ_QUESTIONS[t.id]?.length ? { ...t, hasQuiz: true } : t,
      );
      await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(updatedTracks));
    }
  } catch (err) {
    console.warn('[unifiedStorage] _migrateQuizData error:', err);
  }
}

// ─── TRACKS ────────────────────────────────────────────────────────────────

export async function getAllTracks(): Promise<UnifiedTrack[]> {
  try {
    await initDB();
    const raw = await AsyncStorage.getItem(DB_TRACKS_KEY);
    return safeParseJSON<UnifiedTrack[]>(raw, []);
  } catch {
    return [];
  }
}

export async function getTracksByCategory(categoryId: string): Promise<UnifiedTrack[]> {
  try {
    const all = await getAllTracks();
    return all.filter(t => t.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return [];
  }
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
  try {
    const all = await getAllTracks();
    const map = new Map(updates.map(u => [u.id, u.sortOrder]));
    await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all.map(t => map.has(t.id) ? { ...t, sortOrder: map.get(t.id)! } : t)));
  } catch (err) {
    console.warn('[unifiedStorage] batchUpdateSortOrder error:', err);
  }
}

export async function getTrackById(id: string): Promise<UnifiedTrack | null> {
  try {
    const all = await getAllTracks();
    return all.find(t => t.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function addTrack(track: UnifiedTrack): Promise<void> {
  const all = await getAllTracks();
  all.push(track);
  await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all));
}

export async function updateTrack(id: string, updates: Partial<UnifiedTrack>): Promise<void> {
  try {
    const all = await getAllTracks();
    const idx = all.findIndex(t => t.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('[unifiedStorage] updateTrack error:', err);
  }
}

export async function deleteTrack(id: string): Promise<void> {
  try {
    const all = await getAllTracks();
    await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(all.filter(t => t.id !== id)));
  } catch (err) {
    console.warn('[unifiedStorage] deleteTrack error:', err);
  }
}

export async function getCategoryTrackCounts(): Promise<Record<string, number>> {
  try {
    const all = await getAllTracks();
    const counts: Record<string, number> = {};
    for (const t of all) { counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1; }
    return counts;
  } catch {
    return {};
  }
}

// ─── QUIZZES ───────────────────────────────────────────────────────────────

export async function getQuizzesByTrack(trackId: string): Promise<UnifiedQuiz[]> {
  try {
    await initDB();
    const raw = await AsyncStorage.getItem(DB_QUIZZES_KEY);
    const all: UnifiedQuiz[] = safeParseJSON(raw, []);
    return all.filter(q => q.trackId === trackId);
  } catch {
    return [];
  }
}

export async function getAllQuizzes(): Promise<UnifiedQuiz[]> {
  try {
    await initDB();
    const raw = await AsyncStorage.getItem(DB_QUIZZES_KEY);
    return safeParseJSON<UnifiedQuiz[]>(raw, []);
  } catch {
    return [];
  }
}

export async function saveQuiz(quiz: UnifiedQuiz): Promise<void> {
  const all = await getAllQuizzes();
  all.push(quiz);
  await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify(all));
  if (quiz.trackId) await updateTrack(quiz.trackId, { hasQuiz: true });
}

export async function updateQuiz(id: string, updates: Partial<UnifiedQuiz>): Promise<void> {
  try {
    const all = await getAllQuizzes();
    const idx = all.findIndex(q => q.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('[unifiedStorage] updateQuiz error:', err);
  }
}

export async function deleteQuiz(id: string): Promise<void> {
  try {
    const all = await getAllQuizzes();
    const quiz = all.find(q => q.id === id);
    const filtered = all.filter(q => q.id !== id);
    await AsyncStorage.setItem(DB_QUIZZES_KEY, JSON.stringify(filtered));
    if (quiz?.trackId) {
      const remaining = filtered.filter(q => q.trackId === quiz.trackId);
      if (remaining.length === 0) await updateTrack(quiz.trackId, { hasQuiz: false });
    }
  } catch (err) {
    console.warn('[unifiedStorage] deleteQuiz error:', err);
  }
}

// ─── CATEGORIES ────────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<StoredCategory[]> {
  try {
    await initDB();
    const raw = await AsyncStorage.getItem(DB_CATS_KEY);
    const cats = safeParseJSON<StoredCategory[]>(raw, []);
    if (cats.length === 0) return BUILT_IN_CATS;
    return cats.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return BUILT_IN_CATS;
  }
}

export async function getCategoryById(id: string): Promise<StoredCategory | null> {
  try {
    const all = await getAllCategories();
    return all.find(c => c.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function addCategory(data: Omit<StoredCategory, 'id' | 'createdAt'>): Promise<StoredCategory> {
  const all = await getAllCategories();
  const cat: StoredCategory = {
    ...data,
    id: `cat_${Date.now()}`,
    createdAt: Date.now(),
  };
  all.push(cat);
  await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(all));
  return cat;
}

export async function updateCategory(id: string, updates: Partial<StoredCategory>): Promise<void> {
  try {
    const all = await getAllCategories();
    const idx = all.findIndex(c => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('[unifiedStorage] updateCategory error:', err);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const all = await getAllCategories();
    await AsyncStorage.setItem(DB_CATS_KEY, JSON.stringify(all.filter(c => c.id !== id)));
    // cascade: remove all tracks in this category
    const tracks = await getAllTracks();
    await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(tracks.filter(t => t.categoryId !== id)));
    // cascade: remove subcategories
    const subs = await getSubcategoriesByCategory(id);
    const allSubs = safeParseJSON<StoredSubcategory[]>(await AsyncStorage.getItem(DB_SUBS_KEY), []);
    await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(allSubs.filter(s => s.categoryId !== id)));
  } catch (err) {
    console.warn('[unifiedStorage] deleteCategory error:', err);
  }
}

// ─── SUBCATEGORIES ─────────────────────────────────────────────────────────

export async function getSubcategoriesByCategory(categoryId: string): Promise<StoredSubcategory[]> {
  try {
    const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
    const all = safeParseJSON<StoredSubcategory[]>(raw, []);
    return all.filter(s => s.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return [];
  }
}

export async function addSubcategory(data: Omit<StoredSubcategory, 'id' | 'createdAt'>): Promise<StoredSubcategory> {
  const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
  const all = safeParseJSON<StoredSubcategory[]>(raw, []);
  const sub: StoredSubcategory = {
    ...data,
    id: `sub_${Date.now()}`,
    createdAt: Date.now(),
  };
  all.push(sub);
  await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(all));
  return sub;
}

export async function updateSubcategory(id: string, updates: Partial<StoredSubcategory>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
    const all = safeParseJSON<StoredSubcategory[]>(raw, []);
    const idx = all.findIndex(s => s.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(all));
    }
  } catch (err) {
    console.warn('[unifiedStorage] updateSubcategory error:', err);
  }
}

export async function deleteSubcategory(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DB_SUBS_KEY);
    const all = safeParseJSON<StoredSubcategory[]>(raw, []);
    await AsyncStorage.setItem(DB_SUBS_KEY, JSON.stringify(all.filter(s => s.id !== id)));
    // unassign tracks that were in this subcategory
    const tracks = await getAllTracks();
    const updated = tracks.map(t => t.subcategoryId === id ? { ...t, subcategoryId: undefined } : t);
    await AsyncStorage.setItem(DB_TRACKS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[unifiedStorage] deleteSubcategory error:', err);
  }
}

export async function resetDB(): Promise<void> {
  _initPromise = null;
  await AsyncStorage.multiRemove([DB_TRACKS_KEY, DB_QUIZZES_KEY, DB_INIT_KEY, DB_CATS_KEY, DB_SUBS_KEY]);
}
