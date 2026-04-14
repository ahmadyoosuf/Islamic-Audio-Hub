import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BookOpen, Search, FileText, GraduationCap, Star, User,
  Sun, HandMetal, Music, Layers, Headphones, ArrowRight,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import { useApp } from "@/context/AppContext";
import {
  useCategory,
  useSubcategories,
  useCardsByCategory,
} from "@/hooks/useFirebaseData";
import type { FBCategory, FBSubcategory, FBCard } from "@/services/firebase.firestore";

// ─── Layout ───────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_W   = (Math.min(SCREEN_W, 480) - 32 - CARD_GAP) / 2;

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  green:    "#1a7a4a",
  border:   "#d4ead9",
  bg:       "#f4faf6",
  bgDark:   "#0a0e0c",
  cardBg:   "#ffffff",
  cardDark: "#111816",
  txt:      "#0d2414",
  txtDark:  "#e0f0e8",
  sub:      "#5a7a5a",
  subDark:  "#5a9a6a",
  bdr:      "#1e2e24",
};

// ─── Subcategory icon resolver ────────────────────────────────────────────────

type LucideProps = { size: number; color: string; strokeWidth?: number };

function SubcategoryIcon({ nameEn, name, size, color }: { nameEn: string; name: string } & LucideProps) {
  const hay = (nameEn + " " + name).toLowerCase();
  const sw  = 2;
  if (hay.match(/quran|surah|fatiha|ikhlas|falaq|nas|lahab|fath|kafirun|kawthar|maun|quraysh/))
    return <BookOpen size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/tafseer|tafsir|virivurai|explanation|விரிவுரை/))
    return <Search size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/hadith|hadis|ஹதீஸ்/))
    return <FileText size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/lesson|learn|class|school/))
    return <GraduationCap size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/iman|faith|star|aqeedah/))
    return <Star size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/seerah|nabi|prophet|person/))
    return <User size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/daily|morning|evening|sun/))
    return <Sun size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/dua|prayer|hand/))
    return <HandMetal size={size} color={color} strokeWidth={sw} />;
  if (hay.match(/layer|level|sub/))
    return <Layers size={size} color={color} strokeWidth={sw} />;
  return <Music size={size} color={color} strokeWidth={sw} />;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ isDark, color }: { isDark: boolean; color: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[
      styles.subCard,
      { width: CARD_W, backgroundColor: isDark ? C.cardDark : C.cardBg, opacity: pulse },
    ]}>
      <View style={[styles.skelIcon, { backgroundColor: color + "22" }]} />
      <View style={[styles.skelLine1, { backgroundColor: isDark ? "#1e2e24" : "#e8f0ea" }]} />
      <View style={[styles.skelLine2, { backgroundColor: isDark ? "#1a2820" : "#f0f6f1" }]} />
    </Animated.View>
  );
}

// ─── Subcategory Card ─────────────────────────────────────────────────────────

