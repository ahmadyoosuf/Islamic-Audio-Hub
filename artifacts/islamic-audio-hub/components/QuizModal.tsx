import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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
}

export default function QuizModal({
  visible,
  onClose,
  trackId,
  trackTitle,
}: QuizModalProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const questions = QUIZ_QUESTIONS[trackId] ?? [];
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  const handleReset = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setAnswered(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSelect = async (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = questions[current]?.correctIndex === idx;
    if (isCorrect) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((s) => s + 1);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const OPTION_LABELS = ["அ", "ஆ", "இ"];
  const q = questions[current];
  const pct = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const scorePct = questions.length > 0 ? (score / questions.length) * 100 : 0;

  if (!q && !finished) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "#0f0f0f" : "#f8f9fa",
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </Pressable>
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              இந்த பாடத்திற்கு கேள்வி-பதில் இல்லை
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#0f0f0f" : "#f8f9fa",
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={[styles.quizLabel, { color: "#c8a84b" }]}>
              கேள்வி-பதில்
            </Text>
            <Text
              style={[styles.trackName, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {trackTitle}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {!finished ? (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressSection}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? "#2a2a2a" : "#e2e8f0" },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: "#c8a84b" },
                  ]}
                />
              </View>
              <Text
                style={[styles.progressLabel, { color: colors.mutedForeground }]}
              >
                {current + 1} / {questions.length}
              </Text>
            </View>

            <View
              style={[
                styles.questionCard,
                { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
              ]}
            >
              <Text style={[styles.questionText, { color: colors.foreground }]}>
                {q.question}
              </Text>
            </View>

            <View style={styles.options}>
              {q.options.map((opt, idx) => {
                const isCorrect = answered && idx === q.correctIndex;
                const isWrong = answered && selected === idx && idx !== q.correctIndex;
                const isSelected = selected === idx;

                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleSelect(idx)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
                        borderColor: isCorrect
                          ? "#4ade80"
                          : isWrong
                            ? "#ef4444"
                            : isSelected && !answered
                              ? "#c8a84b"
                              : colors.border,
                        borderWidth: isCorrect || isWrong || (isSelected && !answered) ? 2 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.optionLabel,
                        {
                          backgroundColor: isCorrect
                            ? "#4ade80"
                            : isWrong
                              ? "#ef4444"
                              : isDark
                                ? "#2a2a2a"
                                : "#f1f3f4",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLabelText,
                          {
                            color:
                              isCorrect || isWrong
                                ? "#fff"
                                : colors.mutedForeground,
                          },
                        ]}
                      >
                        {OPTION_LABELS[idx]}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isCorrect
                            ? "#4ade80"
                            : isWrong
                              ? "#ef4444"
                              : colors.foreground,
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                    {isCorrect && (
                      <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                    )}
                    {isWrong && (
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {answered && (
              <Pressable
                onPress={handleNext}
                style={[styles.nextBtn, { backgroundColor: "#c8a84b" }]}
              >
                <Text style={styles.nextBtnText}>
                  {current < questions.length - 1 ? "அடுத்த கேள்வி" : "முடிவு காண்க"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </Pressable>
            )}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.resultContainer]}>
            <View
              style={[
                styles.resultCard,
                { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
              ]}
            >
              <Ionicons
                name={
                  scorePct >= 80
                    ? "trophy"
                    : scorePct >= 60
                      ? "star"
                      : "ribbon"
                }
                size={72}
                color="#c8a84b"
              />
              <Text style={[styles.resultScore, { color: "#c8a84b" }]}>
                {score}/{questions.length}
              </Text>
              <Text style={[styles.resultLabel, { color: colors.foreground }]}>
                {scorePct >= 80
                  ? "மிகவும் சிறப்பு!"
                  : scorePct >= 60
                    ? "நல்ல முயற்சி!"
                    : "மேலும் கற்கலாம்!"}
              </Text>
              <Text
                style={[styles.resultPct, { color: colors.mutedForeground }]}
              >
                {Math.round(scorePct)}% சரியான விடைகள்
              </Text>
            </View>
            <View style={styles.resultBtns}>
              <Pressable
                onPress={handleReset}
                style={[
                  styles.resultBtn,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
                    borderColor: "#c8a84b",
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="refresh" size={18} color="#c8a84b" />
                <Text style={[styles.resultBtnText, { color: "#c8a84b" }]}>
                  மீண்டும் முயற்சி
                </Text>
              </Pressable>
              <Pressable
                onPress={handleClose}
                style={[styles.resultBtn, { backgroundColor: "#c8a84b" }]}
              >
                <Text style={[styles.resultBtnText, { color: "#000" }]}>
                  முடித்தது
                </Text>
              </Pressable>
            </View>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  quizLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  trackName: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  progressSection: {
    gap: 8,
    marginBottom: 20,
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
  progressLabel: {
    fontSize: 13,
    textAlign: "right",
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 28,
    textAlign: "center",
  },
  options: {
    gap: 10,
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLabelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
  },
  resultCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  resultScore: {
    fontSize: 48,
    fontWeight: "800",
  },
  resultLabel: {
    fontSize: 22,
    fontWeight: "700",
  },
  resultPct: {
    fontSize: 15,
  },
  resultBtns: {
    flexDirection: "row",
    gap: 12,
  },
  resultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  resultBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
