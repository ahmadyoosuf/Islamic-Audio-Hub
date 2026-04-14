import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getCardById,
  updateCard,
  type FBCard,
  type FBQuizQuestion,
} from "@/services/firebase.firestore";

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  green:  "#1a7a4a",
  gold:   "#f0bc42",
  red:    "#ef4444",
  bg:     "#f4faf6",
  card:   "#ffffff",
  border: "#d4ead9",
  txt:    "#0d2414",
  sub:    "#5a7a64",
  valid:  "#16a34a",
  warn:   "#d97706",
};

// ─── Empty question form ──────────────────────────────────────────────────────

const BLANK_FORM = {
  question:     "",
  optA:         "",
  optB:         "",
  optC:         "",
  optD:         "",
  correctIndex: -1 as number,
};

type QuestionForm = typeof BLANK_FORM;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formToQuestion(f: QuestionForm): FBQuizQuestion {
  const options = [f.optA, f.optB, f.optC, f.optD].filter(o => o.trim() !== "");
  return { question: f.question.trim(), options, correctIndex: f.correctIndex };
}

function questionToForm(q: FBQuizQuestion): QuestionForm {
  return {
    question:     q.question,
    optA:         q.options[0] ?? "",
    optB:         q.options[1] ?? "",
    optC:         q.options[2] ?? "",
    optD:         q.options[3] ?? "",
    correctIndex: q.correctIndex,
  };
}

function validateForm(f: QuestionForm): string[] {
  const errs: string[] = [];
  if (!f.question.trim())    errs.push("கேள்வி உள்ளிடுங்கள்");
  if (!f.optA.trim())        errs.push("விடை A தேவை");
  if (!f.optB.trim())        errs.push("விடை B தேவை");
  if (f.correctIndex < 0)    errs.push("சரியான விடையை தேர்ந்தெடுங்கள்");
  const filledOpts = [f.optA, f.optB, f.optC, f.optD].filter(o => o.trim());
  if (f.correctIndex >= filledOpts.length) errs.push("தேர்ந்தெடுத்த விடை இல்லை");
  return errs;
}

function validateQuiz(qs: FBQuizQuestion[]): string[] {
  if (qs.length === 0) return ["குறைந்தது ஒரு கேள்வி சேர்க்கவும்"];
  const errs: string[] = [];
  qs.forEach((q, i) => {
    if (!q.question.trim())     errs.push(`கேள்வி ${i + 1}: கேள்வி உள்ளிடவும்`);
    if (q.options.length < 2)   errs.push(`கேள்வி ${i + 1}: குறைந்தது 2 விடைகள் தேவை`);
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length)
      errs.push(`கேள்வி ${i + 1}: சரியான விடை தேர்ந்தெடுக்கவும்`);
  });
  return errs;
}

// ─── Option key list ──────────────────────────────────────────────────────────

const OPT_KEYS: Array<keyof QuestionForm> = ["optA", "optB", "optC", "optD"];
const OPT_LABELS = ["A", "B", "C", "D"];

// ─── Question card (display mode) ────────────────────────────────────────────

function QuestionCard({
  q, idx, onEdit, onDelete,
}: {
  q: FBQuizQuestion; idx: number; onEdit: () => void; onDelete: () => void;
}) {
  const valid = validateQuiz([q]).length === 0;
  return (
    <View style={[qc.wrap, { borderColor: valid ? C.green + "66" : C.red + "66" }]}>
      <View style={qc.topRow}>
        <View style={[qc.numBadge, { backgroundColor: valid ? C.green : C.red }]}>
          <Text style={qc.numTxt}>Q{idx + 1}</Text>
        </View>
        <Text style={qc.qTxt} numberOfLines={3}>{q.question}</Text>
        <View style={qc.actions}>
          <Pressable onPress={onEdit} style={[qc.actionBtn, { backgroundColor: "#fff8e6", borderColor: C.gold + "88" }]} hitSlop={8}>
            <Ionicons name="pencil" size={14} color={C.gold} />
          </Pressable>
          <Pressable onPress={onDelete} style={[qc.actionBtn, { backgroundColor: "#fff0f0", borderColor: C.red + "88" }]} hitSlop={8}>
            <Ionicons name="trash" size={14} color={C.red} />
          </Pressable>
        </View>
      </View>
      <View style={qc.opts}>
        {q.options.map((opt, i) => (
          <View key={i} style={[qc.optRow, i === q.correctIndex && qc.optCorrect]}>
            <View style={[qc.optLabel, i === q.correctIndex && { backgroundColor: C.green }]}>
              <Text style={[qc.optLabelTxt, i === q.correctIndex && { color: "#fff" }]}>
                {OPT_LABELS[i]}
              </Text>
            </View>
            <Text style={[qc.optTxt, i === q.correctIndex && { color: C.green, fontWeight: "700" }]}>
              {opt}
            </Text>
            {i === q.correctIndex && (
              <Ionicons name="checkmark-circle" size={16} color={C.green} />
            )}
          </View>
        ))}
      </View>
      {!valid && (
        <View style={qc.errRow}>
          <Ionicons name="warning-outline" size={13} color={C.red} />
          <Text style={qc.errTxt}>இந்த கேள்வி முழுமையடையவில்லை</Text>
        </View>
      )}
    </View>
  );
}

