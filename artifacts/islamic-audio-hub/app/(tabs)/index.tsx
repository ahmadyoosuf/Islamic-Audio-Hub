import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Dimensions,
  FlatList,
  Image,
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
import { useApp } from "@/context/AppContext";
import type { Track } from "@/context/AppContext";
import {
  CATEGORIES,
  getLatestByCategory,
  getMostPopular,
  getTodaysFreeTrack,
  TRACKS_BY_CATEGORY,
} from "@/data/categories";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 220;

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

export default function HomeScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recentTracks } = useApp();
  const todaysFree = getTodaysFreeTrack();
  const latestByCategory = getLatestByCategory();
  const popular = getMostPopular().slice(0, 8);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isDark ? "#0f0f0f" : "#f8f9fa" },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: botPad + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.appName, { color: "#c8a84b" }]}>
              Islamic Audio Hub
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              செவிகள் சிறக்கட்டும்!
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Ionicons name="search" size={24} color={colors.foreground} />
          </View>
        </View>

        <View style={styles.heroBanner}>
          <LinearGradient
            colors={["#c8a84b22", "#c8a84b08", "transparent"]}
            style={styles.heroGrad}
          >
            <View style={styles.heroContent}>
              <Ionicons name="moon" size={48} color="#c8a84b" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                  தமிழ் இஸ்லாமிய கற்றல்
                </Text>
                <Text
                  style={[styles.heroSub, { color: colors.mutedForeground }]}
                >
                  106 பாடங்கள் · 5 பிரிவுகள்
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Section title="பிரிவுகள்">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {CATEGORIES.map((cat) => {
              const catColor = CATEGORY_COLORS[cat.id] ?? "#c8a84b";
              const catIcon = CATEGORY_ICONS[cat.id] ?? "musical-notes";
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => router.push(`/category/${cat.id}` as any)}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    {
                      backgroundColor: catColor + (isDark ? "22" : "18"),
                      borderColor: catColor,
                      borderWidth: 1,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Ionicons name={catIcon as any} size={18} color={catColor} />
                  <View style={styles.categoryPillInfo}>
                    <Text
                      style={[styles.categoryPillName, { color: catColor }]}
                    >
                      {cat.name}
                    </Text>
                    <Text
                      style={[
                        styles.categoryPillCount,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {cat.trackCount} பாடங்கள்
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Section>

        <Section title="இன்றைய இலவசம்">
          <Pressable
            onPress={() => router.push(`/audio/${todaysFree.id}` as any)}
            style={({ pressed }) => [
              styles.todayCard,
              {
                backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
                borderColor: "#c8a84b",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={["#c8a84b22", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.todayGrad}
            >
              <View style={styles.todayContent}>
                <View style={[styles.todayIcon, { backgroundColor: "#c8a84b33" }]}>
                  <Ionicons name="gift" size={28} color="#c8a84b" />
                </View>
                <View style={styles.todayInfo}>
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>இலவசம்</Text>
                  </View>
                  <Text
                    style={[styles.todayTitle, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {todaysFree.title}
                  </Text>
                  <Text
                    style={[
                      styles.todayCategory,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {todaysFree.categoryName}
                  </Text>
                </View>
                <Ionicons name="play-circle" size={44} color="#c8a84b" />
              </View>
            </LinearGradient>
          </Pressable>
        </Section>

        {recentTracks.length > 0 && (
          <Section title="சமீபத்தில் கேட்டது">
            <View style={styles.trackList}>
              {recentTracks.slice(0, 5).map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  variant="compact"
                  playlist={recentTracks}
                />
              ))}
            </View>
          </Section>
        )}

        <Section title="பிரிவுகளின் புதிய பாடங்கள்">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}
          >
            {latestByCategory.map(({ category, track }) => (
              <TrackCard
                key={track.id}
                track={track}
                variant="featured"
                playlist={TRACKS_BY_CATEGORY[category.id]}
              />
            ))}
          </ScrollView>
        </Section>

        <Section title="பிரபலமான பாடங்கள்">
          <View style={styles.trackList}>
            {popular.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                variant="compact"
                playlist={popular}
              />
            ))}
          </View>
        </Section>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

import { Platform } from "react-native";

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  heroBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#c8a84b44",
  },
  heroGrad: {
    padding: 20,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  heroSub: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    minWidth: 160,
  },
  categoryPillInfo: {
    gap: 2,
  },
  categoryPillName: {
    fontSize: 13,
    fontWeight: "700",
  },
  categoryPillCount: {
    fontSize: 11,
  },
  todayCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  todayGrad: {
    padding: 16,
  },
  todayContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  todayIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  todayInfo: {
    flex: 1,
    gap: 4,
  },
  todayBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#c8a84b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000",
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  todayCategory: {
    fontSize: 12,
  },
  trackList: {
    paddingHorizontal: 16,
  },
  featuredRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  playerBar: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
