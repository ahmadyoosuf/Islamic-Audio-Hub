import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Pressable, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  getCMSTracksByCard, addCMSTrack, updateCMSTrack, deleteCMSTrack,
  batchUpdateCMSTrackOrder, getCMSQuizzesByTrack, addCMSQuiz, deleteCMSQuiz,
  type CMSTrack, type CMSQuiz,
} from '../../../data/cmsStorage';

const BLANK_TRACK = { title: '', audioUrl: '', duration: '5', hasQuiz: false };
const BLANK_QUIZ  = { question: '', optA: '', optB: '', optC: '', correct: 0 as 0 | 1 | 2 };

export default function CMSAdminCard() {
  const router = useRouter();
  const { cardId, cardTitle, catColor } = useLocalSearchParams<{ cardId: string; cardTitle: string; catColor: string }>();
  const color = catColor ?? '#f0bc42';

  const [tracks, setTracks] = useState<CMSTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<CMSTrack | null>(null);
  const [trackForm, setTrackForm] = useState(BLANK_TRACK);
  const [savingTrack, setSavingTrack] = useState(false);

  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<Record<string, CMSQuiz[]>>({});
  const [loadingQuiz, setLoadingQuiz] = useState<string | null>(null);

  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizForTrack, setQuizForTrack] = useState('');
  const [quizForm, setQuizForm] = useState(BLANK_QUIZ);
  const [savingQuiz, setSavingQuiz] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [cardId]));

  async function load() {
    setLoading(true);
    const t = await getCMSTracksByCard(cardId ?? '');
    setTracks(t); setLoading(false);
  }

  async function loadQuizForTrack(trackId: string) {
    setLoadingQuiz(trackId);
    const qs = await getCMSQuizzesByTrack(trackId);
    setQuizData(prev => ({ ...prev, [trackId]: qs }));
    setLoadingQuiz(null);
  }

  function toggleQuiz(trackId: string) {
    if (expandedQuiz === trackId) { setExpandedQuiz(null); return; }
    setExpandedQuiz(trackId);
    if (!quizData[trackId]) loadQuizForTrack(trackId);
  }

  function openAddTrack() {
    setEditingTrack(null); setTrackForm(BLANK_TRACK); setShowTrackModal(true);
  }

  function openEditTrack(t: CMSTrack) {
    setEditingTrack(t);
    setTrackForm({ title: t.title, audioUrl: t.audioUrl, duration: String(t.duration), hasQuiz: t.hasQuiz });
    setShowTrackModal(true);
  }

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setTrackForm(f => ({ ...f, audioUrl: asset.uri, title: f.title || (asset.name?.replace(/\.[^.]+$/, '') ?? '') }));
      }
    } catch { Alert.alert('Error', 'File pick failed'); }
  }

  async function saveTrack() {
    if (!trackForm.title.trim()) { Alert.alert('தலைப்பு தேவை'); return; }
    if (!trackForm.audioUrl.trim()) { Alert.alert('Audio URL தேவை'); return; }
    setSavingTrack(true);
    const dur = parseFloat(trackForm.duration) || 5;
    if (editingTrack) {
      await updateCMSTrack(editingTrack.id, { title: trackForm.title.trim(), audioUrl: trackForm.audioUrl.trim(), duration: dur, hasQuiz: trackForm.hasQuiz });
    } else {
      const maxOrder = tracks.length > 0 ? Math.max(...tracks.map(t => t.sortOrder)) : 0;
      await addCMSTrack({ cardId: cardId!, title: trackForm.title.trim(), audioUrl: trackForm.audioUrl.trim(), duration: dur, hasQuiz: trackForm.hasQuiz, sortOrder: maxOrder + 1 });
    }
    setSavingTrack(false); setShowTrackModal(false); load();
  }

  function deleteTrackConfirm(t: CMSTrack) {
    Alert.alert('நீக்கவா?', `"${t.title}" track மற்றும் அதன் quizzes நீக்கப்படும்.`, [
      { text: 'இல்லை', style: 'cancel' },
      { text: 'நீக்கு', style: 'destructive', onPress: async () => {
        await deleteCMSTrack(t.id);
        if (expandedQuiz === t.id) setExpandedQuiz(null);
        load();
      }},
    ]);
  }

  function moveTrack(index: number, dir: -1 | 1) {
    const newTracks = [...tracks];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= newTracks.length) return;
    [newTracks[index], newTracks[swapIdx]] = [newTracks[swapIdx], newTracks[index]];
    setTracks(newTracks);
    const updates = newTracks.map((t, i) => ({ id: t.id, sortOrder: i + 1 }));
    batchUpdateCMSTrackOrder(updates);
  }

  function openAddQuiz(trackId: string) {
    setQuizForTrack(trackId);
    setQuizForm(BLANK_QUIZ);
    setShowQuizModal(true);
  }

  async function saveQuiz() {
    if (!quizForm.question.trim() || !quizForm.optA.trim() || !quizForm.optB.trim() || !quizForm.optC.trim()) {
      Alert.alert('அனைத்து fields-ம் தேவை'); return;
    }
    setSavingQuiz(true);
    await addCMSQuiz({
      trackId: quizForTrack,
      question: quizForm.question.trim(),
      options: [quizForm.optA.trim(), quizForm.optB.trim(), quizForm.optC.trim()],
      correctIndex: quizForm.correct,
    });
    setSavingQuiz(false); setShowQuizModal(false);
    loadQuizForTrack(quizForTrack);
    // Mark track as hasQuiz if not already
    const track = tracks.find(t => t.id === quizForTrack);
    if (track && !track.hasQuiz) {
      await updateCMSTrack(quizForTrack, { hasQuiz: true });
      load();
    }
  }

  async function deleteQuiz(quiz: CMSQuiz) {
    await deleteCMSQuiz(quiz.id);
    const remaining = (quizData[quiz.trackId] ?? []).filter(q => q.id !== quiz.id);
    setQuizData(prev => ({ ...prev, [quiz.trackId]: remaining }));
    if (remaining.length === 0) {
      await updateCMSTrack(quiz.trackId, { hasQuiz: false });
      load();
    }
  }

  return (
    <View style={s.screen}>
      <View style={[s.header, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{cardTitle ?? 'Tracks'}</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: color }]} onPress={openAddTrack}>
          <Text style={s.addBtnTxt}>+ Track</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={color} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.hint}>
            🎵 {tracks.length} Tracks — நீண்ட அழுத்தி drag செய்து reorder பண்ணலாம் · Quiz சேர்க்க expand பண்ணுங்கள்
          </Text>

          {tracks.length === 0 && (
            <TouchableOpacity style={[s.emptyCard, { borderColor: color + '44' }]} onPress={openAddTrack}>
              <Text style={[s.emptyIcon, { color }]}>🎵</Text>
              <Text style={[s.emptyTxt, { color }]}>முதல் Track சேர்க்கவும்</Text>
            </TouchableOpacity>
          )}

          {tracks.map((track, i) => (
            <View key={track.id} style={[s.trackCard, { borderLeftColor: color }]}>
              <View style={s.trackRow}>
                <View style={[s.numBox, { backgroundColor: color + '22' }]}>
                  <Text style={[s.numTxt, { color }]}>{i + 1}</Text>
                </View>
                <View style={s.trackInfo}>
                  <Text style={s.trackTitle}>{track.title}</Text>
                  <Text style={s.trackMeta}>⏱ {track.duration} min{track.hasQuiz ? ' · ✅ Quiz' : ''}</Text>
                </View>
                <View style={s.trackActions}>
                  <TouchableOpacity style={s.orderBtn} onPress={() => moveTrack(i, -1)} disabled={i === 0}>
                    <Text style={[s.orderTxt, i === 0 && { opacity: 0.2 }]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.orderBtn} onPress={() => moveTrack(i, 1)} disabled={i === tracks.length - 1}>
                    <Text style={[s.orderTxt, i === tracks.length - 1 && { opacity: 0.2 }]}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEditTrack(track)}>
                    <Text style={s.editTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => deleteTrackConfirm(track)}>
                    <Text style={s.delTxt}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[s.quizToggle, { backgroundColor: color + '12', borderColor: color + '33' }]}
                onPress={() => toggleQuiz(track.id)}
              >
                <Text style={[s.quizToggleTxt, { color }]}>
                  🧩 Quiz Questions {expandedQuiz === track.id ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {expandedQuiz === track.id && (
                <View style={s.quizSection}>
                  {loadingQuiz === track.id ? (
                    <ActivityIndicator size="small" color={color} style={{ padding: 10 }} />
                  ) : (
                    <>
                      {(quizData[track.id] ?? []).map((q, qi) => (
                        <View key={q.id} style={s.quizItem}>
                          <View style={s.quizHeader}>
                            <Text style={s.quizQ} numberOfLines={2}>Q{qi + 1}: {q.question}</Text>
                            <TouchableOpacity style={s.quizDelBtn} onPress={() => deleteQuiz(q)}>
                              <Text style={s.quizDelTxt}>✕</Text>
                            </TouchableOpacity>
                          </View>
                          {q.options.map((opt, oi) => (
                            <Text key={oi} style={[s.quizOpt, oi === q.correctIndex && { color: '#4CAF50', fontWeight: '700' }]}>
                              {oi === q.correctIndex ? '✓' : '○'} {String.fromCharCode(65 + oi)}. {opt}
                            </Text>
                          ))}
                        </View>
                      ))}
                      <TouchableOpacity style={[s.addQuizBtn, { borderColor: color + '44' }]} onPress={() => openAddQuiz(track.id)}>
                        <Text style={[s.addQuizTxt, { color }]}>+ Question சேர்க்கவும்</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Track Modal */}
      <Modal visible={showTrackModal} transparent animationType="slide" onRequestClose={() => setShowTrackModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowTrackModal(false)} />
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheet} keyboardShouldPersistTaps="handled">
          <Text style={s.sheetTitle}>{editingTrack ? 'Track திருத்து' : 'புதிய Track'}</Text>

          <Text style={s.fieldLabel}>தலைப்பு *</Text>
          <TextInput style={s.input} value={trackForm.title} onChangeText={t => setTrackForm(f => ({ ...f, title: t }))} placeholder="Track தலைப்பு..." placeholderTextColor="#444" />

          <Text style={s.fieldLabel}>Audio URL *</Text>
          <TextInput style={s.input} value={trackForm.audioUrl} onChangeText={t => setTrackForm(f => ({ ...f, audioUrl: t }))} placeholder="https://... அல்லது upload பண்ணவும்" placeholderTextColor="#444" autoCapitalize="none" />

          <TouchableOpacity style={[s.uploadBtn, { borderColor: color + '55' }]} onPress={pickAudio}>
            <Text style={[s.uploadTxt, { color }]}>📁 Audio File Upload</Text>
          </TouchableOpacity>

          <Text style={s.fieldLabel}>காலம் (நிமிடங்கள்)</Text>
          <TextInput style={s.input} value={trackForm.duration} onChangeText={t => setTrackForm(f => ({ ...f, duration: t }))} placeholder="5" placeholderTextColor="#444" keyboardType="decimal-pad" />

          <View style={s.switchRow}>
            <Text style={s.fieldLabel}>Quiz இருக்கிறதா?</Text>
            <Switch
              value={trackForm.hasQuiz}
              onValueChange={v => setTrackForm(f => ({ ...f, hasQuiz: v }))}
              trackColor={{ false: '#333', true: color + '88' }}
              thumbColor={trackForm.hasQuiz ? color : '#888'}
            />
          </View>

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }]} onPress={saveTrack} disabled={savingTrack}>
            <Text style={s.saveTxt}>{savingTrack ? '...' : editingTrack ? 'சேமிக்கவும்' : 'உருவாக்கவும்'}</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </Modal>

      {/* Quiz Modal */}
      <Modal visible={showQuizModal} transparent animationType="slide" onRequestClose={() => setShowQuizModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowQuizModal(false)} />
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheet} keyboardShouldPersistTaps="handled">
          <Text style={s.sheetTitle}>Quiz Question சேர்க்கவும்</Text>

          <Text style={s.fieldLabel}>கேள்வி *</Text>
          <TextInput style={[s.input, { height: 80 }]} value={quizForm.question} onChangeText={t => setQuizForm(f => ({ ...f, question: t }))} placeholder="கேள்வி..." placeholderTextColor="#444" multiline />

          {(['optA', 'optB', 'optC'] as const).map((key, i) => (
            <View key={key}>
              <Text style={s.fieldLabel}>விடை {String.fromCharCode(65 + i)} {quizForm.correct === i ? '✅ (சரியான விடை)' : ''}</Text>
              <View style={s.optRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={quizForm[key]}
                  onChangeText={t => setQuizForm(f => ({ ...f, [key]: t }))}
                  placeholder={`Option ${String.fromCharCode(65 + i)}...`}
                  placeholderTextColor="#444"
                />
                <TouchableOpacity
                  style={[s.correctBtn, quizForm.correct === i && { backgroundColor: '#4CAF5033', borderColor: '#4CAF50' }]}
                  onPress={() => setQuizForm(f => ({ ...f, correct: i as 0 | 1 | 2 }))}
                >
                  <Text style={[s.correctTxt, quizForm.correct === i && { color: '#4CAF50' }]}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }]} onPress={saveQuiz} disabled={savingQuiz}>
            <Text style={s.saveTxt}>{savingQuiz ? '...' : 'Question சேர்க்கவும்'}</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: '#0e0e0e', borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, gap: 12 },
  hint: { color: '#444', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 40, alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 14, fontWeight: '600' },
  trackCard: { backgroundColor: '#111', borderRadius: 12, borderLeftWidth: 3, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  numBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 12, fontWeight: '800' },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  trackMeta: { color: '#555', fontSize: 11, marginTop: 2 },
  trackActions: { flexDirection: 'row', gap: 4 },
  orderBtn: { backgroundColor: '#1a1a1a', borderRadius: 6, padding: 7 },
  orderTxt: { color: '#888', fontSize: 13, fontWeight: '700' },
  editBtn: { backgroundColor: '#f0bc4222', borderRadius: 6, padding: 7 },
  editTxt: { fontSize: 13 },
  delBtn: { backgroundColor: '#ff444422', borderRadius: 6, padding: 7 },
  delTxt: { fontSize: 13 },
  quizToggle: { marginHorizontal: 12, marginBottom: 12, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, alignItems: 'center' },
  quizToggleTxt: { fontSize: 12, fontWeight: '700' },
  quizSection: { marginHorizontal: 12, marginBottom: 12, gap: 8 },
  quizItem: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10, gap: 4 },
  quizHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quizQ: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  quizDelBtn: { padding: 4 },
  quizDelTxt: { color: '#ff4444', fontSize: 14 },
  quizOpt: { color: '#888', fontSize: 11, paddingLeft: 4 },
  addQuizBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addQuizTxt: { fontSize: 13, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#00000099' },
  sheetScroll: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheet: { padding: 24 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 14 },
  uploadBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  uploadTxt: { fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
  optRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  correctBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  correctTxt: { color: '#555', fontSize: 18, fontWeight: '700' },
});
