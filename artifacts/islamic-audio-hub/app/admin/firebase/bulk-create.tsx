import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addCard,
  getCategories,
  getSubcategories,
  type FBCategory,
  type FBSubcategory,
} from "@/services/firebase.firestore";

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  green:  "#1a7a4a",
  gold:   "#f0bc42",
  red:    "#ef4444",
  blue:   "#2563eb",
  bg:     "#f4faf6",
  card:   "#ffffff",
  border: "#d4ead9",
  txt:    "#0d2414",
  sub:    "#5a7a64",
  valid:  "#16a34a",
};

// ─── Surah seed data ──────────────────────────────────────────────────────────

interface SurahSeed {
  titleEn:  string;
  titleTa:  string;
  sortOrder: number;
}

const SURAHS: SurahSeed[] = [
  { titleEn: "Al-Fatiha",  titleTa: "அல்-ஃபாத்திஹா",  sortOrder: 1  },
  { titleEn: "An-Nas",     titleTa: "அன்-நாஸ்",         sortOrder: 2  },
  { titleEn: "Al-Falaq",   titleTa: "அல்-ஃபலக்",        sortOrder: 3  },
  { titleEn: "Al-Ikhlas",  titleTa: "அல்-இக்லாஸ்",      sortOrder: 4  },
  { titleEn: "Al-Lahab",   titleTa: "அல்-லஹப்",          sortOrder: 5  },
  { titleEn: "Al-Fath",    titleTa: "அல்-ஃபத்ஹ்",        sortOrder: 6  },
  { titleEn: "Al-Kafirun", titleTa: "அல்-காஃபிரூன்",    sortOrder: 7  },
  { titleEn: "Al-Kawthar", titleTa: "அல்-கவ்ஸர்",       sortOrder: 8  },
  { titleEn: "Al-Ma'un",   titleTa: "அல்-மாஊன்",         sortOrder: 9  },
  { titleEn: "Quraysh",    titleTa: "குறைஷ்",            sortOrder: 10 },
];

// ─── Card status per surah ────────────────────────────────────────────────────

type CardStatus = "idle" | "creating" | "done" | "error";

interface CardState {
  surah:    SurahSeed;
  selected: boolean;
  status:   CardStatus;
  docId:    string | null;
  error:    string | null;
}

// ─── Reusable bulk create function ───────────────────────────────────────────

/**
 * bulkCreateSurahCards
 *
 * Creates one Firestore card per surah under the given category/subcategory.
 * audioUrl is left empty — admin fills it later via the card editor.
 * hasQuiz is true — quiz questions are pasted later via the quiz editor.
 *
 * @param categoryId    - Firestore ID of the target category
 * @param subcategoryId - Firestore ID of the target subcategory
 * @param surahs        - Array of { titleEn, titleTa, sortOrder }
 * @param onProgress    - Called after each card with its index and result
 */
