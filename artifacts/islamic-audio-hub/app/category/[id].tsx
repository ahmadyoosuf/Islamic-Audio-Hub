import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import GameLevelCard from "@/components/GameLevelCard";
import GameWorldBackground from "@/components/GameWorldBackground";
import {
  getCategoryById,
  getSubcategoriesByCategory,
  getTracksByCategory,
  type StoredCategory,
  type StoredSubcategory,
  type UnifiedTrack,
} from "@/data/unifiedStorage";
import { useColors } from "@/hooks/useColors";
import type { Track } from "@/context/AppContext";

function unifiedToTrack(u: UnifiedTrack): Track {
  return {
    id: u.id, title: u.title, categoryId: u.categoryId, categoryName: u.categoryName,
    duration: u.duration, audioUrl: u.audioUrl, viewCount: u.viewCount,
    isPremium: u.isPremium, sortOrder: u.sortOrder, prizeEnabled: u.prizeEnabled,
    hasQuiz: u.hasQuiz, isBuiltIn: u.isBuiltIn, description: u.description,
    fileName: u.fileName, uploadedAt: u.uploadedAt,
  };
}

// ─── Subcategory Card ────────────────────────────────────────────────────────
function SubcategoryCard({
  sub, color, trackCount, onPress,
}: {
  sub: StoredSubcategory; color: string; trackCount: number; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.subCard, { borderLeftColor: color }]}>
      <View style={[styles.subIconBox, { backgroundColor: color + "22" }]}>
        <Text style={styles.subIconText}>📁</Text>
      </View>
      <View style={styles.subInfo}>
        <Text style={styles.subName}>{sub.name}</Text>
        <Text style={[styles.subMeta, { color: color + "cc" }]}>
          {trackCount} பாடங்கள்
        </Text>
      </View>
      <View style={[styles.subCountBadge, { backgroundColor: color + "22" }]}>
        <Text style={[styles.subCountTxt, { color }]}>{trackCount}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color} />
    </Pressable>
  );
}

