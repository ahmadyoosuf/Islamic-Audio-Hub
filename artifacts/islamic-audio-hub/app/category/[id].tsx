import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import GameLevelCard from "@/components/GameLevelCard";
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
const NUM_COLS = SCREEN_W > 500 ? 4 : 3;
const CIRCLE_SIZE = Math.floor((Math.min(SCREEN_W, 420) - 32 - (NUM_COLS - 1) * 12) / NUM_COLS);

function unifiedToTrack(u: UnifiedTrack): Track {
  return {
    id: u.id, title: u.title, categoryId: u.categoryId, categoryName: u.categoryName,
    duration: u.duration, audioUrl: u.audioUrl, viewCount: u.viewCount,
    isPremium: u.isPremium, sortOrder: u.sortOrder, prizeEnabled: u.prizeEnabled,
    hasQuiz: u.hasQuiz, isBuiltIn: u.isBuiltIn, description: u.description,
    fileName: u.fileName, uploadedAt: u.uploadedAt,
  };
}

// ─── Palette helpers ─────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
function lighten(hex: string, amt: number): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const clamp = (n: number) => Math.min(255, Math.round(n + (255 - n) * amt));
    return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
  } catch { return hex; }
}

// Sub-category icons pool — used when no icon is stored
const ICON_POOL = ["📖","📜","🌙","☀️","✨","🕌","📿","🤲","🌿","💧","⭐","🎓","🔊","🕋","📚","🌸"];

// ─── Skeleton circle ─────────────────────────────────────────────────────────
function SkeletonCircle({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={styles.circleItem}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
            backgroundColor: color + "33", opacity: pulse,
          },
        ]}
      />
      <Animated.View style={[styles.skelLabel, { backgroundColor: color + "22", opacity: pulse }]} />
    </View>
  );
}

