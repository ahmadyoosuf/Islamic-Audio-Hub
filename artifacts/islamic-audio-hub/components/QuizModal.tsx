import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUIZ_QUESTIONS } from "@/data/categories";
import { useColors } from "@/hooks/useColors";

interface QuizModalProps {
  visible: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
  prizeEnabled?: boolean;
}

const PER_Q_SECS = 12;
const GLOBAL_SECS = 60;

const PRIZE_GROUPS = {
  MEN: ["Casual Items", "Accessories", "Gadgets", "Premium Gifts"],
  WOMEN: ["Beauty Items", "Accessories", "Personal Care", "Premium Gifts"],
  KIDS: ["Toys", "Creative Kits", "Chocolates & Treats", "Premium Gifts"],
};

function generateToken(group: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${group.slice(0, 3).toUpperCase()}-${code}`;
}

function StarRating({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? score / total : 0;
  const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : pct > 0 ? 1 : 0;
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {[1, 2, 3].map((s) => (
        <Ionicons
          key={s}
          name={s <= stars ? "star" : "star-outline"}
          size={32}
          color={s <= stars ? "#f0bc42" : "#444"}
        />
      ))}
    </View>
  );
}

export default function QuizModal({
  visible,
  onClose,
  trackId,
  trackTitle,
  prizeEnabled = false,
}: QuizModalProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const questions = QUIZ_QUESTIONS[trackId] ?? [];

  type Phase = "prize-select" | "playing" | "result" | "winner";
  const [phase, setPhase] = useState<Phase>(prizeEnabled ? "prize-select" : "playing");
  const [selectedGroup, setSelectedGroup] = useState<"MEN" | "WOMEN" | "KIDS">("MEN");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [perQTimer, setPerQTimer] = useState(PER_Q_SECS);
  const [globalTimer, setGlobalTimer] = useState(GLOBAL_SECS);
  const [token, setToken] = useState("");
  const [totalTime, setTotalTime] = useState(0);

  const perQRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const globalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [pointsText, setPointsText] = useState("+1");

  const stopTimers = useCallback(() => {
    if (perQRef.current) clearInterval(perQRef.current);
    if (globalRef.current) clearInterval(globalRef.current);
  }, []);

  const startTimers = useCallback(() => {
    stopTimers();
    setPerQTimer(PER_Q_SECS);
    perQRef.current = setInterval(() => {
      setPerQTimer((t) => {
        if (t <= 1) {
          clearInterval(perQRef.current!);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    globalRef.current = setInterval(() => {
      setGlobalTimer((t) => {
        if (t <= 1) {
          clearInterval(globalRef.current!);
          finishQuiz();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (visible && phase === "playing" && questions.length > 0) {
      startTimers();
    }
    return () => stopTimers();
  }, [visible, phase]);

  const handleReset = () => {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setStreak(0);
    setPerQTimer(PER_Q_SECS);
    setGlobalTimer(GLOBAL_SECS);
    setTotalTime(0);
    setPhase(prizeEnabled ? "prize-select" : "playing");
  };

  const handleClose = () => {
    stopTimers();
    handleReset();
    onClose();
  };

  const showPointsPopup = (pts: number) => {
    setPointsText(`+${pts}`);
    pointsAnim.setValue(0);
    pointsOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(pointsAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pointsOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const finishQuiz = useCallback(() => {
    stopTimers();
    const elapsed = GLOBAL_SECS - globalTimer;
    setTotalTime(elapsed);
    if (prizeEnabled) {
      setToken(generateToken(selectedGroup));
      setPhase("winner");
    } else {
      setPhase("result");
    }
  }, [globalTimer, prizeEnabled, selectedGroup, stopTimers]);

  const handleTimeUp = useCallback(() => {
    if (answered) return;
    setAnswered(true);
    setStreak(0);
    setTimeout(() => advanceQuestion(), 1500);
  }, [answered]);

  const advanceQuestion = useCallback(() => {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      finishQuiz();
    } else {
      setCurrent(nextIdx);
      setSelected(null);
      setAnswered(false);
      setPerQTimer(PER_Q_SECS);
      if (perQRef.current) clearInterval(perQRef.current);
      perQRef.current = setInterval(() => {
        setPerQTimer((t) => {
          if (t <= 1) {
            clearInterval(perQRef.current!);
            handleTimeUp();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  }, [current, questions.length, finishQuiz, handleTimeUp]);

  const handleSelect = async (idx: number) => {
    if (answered) return;
    stopTimers();
    setSelected(idx);
    setAnswered(true);
    const isCorrect = questions[current]?.correctIndex === idx;
    if (isCorrect) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newStreak = streak + 1;
      setStreak(newStreak);
      const pts = newStreak >= 3 ? 2 : 1;
      setScore((s) => s + pts);
      showPointsPopup(pts);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
      triggerShake();
    }
    setTimeout(() => advanceQuestion(), 1500);
  };

  const OPTION_LABELS = ["அ", "ஆ", "இ"];
  const q = questions[current];
  const globalPct = (globalTimer / GLOBAL_SECS) * 100;
  const perQPct = (perQTimer / PER_Q_SECS) * 100;

  const scorePct = questions.length > 0 ? (score / questions.length) * 100 : 0;

  const pointsY = pointsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });

  if (!q && phase === "playing") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: "#0a0a0a", paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#888" />
          </Pressable>
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color="#888" />
            <Text style={{ color: "#888", fontSize: 16, textAlign: "center" }}>
              இந்த பாடத்திற்கு கேள்வி-பதில் இல்லை
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: "#0a0a0a", paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />

        {phase === "prize-select" && (
          <ScrollView contentContainerStyle={[styles.phaseContent, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
            <Pressable onPress={handleClose} style={styles.closeBtnAbs}>
              <View style={styles.closeBtnCircle}>
                <Ionicons name="close" size={20} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.prizeTitle}>பரிசு வகையை தேர்ந்தெடு</Text>
            <Text style={styles.prizeSubtitle}>{trackTitle}</Text>
            <View style={styles.groupRow}>
              {(["MEN", "WOMEN", "KIDS"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setSelectedGroup(g)}
                  style={[
                    styles.groupBtn,
                    { borderColor: selectedGroup === g ? "#f0bc42" : "#333", backgroundColor: selectedGroup === g ? "#f0bc4222" : "#141414" },
                  ]}
                >
                  <Ionicons
                    name={g === "MEN" ? "man" : g === "WOMEN" ? "woman" : "happy"}
                    size={28}
                    color={selectedGroup === g ? "#f0bc42" : "#888"}
                  />
                  <Text style={[styles.groupBtnText, { color: selectedGroup === g ? "#f0bc42" : "#888" }]}>
                    {g === "MEN" ? "ஆண்" : g === "WOMEN" ? "பெண்" : "குழந்தைகள்"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.catLabel}>பரிசு வகை தேர்வு</Text>
            <View style={styles.catGrid}>
              {PRIZE_GROUPS[selectedGroup].map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
                  style={[
                    styles.catChip,
                    { borderColor: selectedCategory === cat ? "#f0bc42" : "#333", backgroundColor: selectedCategory === cat ? "#f0bc4222" : "#141414" },
                  ]}
                >
                  <Text style={[styles.catChipText, { color: selectedCategory === cat ? "#f0bc42" : "#aaa" }]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => { setSelectedCategory(selectedCategory || PRIZE_GROUPS[selectedGroup][0]); setPhase("playing"); startTimers(); }}
              style={[styles.startBtn, { backgroundColor: "#f0bc42" }]}
            >
              <Text style={styles.startBtnText}>கேள்வி-பதில் தொடங்கு</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </Pressable>
          </ScrollView>
        )}

        {phase === "playing" && q && (
          <>
            <View style={styles.quizHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizTrackTitle} numberOfLines={1}>{trackTitle}</Text>
                <Text style={styles.quizProgress}>{current + 1} / {questions.length}</Text>
              </View>
              <View style={styles.timersRow}>
                <View style={styles.timerBadge}>
                  <Ionicons name="time" size={12} color="#f0bc42" />
                  <Text style={[styles.timerText, { color: perQTimer <= 3 ? "#ef4444" : "#f0bc42" }]}>
                    {perQTimer}
                  </Text>
                </View>
                <View style={[styles.timerBadge, { backgroundColor: "#141414" }]}>
                  <Ionicons name="hourglass" size={12} color="#60a5fa" />
                  <Text style={[styles.timerText, { color: globalTimer <= 10 ? "#ef4444" : "#60a5fa" }]}>
                    {globalTimer}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleClose} style={styles.xBtn}>
                <View style={styles.xBtnInner}>
                  <Ionicons name="close" size={18} color="#fff" />
                </View>
              </Pressable>
            </View>

            <View style={styles.globalBar}>
              <View style={[styles.globalBarFill, { width: `${globalPct}%`, backgroundColor: globalTimer <= 10 ? "#ef4444" : "#60a5fa" }]} />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Ionicons name="star" size={14} color="#f0bc42" />
                <Text style={styles.statVal}>{score}</Text>
              </View>
              {streak >= 2 && (
                <View style={[styles.statChip, { backgroundColor: "#ff6b2222" }]}>
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={[styles.statVal, { color: "#ff6b22" }]}>{streak}</Text>
                </View>
              )}
            </View>

            <View style={styles.perQBarRow}>
              <View
                style={[
                  styles.perQBar,
                  { backgroundColor: isDark ? "#1a1a1a" : "#2a2a2a" },
                ]}
              >
                <View
                  style={[
                    styles.perQFill,
                    {
                      width: `${perQPct}%`,
                      backgroundColor: perQTimer <= 3 ? "#ef4444" : "#f0bc42",
                    },
                  ]}
                />
              </View>
            </View>

            <Animated.View style={[styles.pointsPopup, { transform: [{ translateY: pointsY }], opacity: pointsOpacity }]}>
              <Text style={styles.pointsText}>{pointsText}</Text>
            </Animated.View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
              <Animated.View
                style={[
                  styles.questionCard,
                  { backgroundColor: "#141420", transform: [{ translateX: shakeAnim }] },
                ]}
              >
                <Text style={styles.questionText}>{q.question}</Text>
              </Animated.View>

              <View style={styles.options}>
                {q.options.map((opt, idx) => {
                  const isCorrect = answered && idx === q.correctIndex;
                  const isWrong = answered && selected === idx && idx !== q.correctIndex;

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelect(idx)}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: isCorrect
                            ? "#1a3a1a"
                            : isWrong
                              ? "#3a1a1a"
                              : "#141414",
                          borderColor: isCorrect
                            ? "#4ade80"
                            : isWrong
                              ? "#ef4444"
                              : "#2a2a2a",
                          borderWidth: isCorrect || isWrong ? 1.5 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.optLabel,
                          {
                            backgroundColor: isCorrect ? "#4ade80" : isWrong ? "#ef4444" : "#252525",
                          },
                        ]}
                      >
                        <Text style={[styles.optLabelText, { color: isCorrect || isWrong ? "#000" : "#aaa" }]}>
                          {OPTION_LABELS[idx]}
                        </Text>
                      </View>
                      <Text style={[styles.optText, { color: isCorrect ? "#4ade80" : isWrong ? "#ef4444" : "#e8e0cc" }]}>
                        {opt}
                      </Text>
                      {isCorrect && <Ionicons name="checkmark-circle" size={20} color="#4ade80" />}
                      {isWrong && <Ionicons name="close-circle" size={20} color="#ef4444" />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {phase === "result" && (
          <View style={styles.phaseContent}>
            <Pressable onPress={handleClose} style={styles.closeBtnAbs}>
              <View style={styles.closeBtnCircle}>
                <Ionicons name="close" size={20} color="#fff" />
              </View>
            </Pressable>
            <View style={styles.resultCard}>
              <Ionicons
                name={scorePct >= 80 ? "trophy" : scorePct >= 50 ? "star" : "ribbon"}
                size={72}
                color="#f0bc42"
              />
              <Text style={styles.resultScore}>{score} / {questions.length}</Text>
              <StarRating score={score} total={questions.length} />
              <Text style={styles.resultMsg}>
                {scorePct >= 80 ? "மிகவும் சிறப்பு! மாஷா அல்லாஹ்!" : scorePct >= 50 ? "நல்ல முயற்சி!" : "மேலும் கற்கலாம்!"}
              </Text>
              <Text style={[styles.resultTime, { color: "#888" }]}>நேரம்: {totalTime} விநாடிகள்</Text>
            </View>
            <View style={styles.resultBtns}>
              <Pressable onPress={handleReset} style={[styles.resultBtn, { borderColor: "#f0bc42", borderWidth: 1, backgroundColor: "#141414" }]}>
                <Ionicons name="refresh" size={16} color="#f0bc42" />
                <Text style={[styles.resultBtnText, { color: "#f0bc42" }]}>மீண்டும்</Text>
              </Pressable>
              <Pressable onPress={handleClose} style={[styles.resultBtn, { backgroundColor: "#f0bc42" }]}>
                <Text style={[styles.resultBtnText, { color: "#000" }]}>முடிந்தது</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === "winner" && (
          <View style={styles.phaseContent}>
            <Pressable onPress={handleClose} style={styles.closeBtnAbs}>
              <View style={styles.closeBtnCircle}>
                <Ionicons name="close" size={20} color="#fff" />
              </View>
            </Pressable>
            <Ionicons name="trophy" size={80} color="#f0bc42" style={{ marginBottom: 16 }} />
            <Text style={styles.winnerTitle}>நீங்கள் வென்றீர்கள்!</Text>
            <Text style={styles.winnerSub}>{score} / {questions.length} சரியான விடைகள்</Text>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>உங்கள் தனி குறியீடு</Text>
              <Text style={styles.tokenText}>{token}</Text>
              <Text style={{ color: "#888", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                இந்த குறியீட்டை சேமித்து வைக்கவும்
              </Text>
            </View>
            <Pressable onPress={handleClose} style={[styles.startBtn, { backgroundColor: "#f0bc42", marginTop: 24 }]}>
              <Text style={styles.startBtnText}>முடிந்தது</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  glowOrb1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#f0bc4212",
    top: -80,
    left: -80,
  },
  glowOrb2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#60a5fa10",
    bottom: 60,
    right: -60,
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginTop: 16,
    marginBottom: 8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnAbs: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef444422",
    borderWidth: 1,
    borderColor: "#ef444466",
    alignItems: "center",
    justifyContent: "center",
  },
  xBtn: {},
  xBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ef444422",
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  quizTrackTitle: {
    color: "#e8e0cc",
    fontSize: 13,
    fontWeight: "700",
  },
  quizProgress: {
    color: "#8a8070",
    fontSize: 11,
    marginTop: 2,
  },
  timersRow: {
    flexDirection: "row",
    gap: 8,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1a1a14",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a20",
  },
  timerText: {
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  globalBar: {
    height: 3,
    backgroundColor: "#1a1a1a",
    marginBottom: 12,
    overflow: "hidden",
  },
  globalBarFill: {
    height: 3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1a1a14",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statVal: {
    color: "#f0bc42",
    fontSize: 14,
    fontWeight: "800",
  },
  perQBarRow: {
    marginBottom: 12,
  },
  perQBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  perQFill: {
    height: 6,
    borderRadius: 3,
  },
  pointsPopup: {
    position: "absolute",
    top: "40%",
    left: "50%",
    zIndex: 99,
  },
  pointsText: {
    color: "#f0bc42",
    fontSize: 28,
    fontWeight: "900",
    textShadowColor: "#f0bc4288",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  quizContent: {
    paddingBottom: 20,
  },
  questionCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#252530",
    marginBottom: 16,
    borderRadius: 4,
  },
  questionText: {
    color: "#e8e0cc",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
  },
  options: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
    borderRadius: 2,
  },
  optLabel: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    flexShrink: 0,
  },
  optLabelText: {
    fontSize: 14,
    fontWeight: "800",
  },
  optText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  phaseContent: {
    flex: 1,
    paddingTop: 16,
  },
  prizeTitle: {
    color: "#f0bc42",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  prizeSubtitle: {
    color: "#8a8070",
    fontSize: 13,
    marginBottom: 20,
  },
  groupRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  groupBtn: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 6,
    borderRadius: 2,
  },
  groupBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  catLabel: {
    color: "#8a8070",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 2,
  },
  startBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  resultCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  resultScore: {
    color: "#f0bc42",
    fontSize: 52,
    fontWeight: "900",
  },
  resultMsg: {
    color: "#e8e0cc",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  resultTime: {
    fontSize: 13,
  },
  resultBtns: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
  },
  resultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
  },
  resultBtnText: {
    fontSize: 15,
    fontWeight: "800",
  },
  winnerTitle: {
    color: "#f0bc42",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  winnerSub: {
    color: "#8a8070",
    fontSize: 15,
    marginBottom: 20,
    textAlign: "center",
  },
  tokenBox: {
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#f0bc4444",
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  tokenLabel: {
    color: "#8a8070",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  tokenText: {
    color: "#f0bc42",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
});
