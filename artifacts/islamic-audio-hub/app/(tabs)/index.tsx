import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import QuizModal from "@/components/QuizModal";
import { useAudio } from "@/context/AudioContext";
import { CATEGORIES, TRACKS } from "@/data/categories";
import { useColors } from "@/hooks/useColors";

const TICKER_ITEMS = [
  "بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "குர்ஆன் விளக்கம்",
  "ஹதீஸ் விளக்கம்",
  "ஈமான் அடிப்படைகள்",
  "அன்றாட வழிகாட்டி",
  "Islamic Audio Learning",
  "Daily Free Audio",
];

const CAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  quran: "book",
  hadith: "document-text",
  iman: "heart",
  seerah: "person",
  daily: "sunny",
};

const CAT_COLORS: Record<string, string> = {
  quran: "#f0bc42",
  hadith: "#4ade80",
  iman: "#60a5fa",
  seerah: "#f472b6",
  daily: "#fb923c",
};

function TickerBanner({ isDark }: { isDark: boolean }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -500,
        duration: 20000,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const fullText =
    TICKER_ITEMS.join("   •   ") + "   •   " + TICKER_ITEMS.join("   •   ");
  return (
    <View
      style={[styles.ticker, { backgroundColor: isDark ? "#141414" : "#f1f5f9" }]}
    >
      <Animated.View style={{ transform: [{ translateX: scrollX }] }}>
        <Text style={[styles.tickerText, { color: isDark ? "#8a8070" : "#6b7280" }]}>
          {fullText}
        </Text>
      </Animated.View>
    </View>
  );
}

function CategoryCard({
  cat,
  isDark,
  onPress,
}: {
  cat: (typeof CATEGORIES)[0];
  isDark: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const color = CAT_COLORS[cat.id] ?? "#f0bc42";
  const icon = CAT_ICONS[cat.id] ?? "musical-notes";
  const trackCount = TRACKS.filter((t) => t.categoryId === cat.id).length;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.catCard,
        {
          backgroundColor: isDark ? "#0f0f0f" : "#ffffff",
          borderColor: isDark ? "#1a1a1a" : "#e5e7eb",
          borderLeftColor: color,
          borderLeftWidth: 3,
        },
      ]}
    >
      <View style={[styles.catIconBg, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
        <Text style={[styles.catMeta, { color: colors.mutedForeground }]}>
          {trackCount} பாடங்கள்
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={color} />
    </Pressable>
  );
}

function TrackGridCard({ track, isDark }: { track: (typeof TRACKS)[0]; isDark: boolean }) {
  const colors = useColors();
  const cat = CATEGORIES.find((c) => c.id === track.categoryId);
  const color = CAT_COLORS[track.categoryId] ?? "#f0bc42";
  const { playTrack, currentTrack, isPlaying } = useAudio();
  const isActive = currentTrack?.id === track.id;
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/audio/${track.id}` as any)}
      style={[
        styles.trackGridCard,
        {
          backgroundColor: isDark ? "#0f0f0f" : "#ffffff",
          borderColor: isActive ? color : isDark ? "#1a1a1a" : "#e5e7eb",
          borderWidth: isActive ? 1.5 : 1,
        },
      ]}
    >
      <View style={[styles.trackGridTop, { backgroundColor: color + "22" }]}>
        <Ionicons name={CAT_ICONS[track.categoryId] ?? "musical-notes"} size={26} color={color} />
        {isActive && isPlaying && (
          <View style={[styles.playingDot, { backgroundColor: color }]} />
        )}
      </View>
      <View style={styles.trackGridBody}>
        <Text style={[styles.trackGridCat, { color }]}>
          {cat?.name?.split(" ")[0] ?? ""}
        </Text>
        <Text
          style={[styles.trackGridTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {track.title}
        </Text>
      </View>
      <Pressable
        onPress={() =>
          playTrack(
            track,
            TRACKS.filter((t) => t.categoryId === track.categoryId),
          )
        }
        style={[styles.trackGridPlay, { backgroundColor: color + "22" }]}
      >
        <Ionicons name={isActive && isPlaying ? "pause" : "play"} size={16} color={color} />
      </Pressable>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [popularActive, setPopularActive] = useState(false);
  const [recentActive, setRecentActive] = useState(false);
  const [quizTrackId, setQuizTrackId] = useState<string | null>(null);

  const popularTracks = [...TRACKS]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);
  const recentTracks = [...TRACKS].slice(-10).reverse();
  const showList = popularActive || recentActive;
  const displayTracks = recentActive ? recentTracks : popularTracks;

  const togglePopular = () => {
    setPopularActive((p) => !p);
    setRecentActive(false);
  };
  const toggleRecent = () => {
    setRecentActive((r) => !r);
    setPopularActive(false);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDark ? "#0a0a0a" : "#f6faf6" }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.logo, { color: "#f0bc42" }]}>Islamic Audio Hub</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            செவிகள் சிறக்கட்டும்!
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: "#f0bc4222" }]}>
          <Ionicons name="headset" size={20} color="#f0bc42" />
        </View>
      </View>

      <TickerBanner isDark={isDark} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.catsSection}>
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              isDark={isDark}
              onPress={() => router.push(`/category/${cat.id}` as any)}
            />
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            onPress={togglePopular}
            style={[
              styles.togglePill,
              {
                backgroundColor: popularActive ? "#f0bc42" : isDark ? "#141414" : "#ffffff",
                borderColor: popularActive ? "#f0bc42" : isDark ? "#2a2a2a" : "#d1d5db",
              },
            ]}
          >
            <Ionicons
              name="flame"
              size={14}
              color={popularActive ? "#000" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.pillText,
                { color: popularActive ? "#000" : colors.mutedForeground },
              ]}
            >
              பிரபலமானவை
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleRecent}
            style={[
              styles.togglePill,
              {
                backgroundColor: recentActive ? "#f0bc42" : isDark ? "#141414" : "#ffffff",
                borderColor: recentActive ? "#f0bc42" : isDark ? "#2a2a2a" : "#d1d5db",
              },
            ]}
          >
            <Ionicons
              name="time"
              size={14}
              color={recentActive ? "#000" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.pillText,
                { color: recentActive ? "#000" : colors.mutedForeground },
              ]}
            >
              சமீபத்தியவை
            </Text>
          </Pressable>
        </View>

        {showList && (
          <View style={styles.trackGrid}>
            {displayTracks.map((track) => (
              <TrackGridCard key={track.id} track={track} isDark={isDark} />
            ))}
          </View>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      <AudioPlayer />

      {quizTrackId && (
        <QuizModal
          visible
          onClose={() => setQuizTrackId(null)}
          trackId={quizTrackId}
          trackTitle={TRACKS.find((t) => t.id === quizTrackId)?.title ?? ""}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  tagline: { fontSize: 11, marginTop: 2 },
  headerBadge: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  ticker: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    overflow: "hidden",
    height: 36,
  },
  tickerText: { fontSize: 12, lineHeight: 20 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  catsSection: { gap: 8, marginBottom: 16 },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  catIconBg: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  catName: { fontSize: 14, fontWeight: "700" },
  catMeta: { fontSize: 12, marginTop: 2 },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 20,
  },
  pillText: { fontSize: 13, fontWeight: "700" },
  trackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  trackGridCard: { width: "48%", borderWidth: 1, overflow: "hidden" },
  trackGridTop: {
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  playingDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackGridBody: { padding: 10, gap: 4 },
  trackGridCat: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trackGridTitle: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  trackGridPlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
  },
});
