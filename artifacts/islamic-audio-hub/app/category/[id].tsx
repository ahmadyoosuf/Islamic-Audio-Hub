import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import GameLevelCard from "@/components/GameLevelCard";
import GameWorldBackground from "@/components/GameWorldBackground";
import { CATEGORIES, TRACKS } from "@/data/categories";
import { useColors } from "@/hooks/useColors";

const CAT_COLORS: Record<string, string> = {
  quran: "#f0bc42",
  hadith: "#4ade80",
  iman: "#60a5fa",
  seerah: "#f472b6",
  daily: "#fb923c",
};

const CAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  quran: "book",
  hadith: "document-text",
  iman: "heart",
  seerah: "person",
  daily: "sunny",
};

export default function CategoryScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const category = CATEGORIES.find((c) => c.id === id);
  const tracks = TRACKS.filter((t) => t.categoryId === id);
  const color = CAT_COLORS[id ?? ""] ?? "#f0bc42";
  const icon = CAT_ICONS[id ?? ""] ?? "musical-notes";
  const [visibleCount, setVisibleCount] = useState(15);

  if (!category) {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
        <Text style={{ color: "#888", textAlign: "center", marginTop: 100 }}>
          பிரிவு கிடைக்கவில்லை
        </Text>
      </View>
    );
  }

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
              <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {category.name}
            </Text>
          </View>
          <View style={[styles.trackCountBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
            <Text style={[styles.trackCountText, { color }]}>{tracks.length}</Text>
          </View>
        </View>

        <View style={[styles.progressRow, { backgroundColor: "#ffffff11" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressLabel}>நிலைகள் (Levels)</Text>
            <Text style={[styles.progressValue, { color }]}>
              {tracks.length} பாடங்கள் இங்கு உள்ளன
            </Text>
          </View>
          <View style={[styles.progressBarContainer]}>
            <View style={[styles.progressBarFill, { width: "70%", backgroundColor: color }]} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleTracks.map((track, i) => (
            <GameLevelCard
              key={track.id}
              track={track}
              levelNumber={i + 1}
              playlist={tracks}
            />
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

          <View style={{ height: 130 }} />
        </ScrollView>

        <AudioPlayer />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff22",
    borderRadius: 18,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catIconSmall: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  trackCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 12,
  },
  trackCountText: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    gap: 12,
    borderRadius: 4,
  },
  progressLabel: {
    color: "#ffffff88",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  progressBarContainer: {
    width: 60,
    height: 4,
    backgroundColor: "#ffffff22",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  loadMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
