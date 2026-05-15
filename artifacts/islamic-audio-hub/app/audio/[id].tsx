import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
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
import QuizModal from "@/components/QuizModal";
import { useAudio } from "@/context/AudioContext";
import { useApp } from "@/context/AppContext";
import { getCardById, type FBCard } from "@/services/firebase.firestore";
import { slideKindFromUrl } from "@/services/firebase.storage";
import type { Track } from "@/context/AppContext";

// ─── Tab definition ───────────────────────────────────────────────────────────
type TabKey = "explanation" | "video" | "podcast" | "quiz" | "read" | "slide";
const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "explanation", icon: "volume-high",       label: "ஒலி"     },
  { key: "video",       icon: "videocam",          label: "Video"   },
  { key: "podcast",     icon: "mic",               label: "Podcast" },
  { key: "quiz",        icon: "help-circle",       label: "Quiz"    },
  { key: "read",        icon: "book-outline",      label: "படிக்க"  },
  { key: "slide",       icon: "easel-outline",     label: "Slide"   },
];

// ─── FBCard → Track adapter ───────────────────────────────────────────────────
function fbCardToTrack(c: FBCard): Track {
  return {
    id:          c.id,
    title:       c.titleTa || c.titleEn,
    categoryId:  c.categoryId,
    categoryName: "",
    duration:    c.duration,
    audioUrl:    c.audioUrl,
    viewCount:   c.viewCount,
    isPremium:   c.isPremium,
    sortOrder:   c.sortOrder,
    hasQuiz:     c.hasQuiz,
    isBuiltIn:   false,
    description: c.description,
    fileName:    undefined,
    uploadedAt:  c.createdAt,
  };
}

// ─── Audio Tab ────────────────────────────────────────────────────────────────
function AudioTab({ url, label, card, isDark }: { url: string; label: string; card: FBCard; isDark: boolean }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  const track = fbCardToTrack({ ...card, audioUrl: url });
  const isActive = currentTrack?.id === card.id;

  const handlePlay = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) togglePlay();
    else playTrack(track, [track]);
  };

  if (!url) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="musical-note-outline" size={48} color="#888" />
        <Text style={[styles.emptyTabTxt, { color: isDark ? "#888" : "#aaa" }]}>
          {label} ஒலி இன்னும் சேர்க்கப்படவில்லை
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.audioTab}>
      <View style={[styles.audioArtwork, { backgroundColor: isDark ? "#1a3a2a" : "#e8f5ee" }]}>
        <Ionicons name="musical-notes" size={72} color="#1a7a4a" />
      </View>
      <Text style={[styles.audioTabTitle, { color: isDark ? "#fff" : "#0d2414" }]}>
        {card.titleTa || card.titleEn}
      </Text>
      {!!card.description && (
        <Text style={[styles.audioTabDesc, { color: isDark ? "#aaa" : "#5a7a64" }]} numberOfLines={3}>
          {card.description}
        </Text>
      )}
      <Pressable
        onPress={handlePlay}
        style={[styles.playBtn, { backgroundColor: "#1a7a4a" }]}
      >
        <Ionicons name={isActive && isPlaying ? "pause" : "play"} size={26} color="#fff" />
        <Text style={styles.playBtnTxt}>
          {isActive && isPlaying ? "இடைநிறுத்து" : label + " கேளுங்கள்"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Video Tab ────────────────────────────────────────────────────────────────
// Handles BOTH direct uploaded files (Firebase Storage URL) and external direct
// video URLs (.mp4 etc.) through the same expo-av <Video> source. Page links
// that the native player can't decode (YouTube/Vimeo watch pages) fall back to
// an "open externally" button so the content is never lost.

function isEmbedOnlyUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(u)) return true;
  if (/vimeo\.com\/\d+/.test(u) && !/\.(mp4|m3u8|webm)/.test(u)) return true;
  return false;
}

function VideoTab({ url, isDark }: { url: string; isDark: boolean }) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<{ error?: boolean }>({});

  if (!url) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="videocam-outline" size={48} color="#888" />
        <Text style={[styles.emptyTabTxt, { color: isDark ? "#888" : "#aaa" }]}>
          வீடியோ இன்னும் சேர்க்கப்படவில்லை
        </Text>
      </View>
    );
  }

  if (isEmbedOnlyUrl(url) || status.error) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="logo-youtube" size={48} color="#ef4444" />
        <Text style={[styles.emptyTabTxt, { color: isDark ? "#aaa" : "#5a7a64" }]}>
          இந்த வீடியோ வெளிப்புற இணைப்பில் உள்ளது
        </Text>
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(url)}
          style={[styles.playBtn, { backgroundColor: "#ef4444" }]}
        >
          <Ionicons name="open-outline" size={22} color="#fff" />
          <Text style={styles.playBtnTxt}>வீடியோவைத் திற</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.videoCont} showsVerticalScrollIndicator={false}>
      <View style={styles.videoFrame}>
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={styles.videoPlayer}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          onError={() => setStatus({ error: true })}
        />
      </View>
    </ScrollView>
  );
}

