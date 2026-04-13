import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import GameLevelCard from "@/components/GameLevelCard";
import { useApp } from "@/context/AppContext";
import {
  getCategoryById,
  getSubcategoriesByCategory,
  getTracksByCategory,
  type StoredCategory,
  type StoredSubcategory,
  type UnifiedTrack,
} from "@/data/unifiedStorage";
import type { Track } from "@/context/AppContext";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP  = 12;
const CARD_W    = (Math.min(SCREEN_W, 480) - 32 - CARD_GAP) / 2;

// Icon map — English key words → Ionicons name
const ICON_MAP: Record<string, string> = {
  quran: "book",       surah: "book",        fatiha: "book",
  bakara: "book",      tafseer: "search",    tafsir: "search",
  explanation: "search",
  hadith: "document-text", hadis: "document-text",
  lesson: "school",    learn: "school",      education: "school",
  iman: "star",        faith: "star",        belief: "star",
  seerah: "person",    prophet: "person",    nabi: "person",
  daily: "sunny",      dua: "hand-left",     prayer: "hand-left",
  salah: "time",       seerath: "person",    history: "time",
  default: "musical-notes",
};

function resolveIcon(sub: StoredSubcategory): string {
  const haystack = ((sub.nameEn ?? "") + " " + sub.name).toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (key !== "default" && haystack.includes(key)) return icon;
  }
  return ICON_MAP.default;
}

function unifiedToTrack(u: UnifiedTrack): Track {
  return {
    id: u.id, title: u.title, categoryId: u.categoryId, categoryName: u.categoryName,
    duration: u.duration, audioUrl: u.audioUrl, viewCount: u.viewCount,
    isPremium: u.isPremium, sortOrder: u.sortOrder, prizeEnabled: u.prizeEnabled,
    hasQuiz: u.hasQuiz, isBuiltIn: u.isBuiltIn, description: u.description,
    fileName: u.fileName, uploadedAt: u.uploadedAt,
  };
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ isDark, color }: { isDark: boolean; color: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[styles.subCard, { width: CARD_W, backgroundColor: isDark ? "#111816" : "#fff", opacity: pulse }]}>
      <View style={[styles.skelIcon, { backgroundColor: color + "22" }]} />
      <View style={[styles.skelLine1, { backgroundColor: isDark ? "#1e2e24" : "#e8f0ea" }]} />
      <View style={[styles.skelLine2, { backgroundColor: isDark ? "#1a2820" : "#f0f6f1" }]} />
    </Animated.View>
  );
}

