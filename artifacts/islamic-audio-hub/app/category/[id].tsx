import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import TrackCard from "@/components/TrackCard";
import { CATEGORIES, TRACKS_BY_CATEGORY } from "@/data/categories";
import { useColors } from "@/hooks/useColors";

const CATEGORY_COLORS: Record<string, string> = {
  quran: "#c8a84b",
  hadith: "#4ade80",
  iman: "#60a5fa",
  seerah: "#f472b6",
  daily: "#fb923c",
};

const CATEGORY_ICONS: Record<string, string> = {
  quran: "book",
  hadith: "document-text",
  iman: "heart",
  seerah: "star",
  daily: "sunny",
};

export default function CategoryScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catId = id ?? "";

  const category = CATEGORIES.find((c) => c.id === catId);
  const tracks = TRACKS_BY_CATEGORY[catId] ?? [];
  const catColor = CATEGORY_COLORS[catId] ?? "#c8a84b";
  const catIcon = CATEGORY_ICONS[catId] ?? "musical-notes";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  if (!category) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: isDark ? "#0f0f0f" : "#f8f9fa" },
        ]}
      >
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            பிரிவு
          </Text>
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            பிரிவு கிடைக்கவில்லை
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isDark ? "#0f0f0f" : "#f8f9fa" },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: botPad + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View
            style={[
              styles.catIconBadge,
              { backgroundColor: catColor + "22" },
            ]}
          >
            <Ionicons name={catIcon as any} size={20} color={catColor} />
          </View>
          <View style={styles.headerInfo}>
            <Text
              style={[styles.headerTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
            <Text
              style={[styles.headerCount, { color: colors.mutedForeground }]}
            >
              {tracks.length} பாடங்கள்
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.progressBanner,
            { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
          ]}
        >
          <View style={styles.progressBannerRow}>
            <Text
              style={[styles.progressLabel, { color: colors.mutedForeground }]}
            >
              முன்னேற்றம்
            </Text>
            <Text style={[styles.progressValue, { color: catColor }]}>
              0 / {tracks.length}
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: isDark ? "#2a2a2a" : "#e2e8f0" },
            ]}
          >
            <View style={[styles.progressFill, { backgroundColor: catColor, width: "0%" }]} />
          </View>
        </View>

        <View style={styles.trackList}>
          {tracks.map((track, idx) => (
            <TrackCard
              key={track.id}
              track={track}
              variant="compact"
              playlist={tracks}
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.playerBar,
          { bottom: botPad - (Platform.OS === "web" ? 84 : 60) },
        ]}
      >
        <AudioPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  catIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerCount: {
    fontSize: 13,
    marginTop: 2,
  },
  progressBanner: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  progressBannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  trackList: {
    paddingHorizontal: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  playerBar: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