// ─── Round Subcategory Item ───────────────────────────────────────────────────
function CircleSubItem({
  sub,
  color,
  trackCount,
  index,
  onPress,
  isDark,
  entryAnim,
}: {
  sub: StoredSubcategory;
  color: string;
  trackCount: number;
  index: number;
  onPress: () => void;
  isDark: boolean;
  entryAnim: Animated.Value;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const icon = ICON_POOL[index % ICON_POOL.length];
  const bgLight = lighten(color, 0.82);
  const bgDark  = color + "28";

  return (
    <Animated.View
      style={[
        styles.circleItem,
        {
          opacity: entryAnim,
          transform: [
            { scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          ],
        },
      ]}
    >
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View
          style={[
            styles.circle,
            {
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: CIRCLE_SIZE / 2,
              backgroundColor: isDark ? bgDark : bgLight,
              borderColor: color + (isDark ? "55" : "44"),
              transform: [{ scale }],
            },
          ]}
        >
          {/* Inner ring */}
          <View
            style={[
              styles.circleInnerRing,
              {
                width: CIRCLE_SIZE - 8,
                height: CIRCLE_SIZE - 8,
                borderRadius: (CIRCLE_SIZE - 8) / 2,
                borderColor: color + "33",
              },
            ]}
          />

          {/* Icon */}
          <Text style={[styles.circleIcon, { fontSize: CIRCLE_SIZE * 0.35 }]}>{icon}</Text>

          {/* Track count badge */}
          {trackCount > 0 && (
            <View style={[styles.countDot, { backgroundColor: color }]}>
              <Text style={styles.countDotTxt}>{trackCount}</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>

      {/* Label */}
      <Text
        style={[styles.circleLabel, { color: isDark ? "#e0f0e8" : "#0d2414" }]}
        numberOfLines={2}
      >
        {sub.name}
      </Text>
    </Animated.View>
  );
}

// ─── "All Tracks" round item ──────────────────────────────────────────────────
function AllTracksCircle({
  color, count, isDark, onPress,
}: {
  color: string; count: number; isDark: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  return (
    <View style={styles.circleItem}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View
          style={[
            styles.circle,
            styles.circleAll,
            {
              width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
              borderColor: color + "66",
              transform: [{ scale }],
            },
          ]}
        >
          <View
            style={[
              styles.circleInnerRing,
              {
                width: CIRCLE_SIZE - 8, height: CIRCLE_SIZE - 8,
                borderRadius: (CIRCLE_SIZE - 8) / 2, borderColor: color + "33",
              },
            ]}
          />
          <Ionicons name="musical-notes" size={CIRCLE_SIZE * 0.32} color={color} />
          {count > 0 && (
            <View style={[styles.countDot, { backgroundColor: color }]}>
              <Text style={styles.countDotTxt}>{count}</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
      <Text style={[styles.circleLabel, { color: isDark ? "#e0f0e8" : "#0d2414" }]} numberOfLines={2}>
        அனைத்தும்
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [category, setCategory]       = useState<StoredCategory | null>(null);
  const [subcategories, setSubcats]   = useState<StoredSubcategory[]>([]);
  const [tracks, setTracks]           = useState<UnifiedTrack[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAllTracks, setShowAll]   = useState(false);
  const [visibleCount, setVisible]    = useState(15);

  // One animated value per subcategory + "all" slot
  const circleAnims = useRef<Animated.Value[]>([]).current;

  useFocusEffect(
    useCallback(() => {
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

        // Reset + stagger-in animations
        const total = subs.length + 1; // +1 for "all"
        circleAnims.length = 0;
        for (let i = 0; i < total; i++) circleAnims.push(new Animated.Value(0));
        setLoading(false);
        setTimeout(() => {
          Animated.stagger(55,
            circleAnims.map(a =>
              Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 90, friction: 10 })
            )
          ).start();
        }, 60);
      });
    }, [id])
  );

  const color = category?.color ?? "#1a7a4a";

  // Track counts per sub
  const subCounts: Record<string, number> = {};
  let unassigned = 0;
  for (const t of tracks) {
    if (t.subcategoryId) subCounts[t.subcategoryId] = (subCounts[t.subcategoryId] ?? 0) + 1;
    else unassigned++;
  }

  const playlist = tracks.map(unifiedToTrack);
  const visibleTracks = tracks.slice(0, visibleCount);

  const bg = isDark ? "#0a0e0c" : "#f4faf6";
  const cardBg = isDark ? "#111816" : "#ffffff";
  const textMain = isDark ? "#e0f0e8" : "#0d2414";
  const textSub  = isDark ? "#5a9a6a" : "#4a7a5a";

  if (!loading && !category) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={color} />
          </Pressable>
          <View style={styles.centeredBox}>
            <Text style={styles.bigIcon}>❓</Text>
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
        <View style={[styles.header, { borderBottomColor: isDark ? "#1e2e24" : "#d4ead9" }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: color + "18", borderColor: color + "44" }]}>
            <Ionicons name="arrow-back" size={18} color={color} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={[styles.catIconBox, { backgroundColor: color + "22" }]}>
              <Text style={styles.catEmoji}>{category?.icon ?? "📂"}</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>
                {category?.name ?? ""}
              </Text>
              <Text style={[styles.headerSub, { color: textSub }]}>
                {subcategories.length > 0
                  ? `${subcategories.length} தலைப்புகள் • ${tracks.length} பாடங்கள்`
                  : `${tracks.length} பாடங்கள்`}
              </Text>
            </View>
          </View>
          <View style={[styles.trackBadge, { backgroundColor: color + "18", borderColor: color + "44" }]}>
            <Text style={[styles.trackBadgeTxt, { color }]}>{tracks.length}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        {loading ? (
          <ScrollView contentContainerStyle={styles.gridWrap}>
            <View style={styles.grid}>
              {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCircle key={i} color={color} />)}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── SUBCATEGORY GRID ─── */}
            {!showAllTracks && subcategories.length > 0 && (
              <>
                {/* Section label */}
                <View style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: color }]} />
                  <Text style={[styles.sectionTitle, { color: textMain }]}>தலைப்புகள் தேர்வு செய்க</Text>
                </View>

                {/* Circular grid */}
                <View style={[styles.gridCard, { backgroundColor: cardBg, borderColor: isDark ? "#1e2e24" : "#dbeee0" }]}>
                  <View style={styles.grid}>
                    {/* "All" circle first */}
                    <AllTracksCircle
                      color={color}
                      count={tracks.length}
                      isDark={isDark}
                      onPress={() => setShowAll(true)}
                    />

                    {subcategories.map((sub, i) => (
                      <CircleSubItem
                        key={sub.id}
                        sub={sub}
                        color={color}
                        trackCount={subCounts[sub.id] ?? 0}
                        index={i}
                        isDark={isDark}
                        entryAnim={circleAnims[i + 1] ?? new Animated.Value(1)}
                        onPress={() => router.push(`/subcategory/${sub.id}` as any)}
                      />
                    ))}

                    {/* Unassigned tracks */}
                    {unassigned > 0 && (
                      <CircleSubItem
                        key="__unassigned"
                        sub={{ id: "__unassigned", categoryId: id ?? "", name: "பொது", sortOrder: 999, createdAt: 0 }}
                        color="#888"
                        trackCount={unassigned}
                        index={subcategories.length}
                        isDark={isDark}
                        entryAnim={circleAnims[subcategories.length + 1] ?? new Animated.Value(1)}
                        onPress={() => router.push(`/subcategory/unassigned?categoryId=${id}` as any)}
                      />
                    )}
                  </View>
                </View>
              </>
            )}

            {/* ─── ALL TRACKS VIEW ─── */}
            {showAllTracks && (
              <>
                {subcategories.length > 0 && (
                  <Pressable
                    style={[styles.backToSubsBtn, { borderColor: color + "44" }]}
                    onPress={() => setShowAll(false)}
                  >
                    <Ionicons name="grid-outline" size={14} color={color} />
                    <Text style={[styles.backToSubsTxt, { color }]}>தலைப்புகளுக்கு திரும்பு</Text>
                  </Pressable>
                )}

                <View style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: color }]} />
                  <Text style={[styles.sectionTitle, { color: textMain }]}>
                    அனைத்து பாடங்கள் ({tracks.length})
                  </Text>
                </View>

                {visibleTracks.map((track, i) => (
                  <GameLevelCard
                    key={track.id}
                    track={unifiedToTrack(track)}
                    levelNumber={i + 1}
                    playlist={playlist}
                  />
                ))}

                {visibleCount < tracks.length && (
                  <Pressable
                    onPress={() => setVisible(v => v + 15)}
                    style={[styles.loadMore, { borderColor: color + "44" }]}
                  >
                    <Text style={[styles.loadMoreTxt, { color }]}>
                      மேலும் {Math.min(15, tracks.length - visibleCount)} பாடங்கள்
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={color} />
                  </Pressable>
                )}

                {tracks.length === 0 && (
                  <View style={styles.centeredBox}>
                    <Text style={styles.bigIcon}>🎵</Text>
                    <Text style={[styles.emptyTxt, { color: textSub }]}>
                      இந்த பிரிவில் பாடங்கள் இல்லை
                    </Text>
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
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  catIconBox: {
    width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
  },
  catEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, marginTop: 1 },
  trackBadge: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  trackBadgeTxt: { fontSize: 13, fontWeight: "800" },

  // Scroll / layout
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  gridWrap: { paddingHorizontal: 16, paddingTop: 18 },

  // Section label
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionDot: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700" },

  // Grid card container
  gridCard: {
    borderRadius: 20, borderWidth: 1,
    padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },

  // Grid of circles
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 14,
  },

  // ── Circle item ──
  circleItem: {
    width: CIRCLE_SIZE,
    alignItems: "center",
    gap: 8,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  circleAll: {
    backgroundColor: "transparent",
    borderStyle: "dashed",
  },
  circleInnerRing: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  circleIcon: {
    textAlign: "center",
    lineHeight: undefined,
  },
  countDot: {
    position: "absolute",
    top: 4, right: 4,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: "#fff",
  },
  countDotTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },
  circleLabel: {
    fontSize: 11, fontWeight: "600", textAlign: "center",
    lineHeight: 15, maxWidth: CIRCLE_SIZE + 8,
  },

  // Skeleton
  skelLabel: { width: CIRCLE_SIZE * 0.7, height: 10, borderRadius: 5 },

  // Back to subs
  backToSubsBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16,
  },
  backToSubsTxt: { fontSize: 12, fontWeight: "700" },

  // Load more
  loadMore: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 6,
    borderWidth: 1, borderRadius: 12, marginHorizontal: 4,
  },
  loadMoreTxt: { fontSize: 13, fontWeight: "700" },

  // Empty / error
  centeredBox: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  bigIcon: { fontSize: 48 },
  emptyTxt: { fontSize: 14, textAlign: "center" },
});
