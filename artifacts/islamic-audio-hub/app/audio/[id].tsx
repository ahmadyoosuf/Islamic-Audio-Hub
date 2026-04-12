import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import QuizModal from "@/components/QuizModal";
import TrackCard from "@/components/TrackCard";
import { useApp } from "@/context/AppContext";
import { useAudio } from "@/context/AudioContext";
import { getTrackById, getTracksByCategory, type UnifiedTrack } from "@/data/unifiedStorage";
import { useColors } from "@/hooks/useColors";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} மணி ${m} நிமிடம்`;
  return `${m} நிமிடம்`;
}

const CATEGORY_COLORS: Record<string, string> = {
  quran: "#c8a84b",
  hadith: "#4ade80",
  iman: "#60a5fa",
  seerah: "#f472b6",
  daily: "#fb923c",
};

export default function AudioDetailScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playTrack, currentTrack, isPlaying, togglePlay, setIsExpanded } = useAudio();
  const { isFavorite, addFavorite, removeFavorite } = useApp();
  const [showQuiz, setShowQuiz] = useState(false);
  const [track, setTrack] = useState<UnifiedTrack | null>(null);
  const [catTracks, setCatTracks] = useState<UnifiedTrack[]>([]);

  useEffect(() => {
    if (!id) return;
    getTrackById(id).then(t => {
      setTrack(t);
      if (t) {
        getTracksByCategory(t.categoryId).then(all => setCatTracks(all));
      }
    });
  }, [id]);

  const catColor = track ? (CATEGORY_COLORS[track.categoryId] ?? "#c8a84b") : "#c8a84b";
  const related = catTracks.filter((t) => t.id !== id).slice(0, 5);
  const isActive = currentTrack?.id === track?.id;
  const fav = track ? isFavorite(track.id) : false;
  const hasQuiz = track?.hasQuiz === true;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const handlePlay = async () => {
    if (!track) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) {
      togglePlay();
    } else {
      playTrack(track, catTracks);
    }
    setIsExpanded(false);
  };

  const handleFav = async () => {
    if (!track) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fav ? removeFavorite(track.id) : addFavorite(track.id);
  };

  const handleShare = async () => {
    if (!track) return;
    await Share.share({
      message: `Islamic Audio Hub-ல் இந்த பாடத்தை கேளுங்கள்: ${track.title}`,
      title: track.title,
    });
  };

  if (!track) {
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
        </View>
        <View style={styles.emptyCenter}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            பாடம் கிடைக்கவில்லை
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
          <Text
            style={[styles.headerLabel, { color: colors.mutedForeground }]}
          >
            {track.categoryName}
          </Text>
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.artworkSection}>
          <View style={[styles.artworkBg, { backgroundColor: catColor + "18" }]}>
            <View style={[styles.artworkCircle, { backgroundColor: catColor + "33" }]}>
              <Ionicons name="musical-notes" size={64} color={catColor} />
            </View>
          </View>
        </View>

        <View style={styles.trackInfoSection}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: catColor + "22" },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: catColor }]}>
              {track.categoryName}
            </Text>
          </View>
          <Text style={[styles.trackTitle, { color: colors.foreground }]}>
            {track.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatDuration(track.duration)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="headset-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {track.viewCount.toLocaleString()} கேட்டார்கள்
              </Text>
            </View>
            {track.isPremium && (
              <View style={[styles.premiumTag, { backgroundColor: "#c8a84b22" }]}>
                <Ionicons name="star" size={12} color="#c8a84b" />
                <Text style={styles.premiumTagText}>Premium</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={handleFav} style={styles.iconAction}>
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={28}
              color={fav ? "#ef4444" : colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={handlePlay}
            style={[styles.playMain, { backgroundColor: catColor }]}
          >
            <Ionicons
              name={isActive && isPlaying ? "pause" : "play"}
              size={28}
              color="#000"
            />
            <Text style={styles.playMainText}>
              {isActive && isPlaying ? "இடைநிறுத்து" : "கேளுங்கள்"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShare} style={styles.iconAction}>
            <Ionicons name="share-outline" size={28} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {hasQuiz && (
          <Pressable
            onPress={() => setShowQuiz(true)}
            style={styles.quizBtnWrapper}
          >
            <LinearGradient
              colors={["#c8a84b", "#fb923c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quizBtn}
            >
              <Ionicons name="game-controller" size={22} color="#000" />
              <Text style={styles.quizBtnText}>கேள்வி-பதில் விளையாடு</Text>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </LinearGradient>
          </Pressable>
        )}

        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.relatedTitle, { color: colors.foreground }]}>
              இதே பிரிவில் மேலும்
            </Text>
            {related.map((rel) => (
              <TrackCard
                key={rel.id}
                track={rel}
                variant="compact"
                playlist={catTracks}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.playerBar,
          { bottom: botPad - (Platform.OS === "web" ? 84 : 60) },
        ]}
      >
        <AudioPlayer />
      </View>

      <QuizModal
        visible={showQuiz}
        onClose={() => setShowQuiz(false)}
        trackId={track.id}
        trackTitle={track.title}
        prizeEnabled={track.prizeEnabled ?? false}
      />
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  shareBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  artworkSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 40,
  },
  artworkBg: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 280,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  artworkCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfoSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  premiumTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  premiumTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c8a84b",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  iconAction: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  playMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  playMainText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  quizBtnWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 14,
    overflow: "hidden",
  },
  quizBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  quizBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  relatedSection: {
    paddingHorizontal: 16,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyCenter: {
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
