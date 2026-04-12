import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Share, ScrollView, Modal, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCMSTrackById, getCMSQuizzesByTrack, type CMSTrack, type CMSQuiz } from '../../../data/cmsStorage';
import { useAudio } from '../../../context/AudioContext';

export default function CMSTrackPlayer() {
  const router = useRouter();
  const { id, cardTitle, catColor, catName, subName } = useLocalSearchParams<{
    id: string; cardTitle: string; catColor: string; catName: string; subName: string;
  }>();
  const color = catColor ?? '#f0bc42';

  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  const [track, setTrack] = useState<CMSTrack | null>(null);
  const [loading, setLoading] = useState(true);

  const [showQuiz, setShowQuiz] = useState(false);
  const [questions, setQuestions] = useState<CMSQuiz[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'result'>('playing');

  useEffect(() => {
    if (!id) return;
    getCMSTrackById(id).then(t => { setTrack(t); setLoading(false); });
  }, [id]);

  const isActive = currentTrack?.id === id;

  function adaptAndPlay() {
    if (!track) return;
    const adapted = {
      id: track.id,
      title: track.title,
      categoryId: 'cms',
      categoryName: catName ?? 'Library',
      duration: track.duration,
      audioUrl: track.audioUrl,
      thumbnailUrl: undefined,
      viewCount: 0,
      isPremium: false,
      sortOrder: track.sortOrder,
      hasQuiz: track.hasQuiz,
    } as any;
    if (isActive) { togglePlay(); }
    else { playTrack(adapted); }
  }

  async function openQuiz() {
    const qs = await getCMSQuizzesByTrack(id ?? '');
    setQuestions(qs);
    setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setPhase('playing');
    setShowQuiz(true);
  }

  function handleAnswer(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[current].correctIndex) setScore(s => s + 1);
  }

  function nextQuestion() {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1); setSelected(null); setAnswered(false);
    } else {
      setPhase('result');
    }
  }

  function resetQuiz() {
    setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setPhase('playing');
  }

  async function handleShare() {
    try {
      await Share.share({ message: `🎵 "${track?.title}" — Islamic Audio Hub-ல் கேளுங்கள்!` });
    } catch {}
  }

  if (loading || !track) {
    return (
      <View style={s.screen}>
        <ActivityIndicator size="large" color={color} style={{ marginTop: 120 }} />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.breadcrumb} numberOfLines={1}>{catName} › {subName} › {cardTitle}</Text>
          <Text style={s.topTitle}>Track Player</Text>
        </View>
        <TouchableOpacity style={s.shareHeaderBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={color} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.artwork, { backgroundColor: color + '18', borderColor: color + '33' }]}>
          <Text style={s.artworkIcon}>🎵</Text>
        </View>

        <Text style={s.trackTitle}>{track.title}</Text>
        <Text style={s.trackMeta}>{cardTitle} · {track.duration} min</Text>

        <TouchableOpacity style={[s.playBtn, { backgroundColor: color }]} onPress={adaptAndPlay}>
          <Text style={s.playBtnTxt}>
            {isActive && isPlaying ? '⏸ இடைநிறுத்து' : '▶ கேளுங்கள்'}
          </Text>
        </TouchableOpacity>

        {track.hasQuiz && questions.length !== 0 || track.hasQuiz ? (
          <TouchableOpacity style={[s.quizBtn, { borderColor: color + '55' }]} onPress={openQuiz}>
            <Text style={s.quizBtnIcon}>🎮</Text>
            <Text style={[s.quizBtnTxt, { color }]}>கேள்வி-பதில் விளையாடு</Text>
            <Text style={s.quizBtnArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionCard} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color="#888" />
            <Text style={s.actionLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={adaptAndPlay}>
            <Ionicons name={isActive && isPlaying ? 'pause-circle-outline' : 'play-circle-outline'} size={24} color={color} />
            <Text style={[s.actionLabel, { color }]}>{isActive && isPlaying ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
          {track.hasQuiz && (
            <TouchableOpacity style={s.actionCard} onPress={openQuiz}>
              <Ionicons name="game-controller-outline" size={24} color="#9C27B0" />
              <Text style={[s.actionLabel, { color: '#9C27B0' }]}>Quiz</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Quiz Modal */}
      <Modal visible={showQuiz} transparent animationType="slide" onRequestClose={() => setShowQuiz(false)}>
        <View style={s.quizModal}>
          <View style={s.quizHeader}>
            <Text style={s.quizHeaderTitle}>🎮 Quiz</Text>
            <TouchableOpacity onPress={() => setShowQuiz(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <View style={s.quizEmpty}>
              <Text style={s.quizEmptyTxt}>Questions இல்லை</Text>
            </View>
          ) : phase === 'result' ? (
            <View style={s.resultBox}>
              <Text style={s.resultEmoji}>{score === questions.length ? '🏆' : score >= questions.length / 2 ? '⭐' : '💪'}</Text>
              <Text style={s.resultTitle}>முடிந்தது!</Text>
              <Text style={[s.resultScore, { color }]}>{score} / {questions.length}</Text>
              <Text style={s.resultSub}>சரியான விடைகள்</Text>
              <TouchableOpacity style={[s.retryBtn, { backgroundColor: color }]} onPress={resetQuiz}>
                <Text style={s.retryTxt}>மீண்டும் விளையாடு</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.quizContent}>
              <View style={s.qProgress}>
                <Text style={s.qProgressTxt}>கேள்வி {current + 1} / {questions.length}</Text>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${((current) / questions.length) * 100}%` as any, backgroundColor: color }]} />
                </View>
              </View>

              <Text style={s.question}>{questions[current].question}</Text>

              {questions[current].options.map((opt, i) => {
                const isCorrect = i === questions[current].correctIndex;
                const isSelected = selected === i;
                let bg = '#1a1a1a';
                let border = '#2a2a2a';
                if (answered) {
                  if (isCorrect) { bg = '#1a3a1a'; border = '#4CAF50'; }
                  else if (isSelected) { bg = '#3a1a1a'; border = '#f44336'; }
                }
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.optBtn, { backgroundColor: bg, borderColor: border }]}
                    onPress={() => handleAnswer(i)}
                    disabled={answered}
                  >
                    <View style={[s.optLetter, { backgroundColor: answered && isCorrect ? '#4CAF5033' : color + '22' }]}>
                      <Text style={[s.optLetterTxt, { color: answered && isCorrect ? '#4CAF50' : color }]}>
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text style={[s.optTxt, answered && isCorrect && { color: '#4CAF50', fontWeight: '700' }]}>{opt}</Text>
                    {answered && isCorrect && <Text style={s.optCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {answered && (
                <TouchableOpacity style={[s.nextBtn, { backgroundColor: color }]} onPress={nextQuestion}>
                  <Text style={s.nextBtnTxt}>{current + 1 < questions.length ? 'அடுத்த கேள்வி ›' : 'முடிவு பார்க்கவும் ›'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#0e0e0e', borderBottomWidth: 1 },
  backBtn: { width: 32, alignItems: 'flex-start' },
  backTxt: { fontSize: 26, fontWeight: '300' },
  topCenter: { flex: 1, alignItems: 'center' },
  breadcrumb: { color: '#555', fontSize: 10, textAlign: 'center' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  shareHeaderBtn: { width: 32, alignItems: 'flex-end' },
  content: { padding: 24, gap: 20, alignItems: 'center' },
  artwork: { width: 200, height: 200, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginTop: 20 },
  artworkIcon: { fontSize: 80 },
  trackTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  trackMeta: { color: '#555', fontSize: 14 },
  playBtn: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 60, alignItems: 'center', width: '100%' },
  playBtnTxt: { color: '#000', fontSize: 18, fontWeight: '800' },
  quizBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, width: '100%', gap: 12 },
  quizBtnIcon: { fontSize: 22 },
  quizBtnTxt: { flex: 1, fontSize: 16, fontWeight: '700' },
  quizBtnArrow: { color: '#555', fontSize: 22 },
  actionsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  actionCard: { backgroundColor: '#111', borderRadius: 14, padding: 18, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1e1e1e', minWidth: 80 },
  actionLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  quizModal: { flex: 1, backgroundColor: '#0e0e0e' },
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  quizHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  quizEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quizEmptyTxt: { color: '#555', fontSize: 16 },
  quizContent: { padding: 20, gap: 14 },
  qProgress: { gap: 8 },
  qProgressTxt: { color: '#888', fontSize: 12 },
  progressBar: { height: 4, backgroundColor: '#222', borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  question: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 26 },
  optBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
  optLetter: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optLetterTxt: { fontSize: 14, fontWeight: '800' },
  optTxt: { flex: 1, color: '#ddd', fontSize: 15 },
  optCheck: { color: '#4CAF50', fontSize: 18, fontWeight: '700' },
  nextBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  nextBtnTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  resultEmoji: { fontSize: 72 },
  resultTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  resultScore: { fontSize: 48, fontWeight: '900' },
  resultSub: { color: '#666', fontSize: 16 },
  retryBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 10 },
  retryTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
});
