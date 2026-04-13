import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase.config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FBCategory {
  id:           string;
  name:         string;
  nameEn:       string;
  icon:         string;
  color:        string;
  description:  string;
  sortOrder:    number;
  createdAt:    number;
}

export interface FBSubcategory {
  id:           string;
  categoryId:   string;
  name:         string;
  nameEn:       string;
  sortOrder:    number;
  createdAt:    number;
}

export interface FBQuizQuestion {
  question:     string;
  options:      string[];
  correctIndex: number;
}

export interface FBCard {
  id:            string;
  categoryId:    string;
  subcategoryId: string;
  titleTa:       string;
  titleEn:       string;
  audioUrl:      string;
  duration:      number;
  description:   string;
  isPremium:     boolean;
  hasQuiz:       boolean;
  viewCount:     number;
  sortOrder:     number;
  quiz:          FBQuizQuestion[];
  createdAt:     number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToMs(val: unknown): number {
  if (!val) return Date.now();
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === "number") return val;
  return Date.now();
}

function bySort(a: { sortOrder: number }, b: { sortOrder: number }) {
  return a.sortOrder - b.sortOrder;
}

function toFBCategory(id: string, data: Record<string, any>): FBCategory {
  return {
    id,
    name:        data.name        ?? "",
    nameEn:      data.nameEn      ?? "",
    icon:        data.icon        ?? "📖",
    color:       data.color       ?? "#1a7a4a",
    description: data.description ?? "",
    sortOrder:   data.sortOrder   ?? 0,
    createdAt:   tsToMs(data.createdAt),
  };
}

function toFBSubcategory(id: string, data: Record<string, any>): FBSubcategory {
  return {
    id,
    categoryId: data.categoryId ?? "",
    name:       data.name       ?? "",
    nameEn:     data.nameEn     ?? "",
    sortOrder:  data.sortOrder  ?? 0,
    createdAt:  tsToMs(data.createdAt),
  };
}

function toFBCard(id: string, data: Record<string, any>): FBCard {
  return {
    id,
    categoryId:    data.categoryId    ?? "",
    subcategoryId: data.subcategoryId ?? "",
    titleTa:       data.titleTa       ?? "",
    titleEn:       data.titleEn       ?? "",
    audioUrl:      data.audioUrl      ?? "",
    duration:      data.duration      ?? 0,
    description:   data.description   ?? "",
    isPremium:     data.isPremium      ?? false,
    hasQuiz:       data.hasQuiz        ?? false,
    viewCount:     data.viewCount      ?? 0,
    sortOrder:     data.sortOrder      ?? 0,
    quiz:          Array.isArray(data.quiz) ? data.quiz : [],
    createdAt:     tsToMs(data.createdAt),
  };
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export async function addCategory(
  data: Omit<FBCategory, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "categories"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<FBCategory, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "categories", id), data);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

export async function getCategories(): Promise<FBCategory[]> {
  const snap = await getDocs(collection(db, "categories"));
  return snap.docs
    .map(d => toFBCategory(d.id, d.data() as Record<string, any>))
    .sort(bySort);
}

// ─── Subcategory CRUD ─────────────────────────────────────────────────────────

export async function addSubCategory(
  data: Omit<FBSubcategory, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "subcategories"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSubCategory(
  id: string,
  data: Partial<Omit<FBSubcategory, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "subcategories", id), data);
}

export async function deleteSubCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "subcategories", id));
}

export async function getSubcategories(categoryId?: string): Promise<FBSubcategory[]> {
  const snap = await getDocs(collection(db, "subcategories"));
  const all = snap.docs
    .map(d => toFBSubcategory(d.id, d.data() as Record<string, any>))
    .sort(bySort);
  return categoryId ? all.filter(s => s.categoryId === categoryId) : all;
}

// ─── Card CRUD ────────────────────────────────────────────────────────────────

export async function addCard(
  data: Omit<FBCard, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "cards"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCard(
  id: string,
  data: Partial<Omit<FBCard, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "cards", id), data);
}

export async function deleteCard(id: string): Promise<void> {
  await deleteDoc(doc(db, "cards", id));
}

export async function getCardById(id: string): Promise<FBCard | null> {
  const snap = await getDoc(doc(db, "cards", id));
  if (!snap.exists()) return null;
  return toFBCard(snap.id, snap.data() as Record<string, any>);
}

export async function getCards(subcategoryId?: string, categoryId?: string): Promise<FBCard[]> {
  const snap = await getDocs(collection(db, "cards"));
  let all = snap.docs
    .map(d => toFBCard(d.id, d.data() as Record<string, any>))
    .sort(bySort);
  if (subcategoryId) all = all.filter(c => c.subcategoryId === subcategoryId);
  else if (categoryId) all = all.filter(c => c.categoryId === categoryId);
  return all;
}

// ─── Single-document listeners ────────────────────────────────────────────────

export function subscribeCategory(
  id: string,
  onData: (cat: FBCategory | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "categories", id),
    snap => {
      if (!snap.exists()) { onData(null); return; }
      onData(toFBCategory(snap.id, snap.data() as Record<string, any>));
    },
    err => onError?.(err)
  );
}

export function subscribeSubcategory(
  id: string,
  onData: (sub: FBSubcategory | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "subcategories", id),
    snap => {
      if (!snap.exists()) { onData(null); return; }
      onData(toFBSubcategory(snap.id, snap.data() as Record<string, any>));
    },
    err => onError?.(err)
  );
}

export function subscribeCardsByCategory(
  categoryId: string,
  onData: (cards: FBCard[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "cards"),
    snap => {
      const cards = snap.docs
        .map(d => toFBCard(d.id, d.data() as Record<string, any>))
        .filter(c => c.categoryId === categoryId)
        .sort(bySort);
      onData(cards);
    },
    err => onError?.(err)
  );
}

// ─── Real-time listeners (no composite index needed — filter in JS) ────────────

export function subscribeCategories(
  onData: (cats: FBCategory[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "categories"),
    snap => {
      const cats = snap.docs
        .map(d => toFBCategory(d.id, d.data() as Record<string, any>))
        .sort(bySort);
      onData(cats);
    },
    err => onError?.(err)
  );
}

export function subscribeSubcategories(
  categoryId: string,
  onData: (subs: FBSubcategory[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "subcategories"),
    snap => {
      const subs = snap.docs
        .map(d => toFBSubcategory(d.id, d.data() as Record<string, any>))
        .filter(s => s.categoryId === categoryId)
        .sort(bySort);
      onData(subs);
    },
    err => onError?.(err)
  );
}

export function subscribeCards(
  subcategoryId: string,
  onData: (cards: FBCard[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "cards"),
    snap => {
      const cards = snap.docs
        .map(d => toFBCard(d.id, d.data() as Record<string, any>))
        .filter(c => c.subcategoryId === subcategoryId)
        .sort(bySort);
      onData(cards);
    },
    err => onError?.(err)
  );
}

export function subscribeAllCards(
  onData: (cards: FBCard[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "cards"),
    snap => {
      const cards = snap.docs
        .map(d => toFBCard(d.id, d.data() as Record<string, any>))
        .sort(bySort);
      onData(cards);
    },
    err => onError?.(err)
  );
}