// ─── All Tracks Banner (fallback when no subcategories) ─────────────────────
function AllTracksBanner({ color, count, onPress }: { color: string; count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.allBanner, { borderColor: color + "44", backgroundColor: color + "11" }]}>
      <Ionicons name="musical-notes" size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.allBannerTitle, { color }]}>அனைத்து பாடங்கள்</Text>
        <Text style={styles.allBannerSub}>{count} tracks • tap to browse</Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={color} />
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const [category, setCategory] = useState<StoredCategory | null>(null);
  const [subcategories, setSubcategories] = useState<StoredSubcategory[]>([]);
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setShowAllTracks(false);
      setVisibleCount(15);
      Promise.all([
        getCategoryById(id ?? ""),
        getSubcategoriesByCategory(id ?? ""),
        getTracksByCategory(id ?? ""),
      ]).then(([cat, subs, trks]) => {
        setCategory(cat);
        setSubcategories(subs);
        setTracks(trks);
        // If no subcategories, show tracks directly
        if (subs.length === 0) setShowAllTracks(true);
        setLoading(false);
      });
    }, [id])
  );

  const color = category?.color ?? "#f0bc42";
  const hasSubcats = subcategories.length > 0;

  // Track counts per subcategory
  const subTrackCounts: Record<string, number> = {};
  let unassignedCount = 0;
  for (const t of tracks) {
    if (t.subcategoryId) {
      subTrackCounts[t.subcategoryId] = (subTrackCounts[t.subcategoryId] ?? 0) + 1;
    } else {
      unassignedCount++;
    }
  }

  const playlist: Track[] = tracks.map(unifiedToTrack);
  const visibleTracks = tracks.slice(0, visibleCount);

  if (!loading && !category) {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.emptyCenter}>
            <Text style={styles.errorIcon}>❓</Text>
            <Text style={styles.errorTxt}>பிரிவு கிடைக்கவில்லை</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameWorldBackground />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={[styles.catIconSmall, { backgroundColor: color + "33" }]}>
              <Text style={styles.catEmoji}>{category?.icon ?? "🎵"}</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {category?.name ?? ""}
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
            <Text style={[styles.countTxt, { color }]}>{tracks.length}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: "#ffffff11" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statsLabel}>
              {hasSubcats ? `${subcategories.length} Subcategories` : "நிலைகள்"}
            </Text>
            <Text style={[styles.statsValue, { color }]}>
              {tracks.length} பாடங்கள் இங்கு உள்ளன
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { backgroundColor: color }]} />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={color} />
            <Text style={styles.loadingTxt}>தரவு ஏற்றுகிறது...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── SUBCATEGORY LIST ─── */}
            {hasSubcats && !showAllTracks && (
              <>
                <Text style={styles.sectionTitle}>📁 தலைப்புகள் (Subcategories)</Text>

                {subcategories.map(sub => (
                  <SubcategoryCard
                    key={sub.id}
                    sub={sub}
                    color={color}
                    trackCount={subTrackCounts[sub.id] ?? 0}
                    onPress={() => router.push(`/subcategory/${sub.id}` as any)}
                  />
                ))}

                {/* Unassigned tracks shortcut */}
                {unassignedCount > 0 && (
                  <SubcategoryCard
                    sub={{
                      id: "__unassigned__",
                      categoryId: id ?? "",
                      name: "பொது பாடங்கள்",
                      sortOrder: 999,
                      createdAt: 0,
                    }}
                    color="#888"
                    trackCount={unassignedCount}
                    onPress={() =>
                      router.push(`/subcategory/unassigned?categoryId=${id}` as any)
                    }
                  />
                )}

                {/* See all tracks toggle */}
                <AllTracksBanner
                  color={color}
                  count={tracks.length}
                  onPress={() => setShowAllTracks(true)}
                />
              </>
            )}

            {/* ─── ALL TRACKS (no subcategories OR "See All" clicked) ─── */}
            {showAllTracks && (
              <>
                {hasSubcats && (
                  <Pressable
                    style={styles.backToSubsBtn}
                    onPress={() => setShowAllTracks(false)}
                  >
                    <Ionicons name="arrow-back" size={14} color={color} />
                    <Text style={[styles.backToSubsTxt, { color }]}>
                      Subcategories திரும்பு
                    </Text>
                  </Pressable>
                )}

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
                    onPress={() => setVisibleCount(v => v + 15)}
                    style={[styles.loadMoreBtn, { borderColor: color + "44" }]}
                  >
                    <Text style={[styles.loadMoreTxt, { color }]}>
                      மேலும் பாடங்கள் ({tracks.length - visibleCount} மீதி)
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={color} />
                  </Pressable>
                )}

                {tracks.length === 0 && (
                  <View style={styles.emptyCenter}>
                    <Ionicons name="musical-notes-outline" size={48} color={color + "66"} />
                    <Text style={styles.errorTxt}>இந்த பிரிவில் பாடங்கள் இல்லை</Text>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 130 }} />
          </ScrollView>
        )}

        <AudioPlayer />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0a2e" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: "#ffffff22", borderRadius: 18,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  catIconSmall: {
    width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16,
  },
  catEmoji: { fontSize: 18 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", flex: 1, letterSpacing: -0.3 },
  countBadge: {
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
    borderRadius: 19, borderWidth: 1,
  },
  countTxt: { fontSize: 14, fontWeight: "800" },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  statsLabel: {
    color: "#aaa", fontSize: 10, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase",
  },
  statsValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  progressBarContainer: {
    width: 60, height: 4, backgroundColor: "#ffffff22", borderRadius: 2, overflow: "hidden",
  },
  progressBarFill: { width: "70%", height: "100%", borderRadius: 2 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { color: "#888", fontSize: 13 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12 },
  sectionTitle: {
    color: "#fff", fontSize: 14, fontWeight: "700",
    marginBottom: 10, paddingHorizontal: 4,
  },
  // Subcategory card
  subCard: {
    backgroundColor: "#ffffff10", borderRadius: 14, borderLeftWidth: 3,
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#ffffff11",
  },
  subIconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  subIconText: { fontSize: 22 },
  subInfo: { flex: 1 },
  subName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  subMeta: { fontSize: 12, marginTop: 2 },
  subCountBadge: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    minWidth: 34, alignItems: "center",
  },
  subCountTxt: { fontSize: 14, fontWeight: "800" },
  // All tracks banner
  allBanner: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14, marginTop: 8, marginBottom: 10,
    borderWidth: 1,
  },
  allBannerTitle: { fontSize: 14, fontWeight: "700" },
  allBannerSub: { color: "#888", fontSize: 11, marginTop: 2 },
  // Back to subcats button
  backToSubsBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 4, marginBottom: 10,
  },
  backToSubsTxt: { fontSize: 13, fontWeight: "700" },
  // Load more
  loadMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 4,
    borderWidth: 1, borderRadius: 8, marginHorizontal: 4,
  },
  loadMoreTxt: { fontSize: 13, fontWeight: "700" },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 16 },
  errorIcon: { fontSize: 48 },
  errorTxt: { color: "#888", fontSize: 14, textAlign: "center" },
});
