import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveQuiz, getAllCategories, type StoredCategory } from '../../data/unifiedStorage';

export default function AddQuizScreen() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<StoredCategory[]>([]);

  useEffect(() => {
    getAllCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  function updateOption(index: number, value: string) {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  }

  async function handleSave() {
    if (!question.trim()) { Alert.alert('தவறு', 'கேள்வி உள்ளிடுங்க'); return; }
    if (options.some(o => !o.trim())) { Alert.alert('தவறு', 'மூன்று விடைகளும் உள்ளிடுங்க'); return; }
    if (correctIndex === null) { Alert.alert('தவறு', 'சரியான விடையை தேர்ந்தெடுங்க'); return; }
    setLoading(true);
    try {
      await saveQuiz({
        id: `quiz_${Date.now()}`, trackId: '', categoryId,
        question: question.trim(), options: options.map(o => o.trim()),
        correctIndex, addedAt: Date.now(),
      });
      setSuccess(true);
      setTimeout(() => router.back(), 2000);
    } catch { Alert.alert('பிழை', 'சேமிக்க முடியவில்லை'); }
    finally { setLoading(false); }
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Quiz சேர்க்கப்பட்டது!</Text>
        <Text style={styles.successSub}>கேள்வி வெற்றிகரமாக சேமிக்கப்பட்டது</Text>
        <ActivityIndicator color="#f0bc42" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← திரும்பு</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎮 Quiz சேர்க்க</Text>
      </View>

      <Text style={styles.label}>Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, categoryId === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color }]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={styles.chipEmoji}>{cat.icon}</Text>
            <Text style={[styles.categoryChipText, categoryId === cat.id && { color: cat.color }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>கேள்வி *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="கேள்வியை உள்ளிடுங்க..."
        placeholderTextColor="#555"
        value={question}
        onChangeText={setQuestion}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>விடைகள் (சரியான விடையை tap பண்ணி select பண்ணுங்க) *</Text>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.optionRow, correctIndex === i && styles.optionRowCorrect]}
          onPress={() => setCorrectIndex(i)}
        >
          <View style={[styles.optionBadge, correctIndex === i && styles.optionBadgeCorrect]}>
            <Text style={styles.optionBadgeText}>{String.fromCharCode(65 + i)}</Text>
          </View>
          <TextInput
            style={styles.optionInput}
            placeholder={`விடை ${i + 1}`}
            placeholderTextColor="#555"
            value={opt}
            onChangeText={v => updateOption(i, v)}
          />
          {correctIndex === i && <Text style={styles.correctMark}>✓</Text>}
        </TouchableOpacity>
      ))}

      {correctIndex !== null && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            ✅ விடை {String.fromCharCode(65 + correctIndex)} சரியான விடையாக தேர்ந்தெடுக்கப்பட்டது
          </Text>
        </View>
      )}

      <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.saveBtnText}>💾 Quiz சேமி</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  backBtn: { color: '#f0bc42', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 8, padding: 14, fontSize: 15, color: '#fff',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  categoryScroll: { marginBottom: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#333', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginVertical: 4,
  },
  chipEmoji: { fontSize: 15 },
  categoryChipText: { color: '#888', fontSize: 13 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 10, marginBottom: 10, gap: 10,
  },
  optionRowCorrect: { borderColor: '#4CAF50', backgroundColor: '#0a2010' },
  optionBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' },
  optionBadgeCorrect: { backgroundColor: '#4CAF50' },
  optionBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  optionInput: { flex: 1, color: '#fff', fontSize: 15, padding: 4 },
  correctMark: { color: '#4CAF50', fontSize: 18, fontWeight: '700' },
  selectedInfo: { backgroundColor: '#0a2010', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#1a4020', marginTop: 4 },
  selectedInfoText: { color: '#4CAF50', fontSize: 13 },
  saveBtn: { backgroundColor: '#f0bc42', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
  successContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { color: '#4CAF50', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  successSub: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 8 },
});