export async function bulkCreateSurahCards(
  categoryId:    string,
  subcategoryId: string,
  surahs:        SurahSeed[],
  onProgress:    (idx: number, docId: string | null, error: string | null) => void,
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed  = 0;

  for (let i = 0; i < surahs.length; i++) {
    const s = surahs[i];
    try {
      const docId = await addCard({
        categoryId,
        subcategoryId,
        titleEn:      s.titleEn,
        titleTa:      s.titleTa,
        audioUrl:     "",          // filled later by admin
        duration:     0,
        description:  "",
        isPremium:    false,
        hasQuiz:      true,        // quiz will be pasted later
        viewCount:    0,
        sortOrder:    s.sortOrder,
        quiz:         [],
        quizTitleTa:  "",
        quizTitleEn:  "",
      });
      created++;
      onProgress(i, docId, null);
    } catch (err: any) {
      failed++;
      onProgress(i, null, err?.message ?? "Unknown error");
    }
  }

  return { created, failed };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BulkCreateScreen() {
  const router = useRouter();

  const [cats,       setCats]       = useState<FBCategory[]>([]);
  const [subs,       setSubs]       = useState<FBSubcategory[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [selectedSubId, setSelectedSubId] = useState<string>("");

  const [cards,    setCards]    = useState<CardState[]>(
    SURAHS.map(s => ({ surah: s, selected: true, status: "idle", docId: null, error: null }))
  );
  const [running,  setRunning]  = useState(false);
  const [finished, setFinished] = useState(false);

  // ── Load categories and subcategories ──

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [c, s] = await Promise.all([getCategories(), getSubcategories()]);
      setCats(c);
      setSubs(s);

      // Auto-select "Quran" category and "Quran Viewer" subcategory if they exist
      const quranCat = c.find(x =>
        x.nameEn?.toLowerCase().includes("quran") ||
        x.name?.toLowerCase().includes("குர்")
      );
      if (quranCat) {
        setSelectedCatId(quranCat.id);
        const quranSub = s.find(x =>
          x.categoryId === quranCat.id &&
          (x.nameEn?.toLowerCase().includes("quran") ||
           x.nameEn?.toLowerCase().includes("viewer") ||
           x.name?.toLowerCase().includes("குர்"))
        );
        if (quranSub) setSelectedSubId(quranSub.id);
      }
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // ── Filtered subcategories for selected category ──

  const filteredSubs = subs.filter(s => s.categoryId === selectedCatId);

  // ── Toggle individual card selection ──

  function toggleCard(idx: number) {
    if (running || finished) return;
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  }

  function selectAll()   { setCards(prev => prev.map(c => ({ ...c, selected: true  }))); }
  function deselectAll() { setCards(prev => prev.map(c => ({ ...c, selected: false }))); }

  const selectedCount = cards.filter(c => c.selected).length;
  const doneCount     = cards.filter(c => c.status === "done").length;
  const errorCount    = cards.filter(c => c.status === "error").length;

  // ── Run bulk create ──

  async function handleCreate() {
    if (!selectedCatId) { Alert.alert("தவறு", "Category தேர்ந்தெடுங்கள்"); return; }
    if (!selectedSubId) { Alert.alert("தவறு", "Subcategory தேர்ந்தெடுங்கள்"); return; }
    if (selectedCount === 0) { Alert.alert("தவறு", "குறைந்தது ஒரு card தேர்ந்தெடுங்கள்"); return; }

    const catName = cats.find(c => c.id === selectedCatId)?.nameEn ?? "";
    const subName = subs.find(s => s.id === selectedSubId)?.nameEn ?? "";

    Alert.alert(
      "உருவாக்கவா?",
      `${selectedCount} cards\nCategory: ${catName}\nSubcategory: ${subName}\n\nFirestore-ல் சேர்க்கப்படும். தொடரவா?`,
      [
        { text: "இல்லை", style: "cancel" },
        { text: "ஆம், உருவாக்கு", onPress: runCreate },
      ]
    );
  }

  async function runCreate() {
    setRunning(true);
    setFinished(false);

    // Mark selected cards as "creating"
    setCards(prev => prev.map(c => c.selected ? { ...c, status: "creating" } : c));

    const selectedSurahs = cards
      .map((c, idx) => ({ ...c, idx }))
      .filter(c => c.selected);

    for (const { surah, idx } of selectedSurahs) {
      try {
        const docId = await addCard({
          categoryId:    selectedCatId,
          subcategoryId: selectedSubId,
          titleEn:       surah.titleEn,
          titleTa:       surah.titleTa,
          audioUrl:      "",
          duration:      0,
          description:   "",
          isPremium:     false,
          hasQuiz:       true,
          viewCount:     0,
          sortOrder:     surah.sortOrder,
          quiz:          [],
          quizTitleTa:   "",
          quizTitleEn:   "",
        });
        setCards(prev => prev.map((c, i) =>
          i === idx ? { ...c, status: "done", docId, error: null } : c
        ));
      } catch (err: any) {
        setCards(prev => prev.map((c, i) =>
          i === idx ? { ...c, status: "error", docId: null, error: err?.message ?? "Failed" } : c
        ));
      }
    }

    setRunning(false);
    setFinished(true);
  }

  function handleReset() {
    setCards(SURAHS.map(s => ({ surah: s, selected: true, status: "idle", docId: null, error: null })));
    setFinished(false);
  }

  // ── Status icon helper ──

  function StatusIcon({ status }: { status: CardStatus }) {
    if (status === "creating") return <ActivityIndicator size="small" color={C.blue} />;
    if (status === "done")     return <Ionicons name="checkmark-circle" size={20} color={C.valid} />;
    if (status === "error")    return <Ionicons name="close-circle"     size={20} color={C.red}   />;
    return null;
  }

  // ── Render ──

  if (loadingMeta) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={s.centerTxt}>Firestore ஏற்றுகிறது...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={C.green} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>📦 Bulk Create Cards</Text>
          <Text style={s.headerSub}>10 சூரா cards — Firestore-ல் சேர்</Text>
        </View>
        {finished && (
          <View style={[s.badge, { backgroundColor: errorCount > 0 ? "#fef2f2" : "#dcfce7", borderColor: errorCount > 0 ? C.red : C.valid }]}>
            <Text style={[s.badgeTxt, { color: errorCount > 0 ? C.red : C.valid }]}>
              {doneCount}/{selectedCount} ✓
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Category picker ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📁 Category தேர்ந்தெடு</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
            {cats.map(cat => (
              <Pressable
                key={cat.id}
                onPress={() => { if (!running && !finished) { setSelectedCatId(cat.id); setSelectedSubId(""); } }}
                style={[s.chip, selectedCatId === cat.id && s.chipActive]}
              >
                <Text style={s.chipIcon}>{cat.icon}</Text>
                <Text style={[s.chipTxt, selectedCatId === cat.id && s.chipTxtActive]}>
                  {cat.nameEn || cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {cats.length === 0 && (
            <Text style={s.emptyTxt}>Firestore-ல் category இல்லை</Text>
          )}
        </View>

        {/* ── Subcategory picker ── */}
        {selectedCatId !== "" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📂 Subcategory தேர்ந்தெடு</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
              {filteredSubs.map(sub => (
                <Pressable
                  key={sub.id}
                  onPress={() => { if (!running && !finished) setSelectedSubId(sub.id); }}
                  style={[s.chip, selectedSubId === sub.id && s.chipActive]}
                >
                  <Text style={[s.chipTxt, selectedSubId === sub.id && s.chipTxtActive]}>
                    {sub.nameEn || sub.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {filteredSubs.length === 0 && (
              <Text style={s.emptyTxt}>இந்த category-ல் subcategory இல்லை</Text>
            )}
          </View>
        )}

        {/* ── Target summary banner ── */}
        {selectedCatId && selectedSubId && (
          <View style={s.targetBanner}>
            <Ionicons name="location-outline" size={16} color={C.green} />
            <View style={{ flex: 1 }}>
              <Text style={s.targetTxt}>
                {cats.find(c => c.id === selectedCatId)?.nameEn ?? ""}
                {"  ›  "}
                {subs.find(s => s.id === selectedSubId)?.nameEn ?? ""}
              </Text>
              <Text style={s.targetSub}>இந்த இடத்தில் cards உருவாக்கப்படும்</Text>
            </View>
          </View>
        )}

        {/* ── Card list ── */}
        <View style={s.section}>
          <View style={s.listHeader}>
            <Text style={s.sectionTitle}>🕌 சூரா பட்டியல் ({selectedCount}/{SURAHS.length})</Text>
            {!running && !finished && (
              <View style={s.selectBtns}>
                <Pressable onPress={selectAll} style={s.selectBtn} hitSlop={8}>
                  <Text style={s.selectBtnTxt}>எல்லாம்</Text>
                </Pressable>
                <Text style={{ color: C.sub }}>|</Text>
                <Pressable onPress={deselectAll} style={s.selectBtn} hitSlop={8}>
                  <Text style={s.selectBtnTxt}>நீக்கு</Text>
                </Pressable>
              </View>
            )}
          </View>

          {cards.map((card, idx) => {
            const isSelected = card.selected;
            const statusColor =
              card.status === "done"    ? C.valid :
              card.status === "error"   ? C.red   :
              card.status === "creating"? C.blue  :
              isSelected                ? C.green : C.sub;

            return (
              <Pressable
                key={idx}
                onPress={() => toggleCard(idx)}
                style={[
                  s.cardRow,
                  isSelected && card.status === "idle" && s.cardRowSelected,
                  card.status === "done"     && s.cardRowDone,
                  card.status === "error"    && s.cardRowError,
                  card.status === "creating" && s.cardRowCreating,
                ]}
                disabled={running || finished}
              >
                {/* Checkbox / status */}
                <View style={[s.checkbox, { borderColor: statusColor, backgroundColor: isSelected ? statusColor + "18" : "#f4faf6" }]}>
                  {card.status === "idle" && isSelected && (
                    <Ionicons name="checkmark" size={14} color={C.green} />
                  )}
                  {card.status !== "idle" && <StatusIcon status={card.status} />}
                </View>

                {/* Card info */}
                <View style={{ flex: 1 }}>
                  <View style={s.cardTitleRow}>
                    <Text style={[s.cardNumBadge, { color: statusColor }]}>#{card.surah.sortOrder}</Text>
                    <Text style={[s.cardTitleEn, { color: isSelected || card.status !== "idle" ? C.txt : C.sub }]}>
                      {card.surah.titleEn}
                    </Text>
                  </View>
                  <Text style={[s.cardTitleTa, { color: isSelected || card.status !== "idle" ? C.sub : "#aaa" }]}>
                    {card.surah.titleTa}
                  </Text>

                  {/* Status messages */}
                  {card.status === "creating" && (
                    <Text style={[s.statusTxt, { color: C.blue }]}>உருவாக்குகிறது...</Text>
                  )}
                  {card.status === "done" && (
                    <Text style={[s.statusTxt, { color: C.valid }]}>✅ உருவாக்கப்பட்டது</Text>
                  )}
                  {card.status === "error" && (
                    <Text style={[s.statusTxt, { color: C.red }]}>❌ {card.error}</Text>
                  )}
                </View>

                {/* Right meta */}
                <View style={s.cardRight}>
                  <View style={s.quizPill}>
                    <Ionicons name="help-circle-outline" size={12} color={C.green} />
                    <Text style={s.quizPillTxt}>Quiz ready</Text>
                  </View>
                  <Text style={s.audioNote}>audio later</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Finished summary ── */}
        {finished && (
          <View style={[s.summaryBox, { borderColor: errorCount > 0 ? C.red + "55" : C.valid + "55", backgroundColor: errorCount > 0 ? "#fef9f9" : "#f0faf4" }]}>
            <Ionicons name={errorCount > 0 ? "warning" : "checkmark-circle"} size={28} color={errorCount > 0 ? C.red : C.valid} />
            <View style={{ flex: 1 }}>
              <Text style={[s.summaryTitle, { color: errorCount > 0 ? C.red : C.valid }]}>
                {errorCount === 0 ? "அனைத்தும் உருவாக்கப்பட்டன! 🎉" : "சில cards தோல்வியடைந்தன"}
              </Text>
              <Text style={s.summaryBody}>
                ✅ {doneCount} cards உருவாக்கப்பட்டன
                {errorCount > 0 ? `\n❌ ${errorCount} cards தோல்வி` : ""}
              </Text>
              <Text style={s.summaryHint}>
                இப்போது Cards tab-ல் audioUrl மற்றும் Quiz சேர்க்கலாம்.
              </Text>
            </View>
          </View>
        )}

        {/* ── Action buttons ── */}
        {!finished ? (
          <TouchableOpacity
            style={[
              s.createBtn,
              (running || selectedCount === 0 || !selectedCatId || !selectedSubId) && s.createBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={running || selectedCount === 0 || !selectedCatId || !selectedSubId}
            activeOpacity={0.85}
          >
            {running ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={s.createBtnTxt}>
                  உருவாக்குகிறது... ({doneCount + errorCount}/{selectedCount})
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={s.createBtnTxt}>
                  {selectedCount} Cards உருவாக்கு — Firebase-ல் சேமி
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.finishedBtns}>
            <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={18} color={C.green} />
              <Text style={s.resetBtnTxt}>மீண்டும் (Reset)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="arrow-back-outline" size={18} color="#fff" />
              <Text style={s.doneBtnTxt}>CMS-க்கு திரும்பு</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Info notes ── */}
        {!running && !finished && (
          <View style={s.noteBox}>
            <Text style={s.noteTitle}>ℹ️ குறிப்புகள்</Text>
            <Text style={s.noteLine}>• audioUrl தற்போது காலியாக சேமிக்கப்படும் — Cards tab-ல் பின்னர் சேர்க்கலாம்</Text>
            <Text style={s.noteLine}>• hasQuiz: true — Quiz editor-ல் கேள்விகளை paste செய்யலாம்</Text>
            <Text style={s.noteLine}>• ஒரு சூரா ஏற்கனவே உள்ளதா என்று சரிபார்க்கப்படாது — duplicate ஆகாமல் பார்த்துக்கொள்ளுங்கள்</Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerTxt: { fontSize: 14, color: C.sub },

  // Header
  header:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#fff" },
  backBtn:     { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: C.txt },
  headerSub:   { fontSize: 11, color: C.sub, marginTop: 1 },
  badge:       { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt:    { fontSize: 13, fontWeight: "800" },

  scroll: { padding: 16 },

  // Sections
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.txt, marginBottom: 12 },
  listHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  selectBtns:   { flexDirection: "row", alignItems: "center", gap: 8 },
  selectBtn:    {},
  selectBtnTxt: { fontSize: 12, fontWeight: "700", color: C.green },
  emptyTxt:     { fontSize: 13, color: C.sub, fontStyle: "italic", textAlign: "center", paddingVertical: 8 },

  // Chip pickers
  chipRow:       { marginBottom: 4 },
  chip:          { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8, backgroundColor: "#fff" },
  chipActive:    { backgroundColor: C.green + "18", borderColor: C.green },
  chipIcon:      { fontSize: 16 },
  chipTxt:       { fontSize: 13, fontWeight: "600", color: C.sub },
  chipTxtActive: { color: C.green, fontWeight: "800" },

  // Target banner
  targetBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#e8f5ee", borderRadius: 12, borderWidth: 1, borderColor: C.green + "44", padding: 12, marginBottom: 20 },
  targetTxt:    { fontSize: 13, fontWeight: "800", color: C.green },
  targetSub:    { fontSize: 11, color: C.sub, marginTop: 2 },

  // Card rows
  cardRow:         { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: C.border, padding: 12, marginBottom: 8, opacity: 0.6 },
  cardRowSelected: { opacity: 1, borderColor: C.green + "66" },
  cardRowDone:     { opacity: 1, borderColor: C.valid + "66", backgroundColor: "#f0faf4" },
  cardRowError:    { opacity: 1, borderColor: C.red   + "66", backgroundColor: "#fff5f5" },
  cardRowCreating: { opacity: 1, borderColor: C.blue  + "66", backgroundColor: "#eff8ff" },

  checkbox:     { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  cardNumBadge: { fontSize: 11, fontWeight: "800", width: 22 },
  cardTitleEn:  { fontSize: 14, fontWeight: "700" },
  cardTitleTa:  { fontSize: 12, marginLeft: 22 },
  statusTxt:    { fontSize: 11, fontWeight: "600", marginTop: 4, marginLeft: 22 },
  cardRight:    { alignItems: "flex-end", gap: 4 },
  quizPill:     { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.green + "18", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  quizPillTxt:  { fontSize: 10, fontWeight: "700", color: C.green },
  audioNote:    { fontSize: 10, color: C.sub, fontStyle: "italic" },

  // Summary
  summaryBox:   { flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  summaryBody:  { fontSize: 13, color: C.txt, lineHeight: 20, marginBottom: 6 },
  summaryHint:  { fontSize: 12, color: C.sub, lineHeight: 18 },

  // Buttons
  createBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, marginBottom: 16, borderWidth: 2, borderColor: C.green + "88" },
  createBtnDisabled: { backgroundColor: "#ccc", borderColor: "#bbb" },
  createBtnTxt:      { color: "#fff", fontWeight: "800", fontSize: 15 },

  finishedBtns: { flexDirection: "row", gap: 12, marginBottom: 16 },
  resetBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: C.green, backgroundColor: "#f0faf4" },
  resetBtnTxt:  { fontSize: 14, fontWeight: "800", color: C.green },
  doneBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: C.green },
  doneBtnTxt:   { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Notes
  noteBox:   { backgroundColor: "#fffbeb", borderRadius: 12, borderWidth: 1, borderColor: C.gold + "66", padding: 14, marginBottom: 8 },
  noteTitle: { fontSize: 13, fontWeight: "800", color: "#92400e", marginBottom: 8 },
  noteLine:  { fontSize: 12, color: "#78350f", lineHeight: 20, marginBottom: 2 },
});
