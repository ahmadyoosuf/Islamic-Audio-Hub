import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  getTrackById,
  updateTrack,
  deleteTrack,
  getQuizzesByTrack,
  saveQuiz,
  updateQuiz,
  deleteQuiz,
  getAllCategories,
  getSubcategoriesByCategory,
  type UnifiedTrack,
  type UnifiedQuiz,
  type StoredCategory,
  type StoredSubcategory,
} from '../../../data/unifiedStorage';

async function persistAudioFile(uri: string, fileName: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = FileSystem.documentDirectory + 'audio/';
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = dir + Date.now() + '_' + safe;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (err) {
    return uri;
  }
}

interface QuizDraft {
  id?: string;
  question: string;
  options: [string, string, string];
  correctIndex: number;
  isEditing?: boolean;
}

export default function EditAudioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [track, setTrack] = useState<UnifiedTrack | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [audioFile, setAudioFile] = useState<{ uri: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [categories, setCategories] = useState<StoredCategory[]>([]);
  const [subcategories, setSubcategories] = useState<StoredSubcategory[]>([]);

  const [quizzes, setQuizzes] = useState<QuizDraft[]>([]);
  const [addingQuiz, setAddingQuiz] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newOpts, setNewOpts] = useState<[string, string, string]>(['', '', '']);
  const [newCorrect, setNewCorrect] = useState<number>(0);
  const [savingQuiz, setSavingQuiz] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  async function loadData() {
    const [found, cats] = await Promise.all([getTrackById(id ?? ''), getAllCategories()]);
    setCategories(cats);
    if (!found) return;
    setTrack(found);
    setTitle(found.title);
    setDescription(found.description ?? '');
    setCategoryId(found.categoryId);
    setSubcategoryId(found.subcategoryId ?? '');
    const subs = await getSubcategoriesByCategory(found.categoryId);
    setSubcategories(subs);
    const qs = await getQuizzesByTrack(id ?? '');
    setQuizzes(qs.map(q => ({
      id: q.id, question: q.question,
      options: [q.options[0], q.options[1], q.options[2]] as [string, string, string],
      correctIndex: q.correctIndex, isEditing: false,
    })));
  }

  async function handleCategoryChange(catId: string) {
    setCategoryId(catId);
    setSubcategoryId('');
    const subs = await getSubcategoriesByCategory(catId);
    setSubcategories(subs);
  }

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setAudioFile({ uri: asset.uri, name: asset.name });
      }
    } catch { Alert.alert('பிழை', 'Audio file தேர்ந்தெடுக்க முடியவில்லை'); }
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('தவறு', 'Title உள்ளிடுங்க'); return; }
    setSaving(true);
    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const updates: Partial<UnifiedTrack> = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        categoryName: selectedCat?.name ?? categoryId,
        subcategoryId: subcategoryId || undefined,
        isBuiltIn: false,
      };
      if (audioFile) {
        updates.audioUrl = await persistAudioFile(audioFile.uri, audioFile.name);
        updates.fileName = audioFile.name;
      }
      await updateTrack(id!, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch { Alert.alert('பிழை', 'சேமிக்க முடியவில்லை'); }
    finally { setSaving(false); }
  }

  function handleDeleteTrack() {
    Alert.alert('நீக்கவா?', `"${title}" audio-ஐ நிரந்தரமாக நீக்க விரும்புகிறீர்களா?`, [
      { text: 'இல்லை', style: 'cancel' },
      { text: 'நீக்கு', style: 'destructive', onPress: async () => { await deleteTrack(id!); router.back(); } },
    ]);
  }

  async function handleSaveNewQuiz() {
    if (!newQ.trim()) { Alert.alert('தவறு', 'கேள்வி உள்ளிடுங்க'); return; }
    if (newOpts.some(o => !o.trim())) { Alert.alert('தவறு', 'மூன்று விடைகளும் உள்ளிடுங்க'); return; }
    setSavingQuiz(true);
    try {
      const quiz: UnifiedQuiz = {
        id: `q_${Date.now()}`, trackId: id!, categoryId,
        question: newQ.trim(), options: newOpts.map(o => o.trim()),
        correctIndex: newCorrect, addedAt: Date.now(),
      };
      await saveQuiz(quiz);
      setQuizzes(prev => [...prev, { id: quiz.id, question: quiz.question, options: newOpts, correctIndex: newCorrect }]);
      setNewQ(''); setNewOpts(['', '', '']); setNewCorrect(0); setAddingQuiz(false);
    } catch { Alert.alert('பிழை', 'Quiz சேமிக்க முடியவில்லை'); }
    finally { setSavingQuiz(false); }
  }

  function toggleEditQuiz(idx: number) {
    setQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, isEditing: !q.isEditing } : q));
  }
  function updateQuizField(idx: number, field: keyof QuizDraft, value: any) {
    setQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  }
  function updateQuizOption(quizIdx: number, optIdx: number, value: string) {
    setQuizzes(prev => prev.map((q, i) => {
      if (i !== quizIdx) return q;
      const opts = [...q.options] as [string, string, string];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  }
  async function handleUpdateQuiz(idx: number) {
    const q = quizzes[idx];
    if (!q.id || !q.question.trim()) return;
    if (q.options.some(o => !o.trim())) { Alert.alert('தவறு', 'மூன்று விடைகளும் உள்ளிடுங்க'); return; }
    try {
      await updateQuiz(q.id, { question: q.question.trim(), options: q.options.map(o => o.trim()), correctIndex: q.correctIndex });
      toggleEditQuiz(idx);
    } catch { Alert.alert('பிழை', 'Quiz update பண்ண முடியவில்லை'); }
  }
  async function handleDeleteQuiz(idx: number) {
    const q = quizzes[idx];
    Alert.alert('நீக்கவா?', 'இந்த quiz-ஐ நீக்க விரும்புகிறீர்களா?', [
      { text: 'இல்லை', style: 'cancel' },
      { text: 'நீக்கு', style: 'destructive', onPress: async () => {
        if (q.id) await deleteQuiz(q.id);
        setQuizzes(prev => prev.filter((_, i) => i !== idx));
      }},
    ]);
  }

  if (!track) {
    return <View style={styles.centered}><ActivityIndicator color="#f0bc42" size="large" /></View>;
  }

  const currentFileName = track.fileName ?? (track.isBuiltIn ? 'Built-in audio (online)' : 'No file');

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>✏️ Edit Audio</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {saved && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedTxt}>✅ வெற்றிகரமாக சேமிக்கப்பட்டது!</Text>
          </View>
        )}

        {track.isBuiltIn && (
          <View style={styles.builtInNotice}>
            <Text style={styles.builtInNoticeTxt}>
              📚 Built-in track — எந்த field-ஐ வேண்டுமானாலும் edit பண்ணலாம்
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>🎵 Audio Details</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="#444" placeholder="Audio title" />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholderTextColor="#444" placeholder="விவரம் (optional)" multiline numberOfLines={2} />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, categoryId === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color }]}
                onPress={() => handleCategoryChange(cat.id)}
              >
                <Text style={styles.chipEmoji}>{cat.icon}</Text>
                <Text style={[styles.chipTxt, categoryId === cat.id && { color: cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {subcategories.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Subcategory (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !subcategoryId && { backgroundColor: '#f0bc4222', borderColor: '#f0bc42' }]}
                  onPress={() => setSubcategoryId('')}
                >
                  <Text style={[styles.chipTxt, !subcategoryId && { color: '#f0bc42' }]}>None</Text>
                </TouchableOpacity>
                {subcategories.map(sub => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.chip, subcategoryId === sub.id && { backgroundColor: '#f0bc4222', borderColor: '#f0bc42' }]}
                    onPress={() => setSubcategoryId(sub.id)}
                  >
                    <Text style={[styles.chipTxt, subcategoryId === sub.id && { color: '#f0bc42' }]}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.fieldLabel}>Audio File</Text>
          <TouchableOpacity style={styles.filePicker} onPress={pickAudio}>
            {audioFile ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.fileIcon}>🎵</Text>
                <Text style={styles.fileSelected}>{audioFile.name}</Text>
                <Text style={styles.fileChange}>மாற்ற tap பண்ணுங்க</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.fileIcon}>📁</Text>
                <Text style={styles.fileHint}>தற்போது: {currentFileName}</Text>
                <Text style={styles.fileChange}>புதிய file tap பண்ணி மாற்றுங்க</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.saveRow}>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnTxt}>💾 மாற்றங்களை சேமி</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteTrackBtn} onPress={handleDeleteTrack}>
            <Text style={styles.deleteTrackTxt}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quizSection}>
          <View style={styles.quizHeader}>
            <Text style={styles.sectionLabel}>🎮 Quiz Questions ({quizzes.length})</Text>
            {!addingQuiz && (
              <TouchableOpacity style={styles.addQuizBtn} onPress={() => setAddingQuiz(true)}>
                <Text style={styles.addQuizTxt}>+ சேர்</Text>
              </TouchableOpacity>
            )}
          </View>

          {quizzes.map((q, qIdx) => (
            <View key={q.id ?? qIdx} style={styles.quizCard}>
              {!q.isEditing ? (
                <View>
                  <Text style={styles.quizQ}>{q.question}</Text>
                  {q.options.map((opt, oi) => (
                    <View key={oi} style={[styles.optRow, oi === q.correctIndex && styles.optRowCorrect]}>
                      <View style={[styles.optBadge, oi === q.correctIndex && styles.optBadgeCorrect]}>
                        <Text style={styles.optBadgeTxt}>{String.fromCharCode(65 + oi)}</Text>
                      </View>
                      <Text style={[styles.optTxt, oi === q.correctIndex && { color: '#4CAF50' }]}>{opt}</Text>
                      {oi === q.correctIndex && <Text style={styles.correctMark}>✓</Text>}
                    </View>
                  ))}
                  <View style={styles.quizActions}>
                    <TouchableOpacity style={styles.quizEditBtn} onPress={() => toggleEditQuiz(qIdx)}>
                      <Text style={styles.quizEditTxt}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quizDeleteBtn} onPress={() => handleDeleteQuiz(qIdx)}>
                      <Text style={styles.quizDeleteTxt}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.fieldLabel}>கேள்வி</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={q.question} onChangeText={v => updateQuizField(qIdx, 'question', v)} placeholderTextColor="#444" multiline numberOfLines={2} />
                  <Text style={styles.fieldLabel}>விடைகள்</Text>
                  {q.options.map((opt, oi) => (
                    <TouchableOpacity key={oi} style={[styles.editOptRow, q.correctIndex === oi && styles.editOptRowCorrect]} onPress={() => updateQuizField(qIdx, 'correctIndex', oi)}>
                      <View style={[styles.optBadge, q.correctIndex === oi && styles.optBadgeCorrect]}>
                        <Text style={styles.optBadgeTxt}>{String.fromCharCode(65 + oi)}</Text>
                      </View>
                      <TextInput style={styles.editOptInput} value={opt} onChangeText={v => updateQuizOption(qIdx, oi, v)} placeholderTextColor="#444" placeholder={`விடை ${oi + 1}`} />
                    </TouchableOpacity>
                  ))}
                  <View style={styles.quizActions}>
                    <TouchableOpacity style={styles.quizSaveBtn} onPress={() => handleUpdateQuiz(qIdx)}>
                      <Text style={styles.quizSaveTxt}>✅ சேமி</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quizCancelBtn} onPress={() => toggleEditQuiz(qIdx)}>
                      <Text style={styles.quizCancelTxt}>ரத்து</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {addingQuiz && (
            <View style={[styles.quizCard, styles.quizCardNew]}>
              <Text style={styles.quizNewTitle}>புதிய கேள்வி சேர்க்கவும்</Text>
              <Text style={styles.fieldLabel}>கேள்வி *</Text>
              <TextInput style={[styles.input, styles.textArea]} value={newQ} onChangeText={setNewQ} placeholderTextColor="#444" placeholder="கேள்வியை உள்ளிடுங்க..." multiline numberOfLines={2} />
              <Text style={styles.fieldLabel}>விடைகள் (சரியான விடையை tap பண்ணி select பண்ணுங்க) *</Text>
              {newOpts.map((opt, oi) => (
                <TouchableOpacity key={oi} style={[styles.editOptRow, newCorrect === oi && styles.editOptRowCorrect]} onPress={() => setNewCorrect(oi)}>
                  <View style={[styles.optBadge, newCorrect === oi && styles.optBadgeCorrect]}>
                    <Text style={styles.optBadgeTxt}>{String.fromCharCode(65 + oi)}</Text>
                  </View>
                  <TextInput
                    style={styles.editOptInput}
                    value={opt}
                    onChangeText={v => { const copy = [...newOpts] as [string, string, string]; copy[oi] = v; setNewOpts(copy); }}
                    placeholderTextColor="#444" placeholder={`விடை ${oi + 1}`}
                  />
                  {newCorrect === oi && <Text style={styles.correctMark}>✓</Text>}
                </TouchableOpacity>
              ))}
              <View style={styles.quizActions}>
                <TouchableOpacity style={[styles.quizSaveBtn, savingQuiz && { opacity: 0.6 }]} onPress={handleSaveNewQuiz} disabled={savingQuiz}>
                  {savingQuiz ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.quizSaveTxt}>💾 Quiz சேமி</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.quizCancelBtn} onPress={() => setAddingQuiz(false)}>
                  <Text style={styles.quizCancelTxt}>ரத்து</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {quizzes.length === 0 && !addingQuiz && (
            <TouchableOpacity style={styles.emptyQuiz} onPress={() => setAddingQuiz(true)} activeOpacity={0.7}>
              <Text style={styles.emptyQuizIcon}>🎮</Text>
              <Text style={styles.emptyQuizTxt}>இந்த audio-க்கு quiz சேர்க்க tap பண்ணுங்க</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  centered: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#0e0e0e', borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  backBtn: { padding: 4, minWidth: 64 },
  backTxt: { color: '#f0bc42', fontSize: 18, fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  savedBanner: {
    backgroundColor: '#0a2010', borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#1a4020', alignItems: 'center',
  },
  savedTxt: { color: '#4CAF50', fontSize: 14, fontWeight: '700' },
  builtInNotice: {
    backgroundColor: '#0a0f2e', borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#2196F333',
  },
  builtInNoticeTxt: { color: '#60a5fa', fontSize: 13 },
  sectionLabel: { color: '#f0bc42', fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  card: {
    backgroundColor: '#141414', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 16,
  },
  fieldLabel: { color: '#888', fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0e0e0e', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 8, padding: 12, fontSize: 14, color: '#fff',
  },
  textArea: { height: 72, textAlignVertical: 'top' },
  chipScroll: { marginBottom: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginVertical: 4,
  },
  chipEmoji: { fontSize: 14 },
  chipTxt: { color: '#666', fontSize: 12 },
  filePicker: {
    backgroundColor: '#0e0e0e', borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#2a2a2a', borderRadius: 10, padding: 20, alignItems: 'center',
  },
  fileIcon: { fontSize: 30, marginBottom: 6 },
  fileHint: { color: '#888', fontSize: 12, textAlign: 'center' },
  fileSelected: { color: '#f0bc42', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  fileChange: { color: '#555', fontSize: 11, marginTop: 4 },
  saveRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  saveBtn: {
    flex: 1, backgroundColor: '#f0bc42', borderRadius: 10, padding: 15, alignItems: 'center',
  },
  saveBtnTxt: { color: '#000', fontSize: 15, fontWeight: '800' },
  deleteTrackBtn: {
    backgroundColor: '#200', borderRadius: 10, width: 50,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#500',
  },
  deleteTrackTxt: { fontSize: 22 },
  quizSection: { marginBottom: 16 },
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addQuizBtn: {
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2196F344',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
  },
  addQuizTxt: { color: '#2196F3', fontSize: 13, fontWeight: '700' },
  quizCard: {
    backgroundColor: '#141414', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e1e1e',
  },
  quizCardNew: { borderColor: '#2196F333', borderWidth: 2 },
  quizNewTitle: { color: '#2196F3', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  quizQ: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  optRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e0e0e',
    borderRadius: 8, padding: 10, marginBottom: 6, gap: 10, borderWidth: 1, borderColor: '#1e1e1e',
  },
  optRowCorrect: { backgroundColor: '#0a2010', borderColor: '#4CAF5044' },
  optBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  optBadgeCorrect: { backgroundColor: '#4CAF50' },
  optBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  optTxt: { color: '#ccc', fontSize: 13, flex: 1 },
  correctMark: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  quizActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quizEditBtn: { borderWidth: 1, borderColor: '#f0bc4244', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  quizEditTxt: { color: '#f0bc42', fontSize: 12, fontWeight: '600' },
  quizDeleteBtn: { borderWidth: 1, borderColor: '#ff6b6b44', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  quizDeleteTxt: { color: '#ff6b6b', fontSize: 12, fontWeight: '600' },
  quizSaveBtn: {
    backgroundColor: '#4CAF50', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 4, alignItems: 'center',
  },
  quizSaveTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  quizCancelBtn: { backgroundColor: '#1e1e1e', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  quizCancelTxt: { color: '#888', fontSize: 13 },
  editOptRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e0e0e',
    borderRadius: 8, padding: 8, marginBottom: 6, gap: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  editOptRowCorrect: { borderColor: '#4CAF50', backgroundColor: '#0a2010' },
  editOptInput: { flex: 1, color: '#fff', fontSize: 14, padding: 4 },
  emptyQuiz: {
    backgroundColor: '#141414', borderRadius: 12, padding: 28, alignItems: 'center',
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#2196F344',
  },
  emptyQuizIcon: { fontSize: 36, marginBottom: 8 },
  emptyQuizTxt: { color: '#555', fontSize: 14, textAlign: 'center' },
});
