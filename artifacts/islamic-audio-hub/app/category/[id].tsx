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
  getTracksByCategory,
  type StoredCategory,
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

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [category, setCategory] = useState<StoredCategory | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        getCategoryById(id ?? ''),
        getTracksByCategory(id ?? ''),
      ]).then(([cat, trks]) => {
        setCategory(cat);
        setTracks(trks);
        setLoading(false);
      });
    }, [id])
  );

  const color = category?.color ?? "#f0bc42";

  if (!loading && !category) {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
        <Text style={{ color: "#888", textAlign: "center", marginTop: 100 }}>
          பிரிவு கிடைக்கவில்லை
        </Text>
      </View>
    );
  }

  const playlist: Track[] = tracks.map(unifiedToTrack);
  const visibleTracks = tracks.slice(0, visibleCount);

  return (
    <View style={[styles.container, { backgroundColor: "#0f0a2e" }]}>
      <GameWorldBackground />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
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
          <View style={[styles.trackCountBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
            <Text style={[styles.trackCountText, { color }]}>{tracks.length}</Text>
          </View>
        </View>

        <View style={[styles.progressRow, { backgroundColor: "#ffffff11" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressLabel}>நிலைகள் (Levels)</Text>
            <Text style={[styles.progressValue, { color }]}>{tracks.length} பாடங்கள் இங்கு உள்ளன</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: "70%", backgroundColor: color }]} />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {visibleTracks.map((track, i) => (
              <GameLevelCard key={track.id} track={unifiedToTrack(track)} levelNumber={i + 1} playlist={playlist} />
            ))}

            {visibleCount < tracks.length && (
              <Pressable
                onPress={() => setVisibleCount((v) => v + 15)}
                style={[styles.loadMore, { borderColor: color + "44" }]}
              >
                <Text style={[styles.loadMoreText, { color }]}>
                  மேலும் பாடங்கள் காண்க ({tracks.length - visibleCount} மீதி)
                </Text>
                <Ionicons name="chevron-down" size={16} color={color} />
              </Pressable>
            )}

            {tracks.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={48} color={color + "66"} />
                <Text style={[styles.emptyText, { color: "#888" }]}>இந்த பிரிவில் பாடங்கள் இல்லை</Text>
              </View>
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
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff22", borderRadius: 18 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  catIconSmall: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  catEmoji: { fontSize: 18 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", flex: 1, letterSpacing: -0.3 },
  trackCountBadge: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, borderWidth: 1 },
  trackCountText: { fontSize: 14, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  progressLabel: { color: "#aaa", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  progressValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  progressBarContainer: { width: 60, height: 4, backgroundColor: "#ffffff22", borderRadius: 2, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 2 },
  listContent: { paddingHorizontal: 12, paddingTop: 8 },
  loadMore: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 4, borderWidth: 1, borderRadius: 8, marginHorizontal: 4,
  },
  loadMoreText: { fontSize: 13, fontWeight: "700" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 16 },
  emptyText: { fontSize: 14 },
});