function SubCard({
  sub, color, cardCount, isDark, anim, onPress,
}: {
  sub: FBSubcategory; color: string; cardCount: number;
  isDark: boolean; anim: Animated.Value; onPress: () => void;
}) {
  const scale    = useRef(new Animated.Value(1)).current;
  const bgCard   = isDark ? C.cardDark : C.cardBg;
  const textMain = isDark ? C.txtDark : C.txt;
  const textSub  = isDark ? C.subDark : C.sub;
  const iconBg   = isDark ? color + "28" : color + "18";

  return (
    <Animated.View style={{
      width: CARD_W,
      opacity: anim,
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
    }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 22 }).start()}
      >
        <Animated.View style={[
          styles.subCard,
          { width: CARD_W, backgroundColor: bgCard, borderColor: isDark ? C.bdr : C.border, transform: [{ scale }] },
        ]}>
          {/* Accent */}
          <View style={[styles.cardAccent, { backgroundColor: color }]} />

          {/* Icon */}
          <View style={[styles.cardIconBox, { backgroundColor: iconBg }]}>
            <SubcategoryIcon nameEn={sub.nameEn} name={sub.name} size={26} color={color} />
          </View>

          {/* Tamil title (primary) */}
          <Text style={[styles.cardTamil, { color: textMain }]} numberOfLines={2}>
            {sub.name}
          </Text>

          {/* English title (secondary) */}
          {!!sub.nameEn && (
            <Text style={[styles.cardEnglish, { color: textSub }]} numberOfLines={1}>
              {sub.nameEn}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.cardBottom}>
            <View style={[styles.countPill, { backgroundColor: color + "18" }]}>
              <Headphones size={10} color={color} strokeWidth={2} />
              <Text style={[styles.countTxt, { color }]}>{cardCount} பாடங்கள்</Text>
            </View>
            <View style={[styles.arrowCircle, { borderColor: color + "55" }]}>
              <ArrowRight size={12} color={color} strokeWidth={2.5} />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty subcategories ──────────────────────────────────────────────────────

function EmptySubcategories({ color, isDark }: { color: string; isDark: boolean }) {
  const txt = isDark ? C.subDark : C.sub;
  return (
    <View style={styles.emptyBox}>
      <View style={[styles.emptyIconBox, { backgroundColor: color + "18" }]}>
        <Layers size={36} color={color} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? C.txtDark : C.txt }]}>
        உப-பிரிவுகள் இல்லை
      </Text>
      <Text style={[styles.emptyHint, { color: txt }]}>
        Admin → Firebase CMS → Subcategories tab-ல் உப-பிரிவுகள் சேர்க்கவும்
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CategoryScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const { isDarkMode: isDark } = useApp();

  // ── 1. Fetch category from Firebase only ─────────────────────────────────
  const { category: fbCat, loading: fbCatLoading } = useCategory(id ?? "");
  const catData = fbCat;

  // ── 2. Fetch subcategories for this category (real-time) ─────────────────
  const { subcategories, loading: subsLoading } = useSubcategories(id ?? "");

  // ── 3. Fetch all cards for this category (for count badges) ───────────────
  const { cards: catCards, loading: cardsLoading } = useCardsByCategory(id ?? "");

  // Card count per subcategory
  const cardCounts = catCards.reduce<Record<string, number>>((acc, c) => {
    acc[c.subcategoryId] = (acc[c.subcategoryId] ?? 0) + 1;
    return acc;
  }, {});

  // ── Loading / ready states ───────────────────────────────────────────────
  // Show skeleton while we don't have EITHER the category OR subs yet
  const loading = fbCatLoading || subsLoading;

  // ── Stagger animations ───────────────────────────────────────────────────
  const cardAnims = useRef<Animated.Value[]>([]).current;
  useEffect(() => {
    if (loading || subcategories.length === 0) return;
    cardAnims.length = 0;
    for (let i = 0; i < subcategories.length; i++) cardAnims.push(new Animated.Value(0));
    setTimeout(() => {
      Animated.stagger(70, cardAnims.map(a =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 85, friction: 11 })
      )).start();
    }, 50);
  }, [loading, subcategories.length]);

  // ── Colors ───────────────────────────────────────────────────────────────
  const color    = catData?.color ?? C.green;
  const bg       = isDark ? C.bgDark : C.bg;
  const cardBg   = isDark ? C.cardDark : C.cardBg;
  const textMain = isDark ? C.txtDark  : C.txt;
  const textSub  = isDark ? C.subDark  : C.sub;
  const hdrBdr   = isDark ? C.bdr      : C.border;

  // ── "Not found" guard ────────────────────────────────────────────────────
  if (!loading && !catData) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.green + "18" }]}>
            <ArrowRight size={18} color={C.green} strokeWidth={2.5} style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>
          <View style={styles.centered}>
            <Text style={{ fontSize: 44 }}>❓</Text>
            <Text style={[styles.emptyTitle, { color: textSub }]}>பிரிவு கிடைக்கவில்லை</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: hdrBdr }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: color + "18", borderColor: color + "44" }]}
          >
            <ArrowRight size={18} color={color} strokeWidth={2.5} style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>
          <View style={styles.hdrCenter}>
            {catData ? (
              <View style={[styles.hdrIconBox, { backgroundColor: color + "22" }]}>
                <Text style={styles.hdrEmoji}>{catData.icon}</Text>
              </View>
            ) : (
              <ActivityIndicator size="small" color={color} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.hdrTitle, { color: textMain }]} numberOfLines={1}>
                {catData?.name ?? ""}
              </Text>
              {catData && (catData as FBCategory).nameEn ? (
                <Text style={[styles.hdrEn, { color: textSub }]} numberOfLines={1}>
                  {(catData as FBCategory).nameEn}
                </Text>
              ) : null}
            </View>
          </View>
          {!loading && (
            <View style={[styles.hdrBadge, { backgroundColor: color + "18", borderColor: color + "44" }]}>
              <Text style={[styles.hdrBadgeTxt, { color }]}>{subcategories.length}</Text>
            </View>
          )}
        </View>

        {/* ── Stats row ── */}
        {!loading && catData && (
          <View style={[styles.statsRow, { backgroundColor: color + "12", borderBottomColor: color + "22" }]}>
            <View style={styles.statItem}>
              <Layers size={13} color={color} strokeWidth={2} />
              <Text style={[styles.statTxt, { color }]}>
                {subcategories.length} உப-பிரிவுகள்
              </Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: color + "44" }]} />
            <View style={styles.statItem}>
              <Headphones size={13} color={color} strokeWidth={2} />
              <Text style={[styles.statTxt, { color }]}>
                {catCards.length} பாடங்கள்
              </Text>
            </View>
          </View>
        )}

        {/* ── Body ── */}
        {loading ? (
          <ScrollView contentContainerStyle={styles.gridWrap}>
            <View style={styles.grid}>
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} isDark={isDark} color={color} />)}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >

            {subcategories.length === 0 ? (
              <EmptySubcategories color={color} isDark={isDark} />
            ) : (
              <>
                {/* Section heading */}
                <View style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: color }]} />
                  <Text style={[styles.sectionTitle, { color: textMain }]}>
                    உப-பிரிவுகள்
                  </Text>
                  <Text style={[styles.sectionCount, { color: textSub }]}>
                    {subcategories.length}
                  </Text>
                </View>

                {/* Subcategory grid */}
                <View style={styles.grid}>
                  {subcategories.map((sub, i) => (
                    <SubCard
                      key={sub.id}
                      sub={sub}
                      color={color}
                      cardCount={cardCounts[sub.id] ?? 0}
                      isDark={isDark}
                      anim={cardAnims[i] ?? new Animated.Value(1)}
                      onPress={() => router.push(`/subcategory/${sub.id}` as any)}
                    />
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 140 }} />
          </ScrollView>
        )}

        <AudioPlayer />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  hdrCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  hdrIconBox: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  hdrEmoji: { fontSize: 20 },
  hdrTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  hdrEn: { fontSize: 11, marginTop: 1 },
  hdrBadge: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  hdrBadgeTxt: { fontSize: 13, fontWeight: "800" },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  statTxt: { fontSize: 12, fontWeight: "700" },
  statDiv: { width: 1, height: 20 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  gridWrap: { paddingHorizontal: 16, paddingTop: 18 },

  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionDot: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  sectionCount: { fontSize: 13, fontWeight: "600" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP, marginBottom: 16 },

  subCard: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
    paddingBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardAccent: { height: 4, width: "100%", marginBottom: 14 },
  cardIconBox: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 12,
  },
  cardTamil: {
    fontSize: 14, fontWeight: "800", textAlign: "center",
    paddingHorizontal: 10, lineHeight: 20, marginBottom: 2,
  },
  cardEnglish: {
    fontSize: 11, fontWeight: "500", textAlign: "center",
    paddingHorizontal: 10, lineHeight: 16, marginBottom: 8,
  },
  cardBottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 10, marginTop: 4,
  },
  countPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  countTxt: { fontSize: 10, fontWeight: "700" },
  arrowCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  skelIcon:  { width: 50, height: 50, borderRadius: 25, alignSelf: "center", marginBottom: 12, marginTop: 18 },
  skelLine1: { height: 12, borderRadius: 6, marginHorizontal: 16, marginBottom: 8 },
  skelLine2: { height: 10, borderRadius: 5, marginHorizontal: 24, marginBottom: 12 },

  emptyBox: {
    alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 14,
  },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyHint:  { fontSize: 12, textAlign: "center", lineHeight: 18 },

  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
});
