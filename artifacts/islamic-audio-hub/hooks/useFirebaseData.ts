import { useEffect, useState } from "react";
import {
  subscribeCategories,
  subscribeSubcategories,
  subscribeCards,
  subscribeAllCards,
  subscribeCategory,
  subscribeSubcategory,
  subscribeCardsByCategory,
  type FBCategory,
  type FBSubcategory,
  type FBCard,
} from "@/services/firebase.firestore";

// ─── useCategories ────────────────────────────────────────────────────────────
export function useCategories() {
  const [categories, setCategories] = useState<FBCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCategories(
      cats => { setCategories(cats); setLoading(false); setError(null); },
      err  => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { categories, loading, error };
}

// ─── useSubcategories ─────────────────────────────────────────────────────────
export function useSubcategories(categoryId: string) {
  const [subcategories, setSubcategories] = useState<FBSubcategory[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeSubcategories(
      categoryId,
      subs => { setSubcategories(subs); setLoading(false); setError(null); },
      err  => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [categoryId]);

  return { subcategories, loading, error };
}

// ─── useCards ─────────────────────────────────────────────────────────────────
export function useCards(subcategoryId: string) {
  const [cards,   setCards]   = useState<FBCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!subcategoryId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeCards(
      subcategoryId,
      cards => { setCards(cards); setLoading(false); setError(null); },
      err   => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [subcategoryId]);

  return { cards, loading, error };
}

// ─── useAllCards ──────────────────────────────────────────────────────────────
export function useAllCards() {
  const [cards,   setCards]   = useState<FBCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllCards(
      cards => { setCards(cards); setLoading(false); setError(null); },
      err   => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { cards, loading, error };
}

// ─── useCategory (single doc) ─────────────────────────────────────────────────
export function useCategory(id: string) {
  const [category, setCategory] = useState<FBCategory | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeCategory(
      id,
      cat => { setCategory(cat); setLoading(false); setError(null); },
      err => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [id]);

  return { category, loading, error };
}

// ─── useSubcategory (single doc) ──────────────────────────────────────────────
export function useSubcategory(id: string) {
  const [subcategory, setSubcategory] = useState<FBSubcategory | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === "unassigned") { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeSubcategory(
      id,
      sub => { setSubcategory(sub); setLoading(false); setError(null); },
      err => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [id]);

  return { subcategory, loading, error };
}

// ─── useCardsByCategory ───────────────────────────────────────────────────────
export function useCardsByCategory(categoryId: string) {
  const [cards,   setCards]   = useState<FBCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeCardsByCategory(
      categoryId,
      cards => { setCards(cards); setLoading(false); setError(null); },
      err   => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [categoryId]);

  return { cards, loading, error };
}
