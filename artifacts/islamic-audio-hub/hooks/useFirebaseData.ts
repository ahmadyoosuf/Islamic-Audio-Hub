import { useEffect, useState, useRef } from "react";
import {
  subscribeCategories,
  subscribeSubcategories,
  subscribeCards,
  subscribeAllCards,
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