// ─── Read Tab ─────────────────────────────────────────────────────────────────
function ReadTab({ content, isDark }: { content: string; isDark: boolean }) {
  if (!content) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="book-outline" size={48} color="#888" />
        <Text style={[styles.emptyTabTxt, { color: isDark ? "#888" : "#aaa" }]}>
          படிக்கும் உரை இன்னும் சேர்க்கப்படவில்லை
        </Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.readScroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.readContent, { color: isDark ? "#e8e8e8" : "#1a1a1a" }]}>
        {content}
      </Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Slide Tab ────────────────────────────────────────────────────────────────
// Supports three slide formats:
//   • image  → rendered inline with <Image>
//   • pdf    → opened in the system browser (renders natively everywhere)
//   • ppt    → wrapped through the Office Online viewer so .ppt/.pptx render
// The doc viewer is dependency-free (no WebView) and works on web + native.

function officeViewerUrl(docUrl: string): string {
  return "https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(docUrl);
}

function DocSlide({ docUrl, isDark }: { docUrl: string; isDark: boolean }) {
  const kind = slideKindFromUrl(docUrl);
  const isPpt = kind === "ppt";
  const open = () =>
    WebBrowser.openBrowserAsync(isPpt ? officeViewerUrl(docUrl) : docUrl);

  return (
    <View style={styles.emptyTab}>
      <View style={[styles.docBadge, { backgroundColor: isPpt ? "#d2440022" : "#b3000022" }]}>
        <Ionicons
          name={isPpt ? "easel" : "document-text"}
          size={56}
          color={isPpt ? "#d24400" : "#b30000"}
        />
      </View>
      <Text style={[styles.docTitle, { color: isDark ? "#fff" : "#0d2414" }]}>
        {isPpt ? "PowerPoint வழங்கல்" : "PDF ஆவணம்"}
      </Text>
      <Text style={[styles.emptyTabTxt, { color: isDark ? "#888" : "#5a7a64" }]}>
        {(() => { try { return decodeURIComponent(docUrl.split("/").pop()?.split("?")[0] ?? ""); } catch { return ""; } })()}
      </Text>
      <Pressable onPress={open} style={[styles.playBtn, { backgroundColor: "#1a7a4a" }]}>
        <Ionicons name="open-outline" size={22} color="#fff" />
        <Text style={styles.playBtnTxt}>ஆவணத்தைத் திற</Text>
      </Pressable>
    </View>
  );
}

function SlideTab({ imageUrl, docUrl, isDark }: { imageUrl: string; docUrl: string; isDark: boolean }) {
  if (!imageUrl && !docUrl) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="easel-outline" size={48} color="#888" />
        <Text style={[styles.emptyTabTxt, { color: isDark ? "#888" : "#aaa" }]}>
          Slide இன்னும் சேர்க்கப்படவில்லை
        </Text>
      </View>
    );
  }

  if (imageUrl && slideKindFromUrl(imageUrl) !== "pdf" && slideKindFromUrl(imageUrl) !== "ppt") {
    return (
      <ScrollView contentContainerStyle={styles.slideCont} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: imageUrl }} style={styles.slideImage} resizeMode="contain" />
      </ScrollView>
    );
  }

  // Document slide (pdf / ppt) — from slideDocUrl, or a doc pasted into the image field
  return <DocSlide docUrl={docUrl || imageUrl} isDark={isDark} />;
}

// ─── Quiz Tab ─────────────────────────────────────────────────────────────────
function QuizTab({ card, isDark }: { card: FBCard; isDark: boolean }) {
  const [showQuiz, setShowQuiz] = useState(false);

  if (!card.hasQuiz || !card.quiz?.length) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="help-circle-outline" size={48} color="#888" />
        <Text style={[styles.emptyTabTxt, { color: isDark ? "#888" : "#aaa" }]}>
          Quiz இன்னும் சேர்க்கப்படவில்லை
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.quizTab}>
      <View style={[styles.quizArtwork, { backgroundColor: isDark ? "#1a1a3a" : "#f0f4ff" }]}>
        <Ionicons name="game-controller" size={64} color="#4a6ef5" />
      </View>
      <Text style={[styles.quizTabTitle, { color: isDark ? "#fff" : "#0d2414" }]}>
        {card.quizTitleTa || card.titleTa || "வினாடி வினா"}
      </Text>
      <Text style={[styles.quizTabSub, { color: isDark ? "#aaa" : "#5a7a64" }]}>
        {card.quiz.length} கேள்விகள் உள்ளன
      </Text>
      <Pressable
        onPress={() => setShowQuiz(true)}
        style={[styles.playBtn, { backgroundColor: "#4a6ef5" }]}
      >
        <Ionicons name="play" size={22} color="#fff" />
        <Text style={styles.playBtnTxt}>Quiz தொடங்கு</Text>
      </Pressable>
      <QuizModal
        visible={showQuiz}
        onClose={() => setShowQuiz(false)}
        trackId={card.id}
        trackTitle={card.titleTa || card.titleEn}
        prizeEnabled={false}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════
