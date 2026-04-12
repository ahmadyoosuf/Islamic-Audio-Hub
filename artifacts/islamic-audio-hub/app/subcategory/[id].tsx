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
  getAllTracks,
  type StoredCategory,
  type StoredSubcategory,
  type UnifiedTrack,
} from "@/data/unifiedStorage";
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

export default function SubcategoryScreen() {
  const { id, categoryId: qCategoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const router = useRouter();

  const isUnassigned = id === "unassigned";

  const [category, setCategory] = useState<StoredCategory | null>(null);
  const [subcategory, setSubcategory] = useState<StoredSubcategory | null>(null);
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id, qCategoryId])
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const allTracks = await getAllTracks();
      let catId = qCategoryId ?? "";

      if (!isUnassigned) {
        // Resolve category from a track that has this subcategoryId
        if (!catId) {
          const sample = allTracks.find(t => t.subcategoryId === id);
          catId = sample?.categoryId ?? "";
        }
      }

      const [cat, subs] = await Promise.all([
        catId ? getCategoryById(catId) : Promise.resolve(null),
        catId ? getSubcategoriesByCategory(catId) : Promise.resolve([]),
      ]);

      setCategory(cat);

      if (isUnassigned) {
        const filtered = allTracks
          .filter(t => t.categoryId === catId && !t.subcategoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setSubcategory(null);
        setTracks(filtered);
      } else {
        const sub = subs.find(s => s.id === id) ?? null;
        setSubcategory(sub);
        const filtered = allTracks
          .filter(t => t.subcategoryId === id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setTracks(filtered);
      }
    } catch (e) {
      setError("தரவு ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.");
    } finally {
      setLoading(false);
    }
  }

  const color = category?.color ?? "#f0bc42";
  const screenTitle = isUnassigned ? "பொது பாடங்கள்" : (subcategory?.name ?? "");
  const playlist: Track[] = tracks.map(unifiedToTrack);
  const visibleTracks = tracks.slice(0, visibleCount);

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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {screenTitle}
            </Text>
          </View>
          {!loading && (
            <View style={[styles.countBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
              <Text style={[styles.countTxt, { color }]}>{tracks.length}</Text>
            </View>
          )}
        </View>

        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <Text style={styles.bcItem} onPress={() => router.push("/(tabs)")}>
            Home
          </Text>
          <Text style={styles.bcSep}> › </Text>
          {category && (
            <>
              <Text
                style={styles.bcItem}
                onPress={() => router.push(`/category/${category.id}` as any)}
              >
                {category.name}
              </Text>
              <Text style={styles.bcSep}> › </Text>
            </>
          )}
          <Text style={[styles.bcActive, { color }]} numberOfLines={1}>
            {screenTitle}
          </Text>
        </View>

        {/* Stats bar */}
        {!loading && !error && (
          <View style={[styles.statsRow, { backgroundColor: "#ffffff11" }]}>
            <Ionicons name="musical-notes" size={14} color={color} />
            <Text style={[styles.statsTxt, { color }]}>
              {tracks.length} பாடங்கள்
            </Text>
            <Text style={styles.statsNote}> • {category?.name}</Text>
          </View>
        )}

        {/* Body */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={color} />
            <Text style={styles.loadingTxt}>தரவு ஏற்றுகிறது...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTxt}>{error}</Text>
            <Pressable style={[styles.retryBtn, { borderColor: color }]} onPress={load}>
              <Text style={[styles.retryTxt, { color }]}>மீண்டும் முயற்சி</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {tracks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="musical-notes-outline" size={54} color={color + "55"} />
                <Text style={styles.emptyTitle}>பாடங்கள் இல்லை</Text>
                <Text style={styles.emptySubtxt}>
                  இந்த தலைப்பில் இன்னும் பாடங்கள் சேர்க்கப்படவில்லை.
                </Text>
              </View>
            ) : (
              <>
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
                    onPress={() => setVisibleCount(v => v + 20)}
                    style={[styles.loadMoreBtn, { borderColor: color + "55" }]}
                  >
                    <Text style={[styles.loadMoreTxt, { color }]}>
                      மேலும் பாடங்கள் ({tracks.length - visibleCount} மீதி)
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={color} />
                  </Pressable>
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
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", flex: 1, letterSpacing: -0.3 },
  countBadge: {
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
    borderRadius: 19, borderWidth: 1,
  },
  countTxt: { fontSize: 14, fontWeight: "800" },
  breadcrumb: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "#00000033",
  },
  bcItem: { color: "#aaa", fontSize: 11 },
  bcSep: { color: "#555", fontSize: 11 },
  bcActive: { fontSize: 11, fontWeight: "700" },
  statsRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  statsTxt: { fontSize: 13, fontWeight: "700" },
  statsNote: { color: "#888", fontSize: 12 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { color: "#888", fontSize: 13 },
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  errorIcon: { fontSize: 48 },
  errorTxt: { color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 22 },
  retryBtn: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
  },
  retryTxt: { fontSize: 14, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptySubtxt: { color: "#888", fontSize: 13, textAlign: "center", lineHeight: 20, paddingHorizontal: 32 },
  loadMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 4,
    borderWidth: 1, borderRadius: 8, marginHorizontal: 4,
  },
  loadMoreTxt: { fontSize: 13, fontWeight: "700" },
});
