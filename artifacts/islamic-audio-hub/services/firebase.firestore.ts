import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase.config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FBCategory {
  id:           string;
  name:         string;
  nameEn?:      string;
  icon:         string;
  color:        string;
  description?: string;
  sortOrder:    number;
  createdAt:    number;
}

export interface FBSubcategory {
  id:         string;
  categoryId: string;
  name:       string;
  nameEn?:    string;
  sortOrder:  number;
  createdAt:  number;
}

export interface FBQuizQuestion {
  question:     string;
  options:      string[];
  correctIndex: number;
}

export interface FBCard {
  id:            string;
  titleEn:       string;
  titleTa:       string;
  subcategoryId: string;
  categoryId:    string;
  audioUrl:      string;
  duration:      number;
  isPremium:     boolean;
  hasQuiz:       boolean;
  viewCount:     number;
  sortOrder:     number;
  description?:  string;
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

// ─── Category CRUD ────────────────────────────────────────────────────────────

export async function addCategory(data: Omit<FBCategory, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "categories"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id: string, data: Partial<Omit<FBCategory, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "categories", id), data);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

export async function getCategories(): Promise<FBCategory[]> {
  const snap = await getDocs(query(collection(db, "categories"), orderBy("sortOrder", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: tsToMs((d.data() as any).createdAt) } as FBCategory));
}

// ─── Subcategory CRUD ─────────────────────────────────────────────────────────

export async function addSubCategory(data: Omit<FBSubcategory, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "subcategories"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSubCategory(id: string, data: Partial<Omit<FBSubcategory, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "subcategories", id), data);
}

export async function deleteSubCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "subcategories", id));
}

export async function getSubcategories(categoryId?: string): Promise<FBSubcategory[]> {
  const q = categoryId
    ? query(collection(db, "subcategories"), where("categoryId", "==", categoryId), orderBy("sortOrder", "asc"))
    : query(collection(db, "subcategories"), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: tsToMs((d.data() as any).createdAt) } as FBSubcategory));
}

// ─── Card CRUD ────────────────────────────────────────────────────────────────

export async function addCard(data: Omit<FBCard, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "cards"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCard(id: string, data: Partial<Omit<FBCard, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "cards", id), data);
}

export async function deleteCard(id: string): Promise<void> {
  await deleteDoc(doc(db, "cards", id));
}

export async function getCardById(id: string): Promise<FBCard | null> {
  const snap = await getDoc(doc(db, "cards", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data(), createdAt: tsToMs((snap.data() as any).createdAt) } as FBCard;
}

export async function getCards(subcategoryId?: string, categoryId?: string): Promise<FBCard[]> {
  let q;
  if (subcategoryId) {
    q = query(collection(db, "cards"), where("subcategoryId", "==", subcategoryId), orderBy("sortOrder", "asc"));
  } else if (categoryId) {
    q = query(collection(db, "cards"), where("categoryId", "==", categoryId), orderBy("sortOrder", "asc"));
  } else {
    q = query(collection(db, "cards"), orderBy("sortOrder", "asc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: tsToMs((d.data() as any).createdAt) } as FBCard));
}

// ─── Real-time listeners ──────────────────────────────────────────────────────

export function subscribeCategories(
  onData: (cats: FBCategory[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, "categories"), orderBy("sortOrder", "asc"));
  return onSnapshot(
    q,
    snap => {
      const cats = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToMs((d.data() as any).createdAt),
      } as FBCategory));
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
  const q = query(
    collection(db, "subcategories"),
    where("categoryId", "==", categoryId),
    orderBy("sortOrder", "asc")
  );
  return onSnapshot(
    q,
    snap => {
      const subs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToMs((d.data() as any).createdAt),
      } as FBSubcategory));
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
  const q = query(
    collection(db, "cards"),
    where("subcategoryId", "==", subcategoryId),
    orderBy("sortOrder", "asc")
  );
  return onSnapshot(
    q,
    snap => {
      const cards = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToMs((d.data() as any).createdAt),
      } as FBCard));
      onData(cards);
    },
    err => onError?.(err)
  );
}

export function subscribeAllCards(
  onData: (cards: FBCard[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, "cards"), orderBy("sortOrder", "asc"));
  return onSnapshot(
    q,
    snap => {
      const cards = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToMs((d.data() as any).createdAt),
      } as FBCard));
      onData(cards);
    },
    err => onError?.(err)
  );
}