// ─── Bilingual Subcategory Card ───────────────────────────────────────────────
function SubCard({
  sub, color, trackCount, isDark, entryAnim, onPress,
}: {
  sub: StoredSubcategory; color: string; trackCount: number;
  isDark: boolean; entryAnim: Animated.Value; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const bgCard   = isDark ? "#111816" : "#ffffff";
  const textMain = isDark ? "#e0f0e8" : "#0d2414";
  const textSub  = isDark ? "#5a9a6a" : "#5a7a5a";
  const iconBg   = isDark ? color + "28" : color + "18";
  const iconName = resolveIcon(sub);

  const hasEn = !!(sub.nameEn && sub.nameEn.trim());
  const mainTitle = hasEn ? sub.nameEn! : sub.name;
  const subTitle  = hasEn ? sub.name : null;

  return (
    <Animated.View style={{
      width: CARD_W,
      opacity: entryAnim,
      transform: [{ scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
    }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22 }).start()}
      >
        <Animated.View style={[
          styles.subCard,
          {
            width: CARD_W, backgroundColor: bgCard,
            borderColor: isDark ? "#1a2e20" : "#d4ead9",
            transform: [{ scale }],
          },
        ]}>
          {/* Accent strip */}
          <View style={[styles.cardAccent, { backgroundColor: color }]} />

          {/* Icon */}
          <View style={[styles.cardIconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName as any} size={26} color={color} />
          </View>

          {/* Titles */}
          <Text style={[styles.cardMainTitle, { color: textMain }]} numberOfLines={2}>
            {mainTitle}
          </Text>
          {subTitle && (
            <Text style={[styles.cardSubTitle, { color: textSub }]} numberOfLines={2}>
              {subTitle}
            </Text>
          )}

          {/* Bottom row */}
          <View style={styles.cardBottom}>
            <View style={[styles.countPill, { backgroundColor: color + "18" }]}>
              <Ionicons name="headset-outline" size={10} color={color} />
              <Text style={[styles.countPillTxt, { color }]}>{trackCount}</Text>
            </View>
            <View style={[styles.arrowCircle, { borderColor: color + "55" }]}>
              <Ionicons name="arrow-forward" size={12} color={color} />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── "All" card ───────────────────────────────────────────────────────────────
function AllCard({ color, count, isDark, onPress }: {
  color: string; count: number; isDark: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22 }).start()}
    >
      <Animated.View style={[
        styles.allCard,
        {
          borderColor: color + "55",
          backgroundColor: isDark ? color + "15" : color + "0a",
          transform: [{ scale }],
        },
      ]}>
        <View style={[styles.allIconBox, { backgroundColor: color + "22" }]}>
          <Ionicons name="musical-notes" size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.allCardMain, { color: isDark ? "#e0f0e8" : "#0d2414" }]}>
            All Tracks
          </Text>
          <Text style={[styles.allCardSub, { color: isDark ? "#5a9a6a" : "#5a7a5a" }]}>
            அனைத்து பாடங்கள் — {count}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { isDarkMode } = useApp();
  const isDark = isDarkMode;

  const [category,      setCategory]  = useState<StoredCategory | null>(null);
  const [subcategories, setSubcats]   = useState<StoredSubcategory[]>([]);
  const [tracks,        setTracks]    = useState<UnifiedTrack[]>([]);
  const [loading,       setLoading]   = useState(true);
  const [showAll,       setShowAll]   = useState(false);
  const [visibleCount,  setVisible]   = useState(15);

  const cardAnims = useRef<Animated.Value[]>([]).current;

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setShowAll(false);
    setVisible(15);
    Promise.all([
      getCategoryById(id ?? ""),
      getSubcategoriesByCategory(id ?? ""),
      getTracksByCategory(id ?? ""),
    ]).then(([cat, subs, trks]) => {
      setCategory(cat);
      setSubcats(subs);
      setTracks(trks);
      if (subs.length === 0) setShowAll(true);

      cardAnims.length = 0;
      const total = subs.length + 1;
      for (let i = 0; i < total; i++) cardAnims.push(new Animated.Value(0));
      setLoading(false);
      setTimeout(() => {
        Animated.stagger(60,
          cardAnims.map(a => Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 85, friction: 11 }))
        ).start();
      }, 50);
    });
  }, [id]));

  const color = category?.color ?? "#1a7a4a";

  const subCounts: Record<string, number> = {};
  let unassigned = 0;
  for (const t of tracks) {
    if (t.subcategoryId) subCounts[t.subcategoryId] = (subCounts[t.subcategoryId] ?? 0) + 1;
    else unassigned++;
  }

  const playlist      = tracks.map(unifiedToTrack);
  const visibleTracks = tracks.slice(0, visibleCount);

  // Color tokens
  const bg       = isDark ? "#0a0e0c" : "#f4faf6";
  const cardBg   = isDark ? "#111816" : "#ffffff";
  const hdrBdr   = isDark ? "#1e2e24" : "#d4ead9";
  const textMain = isDark ? "#e0f0e8" : "#0d2414";
  const textSub  = isDark ? "#5a9a6a" : "#4a7a5a";

  if (!loading && !category) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: "#1a7a4a18" }]}>
            <Ionicons name="arrow-back" size={18} color="#1a7a4a" />
          </Pressable>
          <View style={styles.centered}>
            <Text style={{ fontSize: 44 }}>❓</Text>
            <Text style={[styles.emptyTxt, { color: textSub }]}>பிரிவு கிடைக்கவில்லை</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: hdrBdr }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: color + "18", borderColor: color + "44" }]}>
            <Ionicons name="arrow-back" size={18} color={color} />
          </Pressable>
          <View style={styles.hdrCenter}>
            <View style={[styles.hdrIconBox, { backgroundColor: color + "22" }]}>
              <Text style={styles.hdrEmoji}>{category?.icon ?? "📂"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hdrTitle, { color: textMain }]} numberOfLines={1}>
                {category?.name ?? ""}
              </Text>
              <Text style={[styles.hdrSub, { color: textSub }]}>
                {subcategories.length > 0
                  ? `${subcategories.length} Subcategories • ${tracks.length} tracks`
                  : `${tracks.length} tracks`}
              </Text>
            </View>
          </View>
          <View style={[styles.hdrBadge, { backgroundColor: color + "18", borderColor: color + "44" }]}>
            <Text style={[styles.hdrBadgeTxt, { color }]}>{tracks.length}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        {loading ? (
          <ScrollView contentContainerStyle={styles.gridWrap}>
            <View style={styles.grid}>
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} isDark={isDark} color={color} />)}
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ─── SUBCATEGORY CARD GRID ─── */}
            {!showAll && subcategories.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: color }]} />
                  <Text style={[styles.sectionTitle, { color: textMain }]}>
                    Subcategories
                  </Text>
                  <Text style={[styles.sectionCount, { color: textSub }]}>
                    {subcategories.length}
                  </Text>
                </View>

                <View style={styles.grid}>
                  {subcategories.map((sub, i) => (
                    <SubCard
                      key={sub.id}
                      sub={sub}
                      color={color}
                      trackCount={subCounts[sub.id] ?? 0}
                      isDark={isDark}
                      entryAnim={cardAnims[i] ?? new Animated.Value(1)}
                      onPress={() => router.push(`/subcategory/${sub.id}` as any)}
                    />
                  ))}

                  {/* Unassigned */}
                  {unassigned > 0 && (
                    <SubCard
                      key="__unassigned"
                      sub={{ id: "__unassigned", categoryId: id ?? "", name: "பொது பாடங்கள்", nameEn: "General", sortOrder: 999, createdAt: 0 }}
                      color="#888888"
                      trackCount={unassigned}
                      isDark={isDark}
                      entryAnim={cardAnims[subcategories.length] ?? new Animated.Value(1)}
                      onPress={() => router.push(`/subcategory/unassigned?categoryId=${id}` as any)}
                    />
                  )}
                </View>

                {/* See all tracks */}
                <AllCard color={color} count={tracks.length} isDark={isDark} onPress={() => setShowAll(true)} />
              </>
            )}

            {/* ─── ALL TRACKS ─── */}
            {showAll && (
              <>
                {subcategories.length > 0 && (
                  <Pressable
                    style={[styles.backSubBtn, { borderColor: color + "44" }]}
                    onPress={() => setShowAll(false)}
                  >
                    <Ionicons name="grid-outline" size={14} color={color} />
                    <Text style={[styles.backSubTxt, { color }]}>
                      Subcategories
                    </Text>
                  </Pressable>
                )}

                <View style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: color }]} />
                  <Text style={[styles.sectionTitle, { color: textMain }]}>
                    All Tracks
                  </Text>
                  <Text style={[styles.sectionCount, { color: textSub }]}>{tracks.length}</Text>
                </View>

                {visibleTracks.map((track, i) => (
                  <GameLevelCard key={track.id} track={unifiedToTrack(track)} levelNumber={i + 1} playlist={playlist} />
                ))}

                {visibleCount < tracks.length && (
                  <Pressable
                    onPress={() => setVisible(v => v + 15)}
                    style={[styles.loadMore, { borderColor: color + "44" }]}
                  >
                    <Text style={[styles.loadMoreTxt, { color }]}>
                      {Math.min(15, tracks.length - visibleCount)} more tracks
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={color} />
                  </Pressable>
                )}

                {tracks.length === 0 && (
                  <View style={styles.centered}>
                    <Text style={{ fontSize: 44 }}>🎵</Text>
                    <Text style={[styles.emptyTxt, { color: textSub }]}>No tracks yet</Text>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 140 }} />
          </ScrollView>
        )}

        <AudioPlayer />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  hdrCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  hdrIconBox: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  hdrEmoji: { fontSize: 20 },
  hdrTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  hdrSub: { fontSize: 11, marginTop: 1 },
  hdrBadge: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  hdrBadgeTxt: { fontSize: 13, fontWeight: "800" },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  gridWrap: { paddingHorizontal: 16, paddingTop: 18 },

  // Section row
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionDot: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  sectionCount: { fontSize: 13, fontWeight: "600" },

  // 2-column grid
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: CARD_GAP, marginBottom: 16,
  },

  // ── Sub card ──
  subCard: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
    paddingBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardAccent: { height: 4, width: "100%", marginBottom: 14 },
  cardIconBox: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 12,
  },
  cardMainTitle: {
    fontSize: 14, fontWeight: "800", textAlign: "center",
    paddingHorizontal: 12, lineHeight: 20, marginBottom: 4,
  },
  cardSubTitle: {
    fontSize: 11, fontWeight: "500", textAlign: "center",
    paddingHorizontal: 12, lineHeight: 16, marginBottom: 8,
  },
  cardBottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, marginTop: 4,
  },
  countPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  countPillTxt: { fontSize: 11, fontWeight: "700" },
  arrowCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  // "All" banner card
  allCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1.5, padding: 14,
    marginBottom: 16,
  },
  allIconBox: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  allCardMain: { fontSize: 14, fontWeight: "800" },
  allCardSub: { fontSize: 11, marginTop: 2 },

  // Skeleton
  skelIcon: { width: 50, height: 50, borderRadius: 25, alignSelf: "center", marginBottom: 12, marginTop: 18 },
  skelLine1: { height: 12, borderRadius: 6, marginHorizontal: 16, marginBottom: 8 },
  skelLine2: { height: 10, borderRadius: 5, marginHorizontal: 24, marginBottom: 12 },

  // Back to subs
  backSubBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16,
  },
  backSubTxt: { fontSize: 12, fontWeight: "700" },

  // Load more
  loadMore: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 6,
    borderWidth: 1, borderRadius: 12, marginHorizontal: 4,
  },
  loadMoreTxt: { fontSize: 13, fontWeight: "700" },

  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyTxt: { fontSize: 14, textAlign: "center" },
});