export default function AudioDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, addFavorite, removeFavorite } = useApp();
  const [card, setCard] = useState<FBCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("explanation");

  const bg  = isDark ? "#0a0a0a" : "#f4f8f5";
  const fg  = isDark ? "#ffffff" : "#0d2414";
  const sub = isDark ? "#888"    : "#5a7a64";

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getCardById(id)
      .then(c => { setCard(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: bg, paddingTop: topPad + 20 }]}>
        <ActivityIndicator size="large" color="#1a7a4a" />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={[styles.root, { backgroundColor: bg }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={fg} />
          </Pressable>
        </View>
        <View style={styles.emptyCenter}>
          <Text style={{ color: sub, fontSize: 16 }}>பாடம் கிடைக்கவில்லை</Text>
        </View>
      </View>
    );
  }

  const fav = isFavorite(card.id);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: bg }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={fg} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: fg }]} numberOfLines={2}>
            {card.titleTa || card.titleEn}
          </Text>
          {!!(card.titleTa && card.titleEn) && (
            <Text style={[styles.cardTitleEn, { color: sub }]} numberOfLines={1}>
              {card.titleEn}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => { fav ? removeFavorite(card.id) : addFavorite(card.id); }}
          style={styles.favBtn}
        >
          <Ionicons
            name={fav ? "heart" : "heart-outline"}
            size={24}
            color={fav ? "#ef4444" : sub}
          />
        </Pressable>
      </View>

      {/* ── Tab content (fills the full vertical space; Read text starts at top) ── */}
      <View style={{ flex: 1 }}>
        {activeTab === "explanation" && (
          <AudioTab url={card.audioUrl} label="விளக்கம்" card={card} isDark={isDark} />
        )}
        {activeTab === "video" && (
          <VideoTab url={card.videoUrl ?? ""} isDark={isDark} />
        )}
        {activeTab === "podcast" && (
          <AudioTab url={card.podcastAudioUrl ?? ""} label="Podcast" card={{ ...card, audioUrl: card.podcastAudioUrl ?? "" }} isDark={isDark} />
        )}
        {activeTab === "quiz" && (
          <QuizTab card={card} isDark={isDark} />
        )}
        {activeTab === "read" && (
          <ReadTab content={card.readContent ?? ""} isDark={isDark} />
        )}
        {activeTab === "slide" && (
          <SlideTab imageUrl={card.slideImageUrl ?? ""} docUrl={card.slideDocUrl ?? ""} isDark={isDark} />
        )}
      </View>

      {/* ── Global mini player (sits directly above the bottom nav) ── */}
      <AudioPlayer />

      {/* ── Bottom navigation menu (relocated to the absolute bottom) ── */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? "#111" : "#fff",
            borderTopColor: isDark ? "#222" : "#d4ead9",
            paddingBottom: Platform.OS === "web" ? 12 : insets.bottom + 6,
          },
        ]}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabItem, active && { borderTopColor: "#1a7a4a", borderTopWidth: 2 }]}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={active ? "#1a7a4a" : sub}
              />
              <Text style={[styles.tabLabel, { color: active ? "#1a7a4a" : sub, fontWeight: active ? "700" : "500" }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  favBtn:  { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  cardTitle:   { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  cardTitleEn: { fontSize: 12, marginTop: 2 },

  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 3,
    paddingVertical: 8, borderTopWidth: 2, borderTopColor: "transparent",
  },
  tabLabel: { fontSize: 10 },

  // Video tab
  videoCont:   { flexGrow: 1, justifyContent: "center", padding: 16 },
  videoFrame:  { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  videoPlayer: { width: "100%", height: "100%" },

  // Doc slide
  docBadge: { width: 110, height: 110, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  docTitle: { fontSize: 19, fontWeight: "800", textAlign: "center" },

  // Audio tab
  audioTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  audioArtwork: { width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center" },
  audioTabTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  audioTabDesc:  { fontSize: 14, textAlign: "center", lineHeight: 22 },
  playBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16,
  },
  playBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Quiz tab
  quizTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  quizArtwork: { width: 160, height: 160, borderRadius: 80, alignItems: "center", justifyContent: "center" },
  quizTabTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  quizTabSub:   { fontSize: 14, textAlign: "center" },

  // Read tab — text begins at the very top of the content area
  readScroll:  { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  readContent: { fontSize: 16, lineHeight: 30 },

  // Slide tab
  slideCont:  { padding: 16, alignItems: "center" },
  slideImage: { width: "100%", height: 500, borderRadius: 12 },

  // Empty state
  emptyTab:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTabTxt: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
