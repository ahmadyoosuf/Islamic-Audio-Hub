import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import QuizModal from "@/components/QuizModal";
import { useAudio } from "@/context/AudioContext";
import type { Track } from "@/context/AppContext";
import {
  useSubcategory,
  useCategory,
  useCards,
} from "@/hooks/useFirebaseData";
import type { FBCard } from "@/services/firebase.firestore";

// ─── Adapter: FBCard → Track ──────────────────────────────────────────────────

function fbCardToTrack(c: FBCard, categoryName: string): Track {
  return {
    id:           c.id,
    title:        c.titleTa || c.titleEn,
    categoryId:   c.categoryId,
    categoryName,
    duration:     c.duration,
    audioUrl:     c.audioUrl,
    viewCount:    c.viewCount,
    isPremium:    c.isPremium,
    sortOrder:    c.sortOrder,
    hasQuiz:      c.hasQuiz,
    isBuiltIn:    false,
    description:  c.description,
    fileName:     undefined,
    uploadedAt:   c.createdAt,
  };
}

// ─── Bilingual Card Row ───────────────────────────────────────────────────────

function CardRow({
  card, index, playlist, color, anim, onShowQuiz,
}: {
  card: FBCard; index: number; playlist: Track[]; color: string;
  anim: Animated.Value; onShowQuiz: (card: FBCard) => void;
}) {
  const { playTrack, currentTrack, isPlaying } = useAudio();
  const router = useRouter();
  const scale  = useRef(new Animated.Value(1)).current;

  const isActive = currentTrack?.id === card.id;
  const track    = fbCardToTrack(card, "");

  function handlePlay() {
    playTrack(track, playlist);
  }

  function handleCardPress() {
    router.push(`/audio/${card.id}` as any);
  }

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    }}>
      <Pressable
        onPress={handleCardPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 22 }).start()}
      >
        <Animated.View style={[
          styles.cardRow,
          {
            borderColor:     isActive ? color : "#ffffff22",
            borderWidth:     isActive ? 1.5   : 1,
            backgroundColor: isActive ? color + "18" : "#ffffff0d",
            transform:       [{ scale }],
          },
        ]}>
          {/* Index bubble */}
          <View style={[styles.indexBubble, { backgroundColor: isActive ? color : color + "33" }]}>
            {isActive && isPlaying ? (
              <Ionicons name="volume-high" size={14} color="#fff" />
            ) : (
              <Text style={[styles.indexNum, { color: isActive ? "#fff" : color }]}>{index}</Text>
            )}
          </View>

          {/* Titles */}
          <View style={styles.titleBlock}>
            {/* Tamil title */}
            <Text style={[styles.tamilTitle, { color: isActive ? color : "#ffffff" }]} numberOfLines={2}>
              {card.titleTa || card.titleEn}
            </Text>
            {/* English title */}
            {!!card.titleEn && card.titleEn !== card.titleTa && (
              <Text style={[styles.engTitle, { color: isActive ? color + "cc" : "#aaaaaa" }]} numberOfLines={1}>
                {card.titleEn}
              </Text>
            )}
            {/* Meta row */}
            <View style={styles.metaRow}>
              {card.duration > 0 && (
                <>
                  <Ionicons name="time-outline" size={10} color="#777" />
                  <Text style={styles.metaTxt}>{Math.floor(card.duration / 60)} நிமிடம்</Text>
                </>
              )}
              {isActive && isPlaying && (
                <Text style={[styles.nowPlaying, { color }]}>● கேட்கிறது</Text>
              )}
            </View>
          </View>

          {/* Right-side buttons */}
          <View style={styles.rightBtns}>
            {/* Quiz button — shown only when card has quiz */}
            {card.hasQuiz && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onShowQuiz(card); }}
                style={[styles.quizBtn, { backgroundColor: color + "25", borderColor: color + "66" }]}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle" size={14} color={color} />
                <Text style={[styles.quizBtnTxt, { color }]}>Quiz</Text>
              </TouchableOpacity>
            )}
            {/* Play button */}
            <TouchableOpacity
              onPress={handlePlay}
              style={[styles.playBtn, { backgroundColor: isActive && isPlaying ? color : color + "33" }]}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isActive && isPlaying ? "pause" : "play"}
                size={18}
                color={isActive && isPlaying ? "#fff" : color}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[styles.skelRow, { opacity: pulse }]}>
      <View style={[styles.skelCircle, { backgroundColor: color + "33" }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.skelLine1, { backgroundColor: "#ffffff22" }]} />
        <View style={[styles.skelLine2, { backgroundColor: "#ffffff11" }]} />
      </View>
      <View style={[styles.skelPlayBtn, { backgroundColor: color + "22" }]} />
    </Animated.View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyCards({ color }: { color: string }) {
  return (
    <View style={styles.emptyBox}>
      <View style={[styles.emptyIconBox, { backgroundColor: color + "22" }]}>
        <Ionicons name="musical-notes-outline" size={40} color={color} />
      </View>
      <Text style={styles.emptyTitle}>பாடங்கள் இல்லை</Text>
      <Text style={styles.emptyHint}>
        Admin → Firebase CMS → Cards tab-ல் இந்த உப-பிரிவுக்கு பாடங்கள் சேர்க்கவும்
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SubcategoryScreen() {
  const { id, categoryId: paramCatId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const router = useRouter();

  // ── 1. Fetch subcategory metadata ────────────────────────────────────────
  const { subcategory, loading: subLoading } = useSubcategory(id ?? "");

  // ── 2. Fetch category metadata (for color + breadcrumb) ──────────────────
  const catId = subcategory?.categoryId ?? paramCatId ?? "";
  const { category, loading: catLoading } = useCategory(catId);

  // ── 3. Fetch cards for this subcategory (real-time onSnapshot) ────────────
  const { cards, loading: cardsLoading } = useCards(id ?? "");

  const loading = subLoading || cardsLoading;

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [quizCard, setQuizCard] = useState<FBCard | null>(null);

  // Convert to Track[] for playlist
  const categoryName = category?.name ?? "";
  const playlist: Track[] = cards.map(c => fbCardToTrack(c, categoryName));

  // ── Stagger animations ───────────────────────────────────────────────────
  const cardAnims = useRef<Animated.Value[]>([]).current;
  useEffect(() => {
    if (loading || cards.length === 0) return;
    cardAnims.length = 0;
    for (let i = 0; i < cards.length; i++) cardAnims.push(new Animated.Value(0));
    setTimeout(() => {
      Animated.stagger(50, cardAnims.map(a =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 90, friction: 12 })
      )).start();
    }, 80);
  }, [loading, cards.length]);

  const [visibleCount, setVisibleCount] = useState(20);
  const visibleCards = cards.slice(0, visibleCount);

  const color = category?.color ?? "#f0bc42";
  const screenTitle = subcategory?.name ?? "பாடங்கள்";

  return (
    <View style={styles.container}>
      {/* Dark game-world background gradient */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a1628" }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color + "12" }]} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
            {!!subcategory?.nameEn && (
              <Text style={[styles.headerEn, { color: color + "cc" }]} numberOfLines={1}>
                {subcategory.nameEn}
              </Text>
            )}
          </View>
          {!loading && (
            <View style={[styles.countBadge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
              <Text style={[styles.countTxt, { color }]}>{cards.length}</Text>
            </View>
          )}
        </View>

        {/* ── Breadcrumb ── */}
        <View style={styles.breadcrumb}>
          <Text style={styles.bcLink} onPress={() => router.push("/(tabs)" as any)}>முகப்பு</Text>
          <Text style={styles.bcSep}> › </Text>
          {category && (
            <>
              <Text
                style={styles.bcLink}
                onPress={() => router.push(`/category/${category.id}` as any)}
              >
                {category.name}
              </Text>
              <Text style={styles.bcSep}> › </Text>
            </>
          )}
          <Text style={[styles.bcActive, { color }]} numberOfLines={1}>{screenTitle}</Text>
        </View>

        {/* ── Stats bar ── */}
        {!loading && (
          <View style={[styles.statsRow, { backgroundColor: color + "15" }]}>
            <Ionicons name="musical-notes" size={13} color={color} />
            <Text style={[styles.statsTxt, { color }]}>{cards.length} பாடங்கள்</Text>
            {category && (
              <>
                <Text style={styles.statsDot}>•</Text>
                <Text style={styles.statsCat}>{category.name}</Text>
              </>
            )}
          </View>
        )}

        {/* ── Body ── */}
        {loading ? (
          <View style={styles.scrollContent}>
            {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} color={color} />)}
          </View>
        ) : cards.length === 0 ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <EmptyCards color={color} />
          </ScrollView>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section heading */}
            <View style={styles.sectionRow}>
              <View style={[styles.sectionDot, { backgroundColor: color }]} />
              <Text style={styles.sectionTitle}>பாடங்கள்</Text>
              <View style={[styles.sectionBadge, { backgroundColor: color + "33" }]}>
                <Text style={[styles.sectionBadgeTxt, { color }]}>{cards.length}</Text>
              </View>
            </View>

            {/* Card list */}
            {visibleCards.map((card, i) => (
              <CardRow
                key={card.id}
                card={card}
                index={i + 1}
                playlist={playlist}
                color={color}
                anim={cardAnims[i] ?? new Animated.Value(1)}
                onShowQuiz={setQuizCard}
              />
            ))}

            {/* Load more */}
            {visibleCount < cards.length && (
              <Pressable
                onPress={() => setVisibleCount(v => v + 20)}
                style={[styles.loadMoreBtn, { borderColor: color + "55" }]}
              >
                <Text style={[styles.loadMoreTxt, { color }]}>
                  மேலும் {cards.length - visibleCount} பாடங்கள்
                </Text>
                <Ionicons name="chevron-down" size={16} color={color} />
              </Pressable>
            )}

            <View style={{ height: 140 }} />
          </ScrollView>
        )}

        <AudioPlayer />
      </SafeAreaView>

      {/* ── Quiz Modal (shown when user taps Quiz on a card) ── */}
      {quizCard && (
        <QuizModal
          visible={!!quizCard}
          onClose={() => setQuizCard(null)}
          trackId={quizCard.id}
          trackTitle={quizCard.titleTa || quizCard.titleEn}
          firestoreQuestions={quizCard.quiz}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: "#ffffff22", borderRadius: 18,
  },
  headerCenter: { flex: 1 },
  headerTitle:  { color: "#ffffff", fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  headerEn:     { fontSize: 11, marginTop: 2 },
  countBadge:   { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, borderWidth: 1 },
  countTxt:     { fontSize: 14, fontWeight: "800" },

  breadcrumb: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#00000033",
  },
  bcLink:   { color: "#888", fontSize: 11 },
  bcSep:    { color: "#555", fontSize: 11 },
  bcActive: { fontSize: 11, fontWeight: "700" },

  statsRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  statsTxt: { fontSize: 12, fontWeight: "700" },
  statsDot: { color: "#555", fontSize: 11 },
  statsCat: { color: "#888", fontSize: 11, flex: 1 },

  scrollContent: { paddingHorizontal: 14, paddingTop: 14 },

  sectionRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14,
  },
  sectionDot:     { width: 4, height: 18, borderRadius: 2 },
  sectionTitle:   { fontSize: 14, fontWeight: "700", color: "#fff", flex: 1 },
  sectionBadge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  sectionBadgeTxt:{ fontSize: 12, fontWeight: "800" },

  // ── Card Row ──
  cardRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 12, marginBottom: 10,
  },
  indexBubble: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  indexNum: { fontSize: 15, fontWeight: "800" },

  titleBlock: { flex: 1, gap: 2 },
  tamilTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  engTitle:   { fontSize: 11, lineHeight: 16 },
  metaRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaTxt:    { fontSize: 10, color: "#777" },

  nowPlaying: { fontSize: 10, fontWeight: "700" },

  rightBtns: {
    flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0,
  },

  quizBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  quizBtnTxt: { fontSize: 10, fontWeight: "800" },

  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },

  // ── Skeleton ──
  skelRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#ffffff0d", borderRadius: 14, padding: 12, marginBottom: 10,
  },
  skelCircle:  { width: 36, height: 36, borderRadius: 18 },
  skelLine1:   { height: 14, borderRadius: 7, width: "70%" },
  skelLine2:   { height: 10, borderRadius: 5, width: "45%" },
  skelPlayBtn: { width: 40, height: 40, borderRadius: 20 },

  // ── Empty ──
  emptyBox: {
    alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 14,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyHint:  { color: "#888", fontSize: 12, textAlign: "center", lineHeight: 18 },

  // ── Load more ──
  loadMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 4,
    borderWidth: 1, borderRadius: 10, marginHorizontal: 4,
  },
  loadMoreTxt: { fontSize: 13, fontWeight: "700" },
});
