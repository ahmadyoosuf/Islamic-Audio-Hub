import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import {
  getQuizzesByTrack,
  type UnifiedQuiz,
} from "@/data/unifiedStorage";
import {
  getQuizProgress,
  saveLevelResult,
  type LevelId,
  type LevelResult,
  type TrackQuizProgress,
} from "@/data/quizProgress";

const VOICE_MODE_KEY = "quiz_voice_mode_v1";

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "select" | "playing" | "result";

interface LevelCfg {
  id: LevelId;
  label: string;
  labelTa: string;
  icon: string;
  color: string;
  qStart: number;
  qEnd: number;
}

const LEVEL_CFG: LevelCfg[] = [
  { id: 1, label: "Level 1", labelTa: "ஆரம்ப நிலை",  icon: "leaf-outline",   color: "#22c55e", qStart: 0,  qEnd: 5  },
  { id: 2, label: "Level 2", labelTa: "இடை நிலை",    icon: "flash-outline",  color: "#f59e0b", qStart: 5,  qEnd: 15 },
  { id: 3, label: "Level 3", labelTa: "உயர் நிலை",   icon: "trophy-outline", color: "#ef4444", qStart: 15, qEnd: 30 },
];

const OPTION_LABELS = ["A", "B", "C", "D"];

// ─── Props ──────────────────────────────────────────────────────────────────

interface QuizModalProps {
  visible: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
  categoryId?: string;
  prizeEnabled?: boolean;
}

// ─── Audio helpers ───────────────────────────────────────────────────────────