const qc = StyleSheet.create({
  wrap:        { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  topRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  numBadge:    { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  numTxt:      { color: "#fff", fontSize: 11, fontWeight: "800" },
  qTxt:        { flex: 1, fontSize: 14, fontWeight: "600", color: C.txt, lineHeight: 20 },
  actions:     { flexDirection: "row", gap: 6 },
  actionBtn:   { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  opts:        { gap: 6 },
  optRow:      { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f6faf7", borderWidth: 1, borderColor: "#e0eee4" },
  optCorrect:  { backgroundColor: "#e8f5ee", borderColor: C.green + "66" },
  optLabel:    { width: 22, height: 22, borderRadius: 6, backgroundColor: "#dce8dc", alignItems: "center", justifyContent: "center" },
  optLabelTxt: { fontSize: 11, fontWeight: "800", color: C.sub },
  optTxt:      { flex: 1, fontSize: 13, color: C.txt },
  errRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errTxt:      { color: C.red, fontSize: 12 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QuizEditorScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const router     = useRouter();

  const [card,        setCard]        = useState<FBCard | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [questions,   setQuestions]   = useState<FBQuizQuestion[]>([]);
  const [quizTitleTa, setQuizTitleTa] = useState("");
  const [quizTitleEn, setQuizTitleEn] = useState("");

  const [editingIdx,  setEditingIdx]  = useState<number | null>(null);
  const [form,        setForm]        = useState<QuestionForm>(BLANK_FORM);
  const [formErrors,  setFormErrors]  = useState<string[]>([]);
  const [saving,      setSaving]      = useState(false);

  const formShake = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const c = await getCardById(cardId);
      if (c) {
        setCard(c);
        setQuestions(c.quiz ?? []);
        setQuizTitleTa(c.quizTitleTa ?? "");
        setQuizTitleEn(c.quizTitleEn ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  const quizErrors  = validateQuiz(questions);
  const isQuizValid = quizErrors.length === 0;

  function shakeForm() {
    Animated.sequence([
      Animated.timing(formShake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 6,  duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(formShake, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function handleAddOrUpdate() {
    const errs = validateForm(form);
    if (errs.length > 0) { setFormErrors(errs); shakeForm(); return; }
    setFormErrors([]);
    const q = formToQuestion(form);
    if (editingIdx !== null) {
      setQuestions(prev => prev.map((item, i) => i === editingIdx ? q : item));
      setEditingIdx(null);
    } else {
      setQuestions(prev => [...prev, q]);
    }
    setForm(BLANK_FORM);
  }

  function handleEdit(idx: number) {
    setEditingIdx(idx);
    setForm(questionToForm(questions[idx]));
    setFormErrors([]);
  }

  function handleDelete(idx: number) {
    Alert.alert(
      "கேள்வி நீக்கவா?",
      `Q${idx + 1} நீக்கப்படும்.`,
      [
        { text: "இல்லை", style: "cancel" },
        { text: "நீக்கு", style: "destructive", onPress: () => {
          setQuestions(prev => prev.filter((_, i) => i !== idx));
          if (editingIdx === idx) { setEditingIdx(null); setForm(BLANK_FORM); }
        }},
      ]
    );
  }

  function cancelEdit() {
    setEditingIdx(null);
    setForm(BLANK_FORM);
    setFormErrors([]);
  }

  async function handleSave() {
    if (!isQuizValid || !cardId) { shakeForm(); return; }
    setSaving(true);
    try {
      await updateCard(cardId, {
        quiz:        questions,
        quizTitleTa: quizTitleTa.trim(),
        quizTitleEn: quizTitleEn.trim(),
        hasQuiz:     questions.length > 0,
      });
      Alert.alert("✅ சேமிக்கப்பட்டது", "Quiz Firebase-ல் சேமிக்கப்பட்டது!", [
        { text: "சரி", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("பிழை", e.message ?? "சேமிக்க முடியவில்லை");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={s.loadTxt}>Quiz ஏற்றுகிறது...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={C.red} />
          <Text style={s.loadTxt}>Card கிடைக்கவில்லை</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formOptCount = [form.optA, form.optB, form.optC, form.optD].filter(o => o.trim()).length;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={C.green} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            🧩 Quiz திருத்து
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {card.titleTa || card.titleEn}
          </Text>
        </View>
        {/* Validity indicator */}
        <View style={[s.validBadge, { backgroundColor: isQuizValid ? "#dcfce7" : "#fef2f2", borderColor: isQuizValid ? C.valid : C.red }]}>
          <Ionicons name={isQuizValid ? "checkmark-circle" : "close-circle"} size={16} color={isQuizValid ? C.valid : C.red} />
          <Text style={[s.validTxt, { color: isQuizValid ? C.valid : C.red }]}>
            {isQuizValid ? "Valid" : "Invalid"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Card info banner ── */}
        <View style={s.infoBanner}>
          <View style={s.infoIconWrap}>
            <Ionicons name="musical-note" size={22} color={C.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>{card.titleTa}</Text>
            {!!card.titleEn && <Text style={s.infoEn}>{card.titleEn}</Text>}
          </View>
          <View style={[s.countPill, { backgroundColor: C.green + "22" }]}>
            <Text style={[s.countTxt, { color: C.green }]}>{questions.length} கேள்விகள்</Text>
          </View>
        </View>

        {/* ── Quiz titles ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quiz தலைப்பு</Text>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>தமிழ் தலைப்பு</Text>
            <TextInput
              style={s.input}
              value={quizTitleTa}
              onChangeText={setQuizTitleTa}
              placeholder="உதா: அடிப்படை இஸ்லாமிய கேள்விகள்"
              placeholderTextColor="#9abca4"
            />
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>English Title</Text>
            <TextInput
              style={s.input}
              value={quizTitleEn}
              onChangeText={setQuizTitleEn}
              placeholder="e.g. Basic Islamic Quiz"
              placeholderTextColor="#9abca4"
            />
          </View>
        </View>

        {/* ── Existing questions ── */}
        {questions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              கேள்விகள் ({questions.length})
            </Text>
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                idx={i}
                onEdit={() => handleEdit(i)}
                onDelete={() => handleDelete(i)}
              />
            ))}
          </View>
        )}

        {/* ── Quiz validation summary ── */}
        {questions.length > 0 && (
          <View style={[s.validSummary, {
            backgroundColor: isQuizValid ? "#dcfce7" : "#fef2f2",
            borderColor:     isQuizValid ? C.valid + "88" : C.red + "88",
          }]}>
            <Ionicons
              name={isQuizValid ? "checkmark-circle" : "warning"}
              size={20}
              color={isQuizValid ? C.valid : C.red}
            />
            {isQuizValid ? (
              <Text style={[s.validSummaryTxt, { color: C.valid }]}>
                ✅ Valid Quiz — {questions.length} கேள்விகள் சரியாக உள்ளன. Firebase-ல் சேமிக்கலாம்.
              </Text>
            ) : (
              <View style={{ flex: 1 }}>
                {quizErrors.map((e, i) => (
                  <Text key={i} style={[s.validSummaryTxt, { color: C.red }]}>• {e}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Add / Edit question form ── */}
        <Animated.View style={[s.section, s.formCard, { transform: [{ translateX: formShake }] }]}>
          <Text style={s.sectionTitle}>
            {editingIdx !== null ? `✏️ Q${editingIdx + 1} திருத்து` : "➕ புதிய கேள்வி சேர்"}
          </Text>

          {/* Question text */}
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>கேள்வி *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={form.question}
              onChangeText={v => setForm(f => ({ ...f, question: v }))}
              placeholder="கேள்வியை இங்கே உள்ளிடுங்கள்..."
              placeholderTextColor="#9abca4"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Options */}
          <Text style={s.fieldLabel}>விடைகள் (சரியான விடையை tap செய்யுங்கள்) *</Text>
          {OPT_KEYS.map((key, i) => {
            const val     = form[key] as string;
            const isSelected = form.correctIndex === i;
            const isFilled   = val.trim().length > 0;
            return (
              <View key={key} style={s.optFormRow}>
                {/* Correct answer selector */}
                <Pressable
                  onPress={() => setForm(f => ({ ...f, correctIndex: i }))}
                  style={[s.optSelector, isSelected && s.optSelectorActive]}
                  hitSlop={8}
                >
                  <Text style={[s.optSelectorLbl, isSelected && { color: "#fff" }]}>
                    {OPT_LABELS[i]}
                  </Text>
                </Pressable>
                {/* Input */}
                <TextInput
                  style={[s.optInput, isSelected && { borderColor: C.green, backgroundColor: "#f0faf4" }]}
                  value={val}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={`விடை ${OPT_LABELS[i]}${i >= 2 ? " (optional)" : " *"}`}
                  placeholderTextColor="#9abca4"
                />
                {isSelected && isFilled && (
                  <Ionicons name="checkmark-circle" size={20} color={C.green} />
                )}
              </View>
            );
          })}

          {/* Correct answer hint */}
          {form.correctIndex >= 0 && (
            <View style={s.correctHint}>
              <Ionicons name="information-circle-outline" size={14} color={C.green} />
              <Text style={s.correctHintTxt}>
                விடை {OPT_LABELS[form.correctIndex]} சரியான விடையாக தேர்ந்தெடுக்கப்பட்டது
              </Text>
            </View>
          )}

          {/* Form errors */}
          {formErrors.length > 0 && (
            <View style={s.formErrBox}>
              {formErrors.map((e, i) => (
                <View key={i} style={s.formErrRow}>
                  <Ionicons name="close-circle" size={13} color={C.red} />
                  <Text style={s.formErrTxt}>{e}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Form buttons */}
          <View style={s.formBtns}>
            {editingIdx !== null && (
              <TouchableOpacity style={[s.btn, s.btnGray]} onPress={cancelEdit}>
                <Text style={[s.btnTxt, { color: C.sub }]}>ரத்து</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btn, s.btnGreen, { flex: 1 }]}
              onPress={handleAddOrUpdate}
            >
              <Ionicons name={editingIdx !== null ? "checkmark" : "add"} size={18} color="#fff" />
              <Text style={s.btnTxt}>
                {editingIdx !== null ? "மாற்றம் சேமி" : "கேள்வி சேர்"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Save to Firebase button ── */}
        <TouchableOpacity
          style={[
            s.saveBtn,
            !isQuizValid && { backgroundColor: "#ccc", borderColor: "#bbb" },
          ]}
          onPress={handleSave}
          disabled={saving || !isQuizValid}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isQuizValid ? "cloud-upload-outline" : "lock-closed-outline"}
                size={20}
                color={isQuizValid ? "#fff" : "#888"}
              />
              <Text style={[s.saveBtnTxt, !isQuizValid && { color: "#888" }]}>
                {isQuizValid
                  ? `✅ Firebase-ல் சேமி (${questions.length} கேள்விகள்)`
                  : "Quiz முழுமையடையவில்லை"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!isQuizValid && questions.length > 0 && (
          <Text style={s.saveBtnHint}>
            சேமிக்க மேலே உள்ள பிழைகளை சரி செய்யுங்கள்
          </Text>
        )}
        {questions.length === 0 && (
          <Text style={s.saveBtnHint}>
            குறைந்தது ஒரு கேள்வி சேர்க்கவும்
          </Text>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadTxt:{ fontSize: 14, color: C.sub },

  header:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#fff" },
  backBtn:      { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 15, fontWeight: "800", color: C.txt },
  headerSub:    { fontSize: 11, color: C.sub, marginTop: 1 },
  validBadge:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  validTxt:     { fontSize: 12, fontWeight: "700" },

  scroll: { padding: 16, gap: 0 },

  infoBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  infoIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#e8f5ee", alignItems: "center", justifyContent: "center" },
  infoTitle:  { fontSize: 14, fontWeight: "700", color: C.txt },
  infoEn:     { fontSize: 11, color: C.sub, marginTop: 2 },
  countPill:  { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  countTxt:   { fontSize: 11, fontWeight: "700" },

  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },

  formCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: C.sub, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: C.txt, backgroundColor: C.bg,
  },
  textArea:   { height: 88, textAlignVertical: "top" },

  optFormRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  optSelector:      { width: 34, height: 34, borderRadius: 10, backgroundColor: "#e0ece2", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent", flexShrink: 0 },
  optSelectorActive:{ backgroundColor: C.green, borderColor: C.green },
  optSelectorLbl:   { fontSize: 13, fontWeight: "800", color: C.sub },
  optInput:         { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.txt, backgroundColor: C.bg },

  correctHint:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#e8f5ee", borderRadius: 8, padding: 10, marginBottom: 10 },
  correctHintTxt: { fontSize: 12, color: C.green, fontWeight: "600" },

  formErrBox:  { backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, marginBottom: 12, gap: 4 },
  formErrRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  formErrTxt:  { color: C.red, fontSize: 12 },

  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 12 },
  btnGreen: { backgroundColor: C.green },
  btnGray:  { backgroundColor: "#e5ede7", paddingHorizontal: 20 },
  btnTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },

  validSummary:    { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  validSummaryTxt: { fontSize: 13, fontWeight: "600", flex: 1 },

  saveBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, marginBottom: 10, borderWidth: 2, borderColor: C.green },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  saveBtnHint:{ textAlign: "center", color: C.sub, fontSize: 12, marginBottom: 8 },
});