function playTone(freq: number, dur: number, type: OscillatorType = "sine") {
  if (typeof window === "undefined") return;
  try {
    const AC = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

async function playSoundFor(kind: "correct" | "wrong" | "complete") {
  if (Platform.OS === "web") {
    if (kind === "correct") {
      playTone(660, 0.13);
      setTimeout(() => playTone(880, 0.18), 110);
    } else if (kind === "wrong") {
      playTone(180, 0.3, "square");
    } else {
      playTone(440, 0.13);
      setTimeout(() => playTone(550, 0.13), 120);
      setTimeout(() => playTone(660, 0.28), 240);
    }
  } else {
    try {
      await Haptics.notificationAsync(
        kind === "wrong"
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success,
      );
    } catch {}
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function starsFor(score: number, total: number): number {
  if (!total) return 0;
  const p = score / total;
  return p >= 0.85 ? 3 : p >= 0.6 ? 2 : p > 0 ? 1 : 0;
}

// ─── StarRow ─────────────────────────────────────────────────────────────────

function StarRow({ score, total }: { score: number; total: number }) {
  const s = starsFor(score, total);
  return (
    <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginVertical: 10 }}>
      {[1, 2, 3].map((n) => (
        <Ionicons key={n} name={n <= s ? "star" : "star-outline"} size={34} color={n <= s ? "#f0bc42" : "#444"} />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuizModal({
  visible,
  onClose,
  trackId,
  trackTitle,
}: QuizModalProps) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useApp();

  const bg     = isDarkMode ? "#0a0a0a" : "#f5f5f5";
  const card   = isDarkMode ? "#1a1a1a" : "#ffffff";
  const txt    = isDarkMode ? "#f0f0f0" : "#111111";
  const sub    = isDarkMode ? "#888888" : "#666666";
  const border = isDarkMode ? "#2a2a2a" : "#e5e5e5";

  // ── Data ─────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<UnifiedQuiz[]>([]);
  const [progress,  setProgress]  = useState<TrackQuizProgress>({});

  // ── Phase state ──────────────────────────────────────────────────────────
  const [phase,       setPhase]       = useState<Phase>("select");
  const [activeLevel, setActiveLevel] = useState<LevelId>(1);
  const [levelQs,     setLevelQs]     = useState<UnifiedQuiz[]>([]);
  const [qIdx,        setQIdx]        = useState(0);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [answered,    setAnswered]    = useState(false);
  const [score,       setScore]       = useState(0);
  const [streak,      setStreak]      = useState(0);
  // Ref mirrors score to avoid stale-closure bug when finishLevel is called from a timeout
  const scoreRef = useRef(0);

  // ── Voice / TTS ───────────────────────────────────────────────────────────
  const [voiceMode,  setVoiceMode]  = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceModeRef = useRef(true);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Load voice mode from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(VOICE_MODE_KEY).then((val) => {
      const on = val !== "off";
      setVoiceMode(on);
      voiceModeRef.current = on;
    });
  }, []);

  function stopSpeech() {
    try { Speech.stop(); } catch {}
    setIsSpeaking(false);
  }

  async function toggleVoiceMode() {
    const next = !voiceModeRef.current;
    voiceModeRef.current = next;
    setVoiceMode(next);
    await AsyncStorage.setItem(VOICE_MODE_KEY, next ? "on" : "off");
    if (!next) stopSpeech();
  }

  function speakOptionsChain(quiz: UnifiedQuiz, idx: number) {
    if (!voiceModeRef.current || idx >= quiz.options.length) {
      setIsSpeaking(false);
      return;
    }
    const label = OPTION_LABELS[idx] ?? String(idx + 1);
    try {
      Speech.speak(`${label}. ${quiz.options[idx]}`, {
        language: "ta-IN",
        onDone:  () => speakOptionsChain(quiz, idx + 1),
        onError: () => setIsSpeaking(false),
      });
    } catch { setIsSpeaking(false); }
  }

  function speakQuestion(quiz: UnifiedQuiz) {
    if (!voiceModeRef.current) return;
    stopSpeech();
    setIsSpeaking(true);
    try {
      Speech.speak(quiz.question, {
        language: "ta-IN",
        onDone:  () => speakOptionsChain(quiz, 0),
        onError: () => setIsSpeaking(false),
      });
    } catch { setIsSpeaking(false); }
  }

  // ── Animations ───────────────────────────────────────────────────────────
  const fadeQ     = useRef(new Animated.Value(0)).current;
  const slideQ    = useRef(new Animated.Value(28)).current;
  const scaleOpts = useRef(new Animated.Value(0.94)).current;

  const animateIn = useCallback(() => {
    fadeQ.setValue(0);
    slideQ.setValue(28);
    scaleOpts.setValue(0.93);
    Animated.parallel([
      Animated.timing(fadeQ,     { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideQ,    { toValue: 0, useNativeDriver: true, tension: 90, friction: 9 }),
      Animated.spring(scaleOpts, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
    ]).start();
  }, [fadeQ, slideQ, scaleOpts]);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !trackId) return;
    setPhase("select");
    setScore(0);
    setStreak(0);
    stopSpeech();
    Promise.all([getQuizzesByTrack(trackId), getQuizProgress(trackId)]).then(
      ([qs, prog]) => {
        setQuestions(qs);
        setProgress(prog);
      },
    );
  }, [visible, trackId]);

  // Stop speech when leaving playing phase
  useEffect(() => {
    if (phase !== "playing") stopSpeech();
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => { return () => stopSpeech(); }, []);

  useEffect(() => {
    if (phase === "playing") animateIn();
  }, [phase, qIdx, animateIn]);

  // Auto-speak question when it becomes active (with short delay for animation)
  useEffect(() => {
    if (phase !== "playing" || levelQs.length === 0) return;
    const q = levelQs[qIdx];
    if (!q) return;
    const timer = setTimeout(() => {
      if (voiceModeRef.current) speakQuestion(q);
    }, 350);
    return () => { clearTimeout(timer); stopSpeech(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, phase]);

  // ── Level helpers ────────────────────────────────────────────────────────
  const levelQCount = (cfg: LevelCfg) =>
    Math.max(0, Math.min(cfg.qEnd, questions.length) - cfg.qStart);

  const isLevelAvailable = (cfg: LevelCfg) => levelQCount(cfg) > 0;

  const isLevelUnlocked = (id: LevelId): boolean => {
    if (id === 1) return true;
    if (id === 2) return !!progress.level1?.completed;
    if (id === 3) return !!progress.level2?.completed;
    return false;
  };

  const getLevelResult = (id: LevelId): LevelResult | undefined =>
    (progress as any)[`level${id}`];

  // ── Actions ──────────────────────────────────────────────────────────────
  function startLevel(cfg: LevelCfg) {
    const qs = shuffle(questions.slice(cfg.qStart, Math.min(cfg.qEnd, questions.length)));
    setActiveLevel(cfg.id);
    setLevelQs(qs);
    setQIdx(0);
    setSelected(null);
    setAnswered(false);
    scoreRef.current = 0;
    setScore(0);
    setStreak(0);
    setPhase("playing");
  }

  function handleSelect(optIdx: number) {
    if (answered) return;
    stopSpeech();
    setSelected(optIdx);
    setAnswered(true);
    const correct = levelQs[qIdx].correctIndex === optIdx;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setStreak((s) => s + 1);
      playSoundFor("correct");
    } else {
      setStreak(0);
      playSoundFor("wrong");
    }
    setTimeout(() => advanceQ(), 1500);
  }

  async function advanceQ() {
    const next = qIdx + 1;
    if (next >= levelQs.length) {
      await finishLevel();
    } else {
      setQIdx(next);
      setSelected(null);
      setAnswered(false);
    }
  }

  async function finishLevel() {
    const finalScore = scoreRef.current;
    const result: LevelResult = {
      completed: true,
      score: finalScore,
      total: levelQs.length,
      completedAt: Date.now(),
    };
    await saveLevelResult(trackId, activeLevel, result);
    const fresh = await getQuizProgress(trackId);
    setProgress(fresh);
    playSoundFor("complete");
    setPhase("result");
  }

  function restartLevel() {
    const cfg = LEVEL_CFG.find((l) => l.id === activeLevel)!;
    startLevel(cfg);
  }

  function goNextLevel() {
    const nextId = (activeLevel + 1) as LevelId;
    const next   = LEVEL_CFG.find((l) => l.id === nextId);
    if (next && isLevelAvailable(next)) startLevel(next);
  }

  function handleClose() {
    stopSpeech();
    setPhase("select");
    onClose();
  }

  // ── Current question ─────────────────────────────────────────────────────
  const q         = phase === "playing" ? levelQs[qIdx] : null;
  const activeCfg = LEVEL_CFG.find((l) => l.id === activeLevel)!;
  const nextCfg   = LEVEL_CFG.find((l) => l.id === ((activeLevel + 1) as LevelId));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View
        style={[
          s.root,
          { backgroundColor: bg, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* ━━━ LEVEL SELECT ━━━ */}
        {phase === "select" && (
          <ScrollView
            contentContainerStyle={s.selScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Header row */}
            <View style={s.selHeader}>
              <Pressable onPress={handleClose} style={s.iconBtn} hitSlop={12}>
                <Ionicons name="close" size={24} color={txt} />
              </Pressable>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[s.selTitle, { color: txt }]}>Quiz</Text>
                <Text style={[s.selSub, { color: sub }]} numberOfLines={1}>
                  {trackTitle}
                </Text>
              </View>
              <Pressable
                onPress={toggleVoiceMode}
                style={[s.iconBtn, { backgroundColor: voiceMode ? "#1a7a4a22" : "transparent" }]}
                hitSlop={12}
              >
                <Ionicons
                  name={voiceMode ? "volume-high-outline" : "volume-mute-outline"}
                  size={22}
                  color={voiceMode ? "#1a7a4a" : sub}
                />
              </Pressable>
            </View>

            {/* Question count pill */}
            <View style={[s.trackBadge, { backgroundColor: card, borderColor: border }]}>
              <View style={[s.trackBadgeIcon, { backgroundColor: "#1a7a4a22" }]}>
                <Ionicons name="help-circle" size={28} color="#1a7a4a" />
              </View>
              <View>
                <Text style={[s.trackBadgeNum, { color: txt }]}>{questions.length}</Text>
                <Text style={[s.trackBadgeLbl, { color: sub }]}>கேள்விகள் உள்ளன</Text>
              </View>
            </View>

            <Text style={[s.sectionLbl, { color: sub }]}>நிலையை தேர்வு செய்யுங்கள்</Text>

            {/* Level cards */}
            {LEVEL_CFG.map((cfg) => {
              const available = isLevelAvailable(cfg);
              const unlocked  = isLevelUnlocked(cfg.id);
              const result    = getLevelResult(cfg.id);
              const locked    = !available || !unlocked;
              const count     = levelQCount(cfg);

              return (
                <Pressable
                  key={cfg.id}
                  style={({ pressed }) => [
                    s.levelCard,
                    {
                      backgroundColor: card,
                      borderColor: locked ? border : cfg.color + "55",
                      opacity: locked ? 0.5 : pressed ? 0.82 : 1,
                    },
                  ]}
                  onPress={() => !locked && startLevel(cfg)}
                  disabled={locked}
                >
                  {/* Left accent stripe */}
                  <View style={[s.levelStripe, { backgroundColor: cfg.color }]} />

                  {/* Icon bubble */}
                  <View style={[s.levelIconBubble, { backgroundColor: cfg.color + "22" }]}>
                    <Ionicons
                      name={(locked ? "lock-closed-outline" : cfg.icon) as any}
                      size={24}
                      color={locked ? sub : cfg.color}
                    />
                  </View>

                  {/* Text area */}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.levelCardTitle, { color: txt }]}>{cfg.label}</Text>
                    <Text style={[s.levelCardSub, { color: sub }]}>
                      {cfg.labelTa}
                      {available ? `  ·  ${count} கேள்விகள்` : "  ·  கேள்விகள் இல்லை"}
                    </Text>
                    {result && (
                      <View style={s.levelResultRow}>
                        {[1, 2, 3].map((n) => (
                          <Ionicons
                            key={n}
                            name={n <= starsFor(result.score, result.total) ? "star" : "star-outline"}
                            size={13}
                            color={n <= starsFor(result.score, result.total) ? "#f0bc42" : "#888"}
                          />
                        ))}
                        <Text style={[s.levelResultScore, { color: sub }]}>
                          {result.score}/{result.total}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!locked && (
                    <Ionicons name="chevron-forward" size={20} color={sub} />
                  )}
                </Pressable>
              );
            })}

            {/* Info hint */}
            <View style={[s.hintBox, { backgroundColor: "#1a7a4a18", borderColor: "#1a7a4a44" }]}>
              <Ionicons name="information-circle-outline" size={16} color="#1a7a4a" />
              <Text style={[s.hintText, { color: "#1a7a4a" }]}>
                Level 1 முடித்தால் Level 2 திறக்கும். Level 2 முடித்தால் Level 3 திறக்கும்.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* ━━━ PLAYING ━━━ */}
        {phase === "playing" && q && (
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={[s.playHeader, { borderBottomColor: border }]}>
              <Pressable onPress={handleClose} style={s.iconBtn} hitSlop={12}>
                <Ionicons name="close" size={22} color={txt} />
              </Pressable>
              <View style={s.playHeaderMid}>
                <View style={[s.levelPill, { backgroundColor: activeCfg.color + "22" }]}>
                  <Ionicons name={activeCfg.icon as any} size={13} color={activeCfg.color} />
                  <Text style={[s.levelPillTxt, { color: activeCfg.color }]}>
                    {activeCfg.label}
                  </Text>
                </View>
                {streak >= 3 && (
                  <View style={[s.streakPill, { marginTop: 4 }]}>
                    <Text style={s.streakTxt}>🔥 {streak}</Text>
                  </View>
                )}
              </View>
              {/* Voice toggle */}
              <Pressable
                onPress={toggleVoiceMode}
                style={[s.iconBtn, { backgroundColor: voiceMode ? activeCfg.color + "22" : "transparent" }]}
                hitSlop={12}
              >
                <Ionicons
                  name={voiceMode ? "volume-high-outline" : "volume-mute-outline"}
                  size={20}
                  color={voiceMode ? activeCfg.color : sub}
                />
              </Pressable>
            </View>

            {/* Progress bar */}
            <View style={[s.progressTrack, { backgroundColor: border }]}>
              <View
                style={[
                  s.progressFill,
                  {
                    backgroundColor: activeCfg.color,
                    width: `${(qIdx / levelQs.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={[s.progressRow, { paddingHorizontal: 18 }]}>
              <Text style={[s.progressTxt, { color: sub }]}>
                கேள்வி {qIdx + 1} / {levelQs.length}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={[s.progressTxt, { color: "#22c55e" }]}>✅ {score}</Text>
                {/* Listen Again button */}
                {voiceMode && (
                  <Pressable
                    onPress={() => q && speakQuestion(q)}
                    style={[s.listenBtn, { borderColor: activeCfg.color + "66", backgroundColor: activeCfg.color + "18" }]}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={isSpeaking ? "pause-circle-outline" : "volume-medium-outline"}
                      size={14}
                      color={activeCfg.color}
                    />
                    <Text style={[s.listenBtnTxt, { color: activeCfg.color }]}>
                      {isSpeaking ? "படிக்கிறது..." : "மீண்டும் கேள்"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView
              contentContainerStyle={s.playScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Question card */}
              <Animated.View
                style={[
                  s.questionCard,
                  {
                    backgroundColor: card,
                    borderColor: border,
                    opacity: fadeQ,
                    transform: [{ translateY: slideQ }],
                  },
                ]}
              >
                <View
                  style={[s.qNumPill, { backgroundColor: activeCfg.color + "30" }]}
                >
                  <Text style={[s.qNumTxt, { color: activeCfg.color }]}>
                    Q{qIdx + 1}
                  </Text>
                </View>
                <Text style={[s.questionTxt, { color: txt }]}>{q.question}</Text>
              </Animated.View>

              {/* Options */}
              <Animated.View style={{ transform: [{ scale: scaleOpts }] }}>
                {q.options.map((opt, i) => {
                  const isSel  = selected === i;
                  const isCorr = q.correctIndex === i;

                  let optBg     = card;
                  let optBorder = border;
                  let optTxtCol = txt;

                  if (answered) {
                    if (isCorr) {
                      optBg = "#4ade8030";
                      optBorder = "#4ade80";
                      optTxtCol = isDarkMode ? "#4ade80" : "#166534";
                    } else if (isSel) {
                      optBg = "#f8717150";
                      optBorder = "#ef4444";
                      optTxtCol = isDarkMode ? "#f87171" : "#7f1d1d";
                    }
                  }

                  const labelBg = answered && isCorr
                    ? "#4ade80"
                    : answered && isSel && !isCorr
                    ? "#ef4444"
                    : isDarkMode ? "#2a2a2a" : "#f0f0f0";

                  return (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [
                        s.optBtn,
                        {
                          backgroundColor: optBg,
                          borderColor: optBorder,
                          opacity:
                            answered && !isSel && !isCorr ? 0.45 : pressed ? 0.78 : 1,
                        },
                      ]}
                      onPress={() => handleSelect(i)}
                      disabled={answered}
                    >
                      <View style={[s.optLabelBox, { backgroundColor: labelBg }]}>
                        <Text
                          style={[
                            s.optLabelTxt,
                            {
                              color:
                                answered && (isCorr || (isSel && !isCorr))
                                  ? "#fff"
                                  : sub,
                            },
                          ]}
                        >
                          {OPTION_LABELS[i] ?? String(i + 1)}
                        </Text>
                      </View>
                      <Text style={[s.optTxt, { color: optTxtCol, flex: 1 }]}>
                        {opt}
                      </Text>
                      {answered && isCorr && (
                        <Ionicons name="checkmark-circle" size={22} color="#4ade80" />
                      )}
                      {answered && isSel && !isCorr && (
                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                      )}
                    </Pressable>
                  );
                })}
              </Animated.View>
            </ScrollView>
          </View>
        )}

        {/* ━━━ RESULT ━━━ */}
        {phase === "result" && (
          <ScrollView
            contentContainerStyle={s.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Close button */}
            <Pressable
              onPress={handleClose}
              style={[s.iconBtn, { alignSelf: "flex-end", margin: 16 }]}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color={txt} />
            </Pressable>

            {/* Trophy */}
            <View
              style={[s.resultTrophyWrap, { backgroundColor: activeCfg.color + "22" }]}
            >
              <Ionicons
                name={score / levelQs.length >= 0.6 ? "trophy" : "refresh-circle-outline"}
                size={54}
                color={activeCfg.color}
              />
            </View>

            <Text style={[s.resultHeading, { color: txt }]}>
              {score / levelQs.length >= 0.85
                ? "மிகச் சிறப்பு! 🌟"
                : score / levelQs.length >= 0.6
                ? "நல்லது! 👍"
                : "மேலும் படியுங்கள் 📖"}
            </Text>

            <StarRow score={score} total={levelQs.length} />

            {/* Score stats */}
            <View style={[s.scoreBox, { backgroundColor: card, borderColor: border }]}>
              <View style={s.scoreCell}>
                <Text style={[s.scoreBigNum, { color: activeCfg.color }]}>{score}</Text>
                <Text style={[s.scoreCellLbl, { color: sub }]}>சரியான விடை</Text>
              </View>
              <View style={[s.scoreDivider, { backgroundColor: border }]} />
              <View style={s.scoreCell}>
                <Text style={[s.scoreBigNum, { color: txt }]}>{levelQs.length}</Text>
                <Text style={[s.scoreCellLbl, { color: sub }]}>மொத்தம்</Text>
              </View>
              <View style={[s.scoreDivider, { backgroundColor: border }]} />
              <View style={s.scoreCell}>
                <Text style={[s.scoreBigNum, { color: "#f87171" }]}>
                  {levelQs.length - score}
                </Text>
                <Text style={[s.scoreCellLbl, { color: sub }]}>தவறான விடை</Text>
              </View>
            </View>

            {/* Level tag */}
            <View
              style={[
                s.levelPill,
                { backgroundColor: activeCfg.color + "22", alignSelf: "center", marginTop: 10 },
              ]}
            >
              <Ionicons name={activeCfg.icon as any} size={13} color={activeCfg.color} />
              <Text style={[s.levelPillTxt, { color: activeCfg.color }]}>
                {activeCfg.label} முடிந்தது
              </Text>
            </View>

            {/* Action buttons */}
            <View style={s.resultBtnRow}>
              <Pressable
                style={({ pressed }) => [
                  s.actionBtn,
                  s.actionBtnOutline,
                  { borderColor: border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={restartLevel}
              >
                <Ionicons name="refresh" size={18} color={txt} />
                <Text style={[s.actionBtnTxt, { color: txt }]}>மீண்டும்</Text>
              </Pressable>

              {nextCfg && isLevelAvailable(nextCfg) && (
                <Pressable
                  style={({ pressed }) => [
                    s.actionBtn,
                    s.actionBtnPrimary,
                    { opacity: pressed ? 0.82 : 1 },
                  ]}
                  onPress={goNextLevel}
                >
                  <Text style={[s.actionBtnTxt, { color: "#fff" }]}>
                    {nextCfg.label}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [s.backToSelectBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setPhase("select")}
            >
              <Ionicons name="list-outline" size={16} color={sub} />
              <Text style={[s.backToSelectTxt, { color: sub }]}>
                நிலை தேர்வுக்கு திரும்பு
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Select ─────────────────────────────
  selScroll:      { paddingHorizontal: 20, paddingBottom: 48 },
  selHeader:      { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  iconBtn:        { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  selTitle:       { fontSize: 22, fontWeight: "700" },
  selSub:         { fontSize: 13, marginTop: 2 },

  trackBadge:     { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  trackBadgeIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  trackBadgeNum:  { fontSize: 20, fontWeight: "800" },
  trackBadgeLbl:  { fontSize: 12, marginTop: 1 },

  sectionLbl:     { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },

  levelCard:      { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 14, overflow: "hidden", paddingVertical: 16, paddingRight: 16, paddingLeft: 12 },
  levelStripe:    { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  levelIconBubble: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  levelCardTitle: { fontSize: 16, fontWeight: "700" },
  levelCardSub:   { fontSize: 12, marginTop: 2 },
  levelResultRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  levelResultScore: { fontSize: 12, marginLeft: 4 },

  hintBox:        { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 6 },
  hintText:       { fontSize: 12, lineHeight: 18, flex: 1 },

  // ── Playing ────────────────────────────
  playHeader:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  playHeaderMid:  { flex: 1, alignItems: "center" },

  levelPill:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  levelPillTxt:   { fontSize: 13, fontWeight: "700" },

  streakPill:     { backgroundColor: "#ff6b3533", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  streakTxt:      { fontSize: 13, fontWeight: "700" },

  listenBtn:      { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  listenBtnTxt:   { fontSize: 11, fontWeight: "600" },

  progressTrack:  { height: 4 },
  progressFill:   { height: 4, borderRadius: 2 },
  progressRow:    { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 4 },
  progressTxt:    { fontSize: 12 },

  playScroll:     { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },

  questionCard:   { borderRadius: 18, borderWidth: 1.5, padding: 20, marginBottom: 20 },
  qNumPill:       { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 12 },
  qNumTxt:        { fontSize: 12, fontWeight: "700" },
  questionTxt:    { fontSize: 18, fontWeight: "600", lineHeight: 28 },

  optBtn:         { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, marginBottom: 12, padding: 14 },
  optLabelBox:    { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  optLabelTxt:    { fontSize: 13, fontWeight: "700" },
  optTxt:         { fontSize: 15, fontWeight: "500", lineHeight: 22 },

  // ── Result ─────────────────────────────
  resultScroll:   { paddingHorizontal: 24, paddingBottom: 52, alignItems: "center" },
  resultTrophyWrap: { width: 100, height: 100, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 18 },
  resultHeading:  { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 4 },

  scoreBox:       { flexDirection: "row", borderRadius: 18, borderWidth: 1, padding: 20, width: "100%", marginTop: 14, marginBottom: 14 },
  scoreCell:      { flex: 1, alignItems: "center" },
  scoreBigNum:    { fontSize: 34, fontWeight: "800" },
  scoreCellLbl:   { fontSize: 11, marginTop: 4, textAlign: "center" },
  scoreDivider:   { width: 1 },

  resultBtnRow:   { flexDirection: "row", gap: 12, marginTop: 18, width: "100%" },
  actionBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnOutline: { borderWidth: 1.5 },
  actionBtnPrimary: { backgroundColor: "#1a7a4a" },
  actionBtnTxt:   { fontSize: 15, fontWeight: "700" },

  backToSelectBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, padding: 12 },
  backToSelectTxt: { fontSize: 14 },
});
