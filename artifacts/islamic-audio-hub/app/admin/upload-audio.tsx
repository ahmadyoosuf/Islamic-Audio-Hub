import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  addTrack,
  getAllCategories,
  getSubcategoriesByCategory,
  type StoredCategory,
  type StoredSubcategory,
} from '../../data/unifiedStorage';

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

export default function UploadAudioScreen() {
  const router = useRouter();
  const { preselectedCategory } = useLocalSearchParams<{ preselectedCategory?: string }>();

  const [categories, setCategories] = useState<StoredCategory[]>([]);
  const [subcategories, setSubcategories] = useState<StoredSubcategory[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(preselectedCategory ?? '');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [audioFile, setAudioFile] = useState<{ uri: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAllCategories().then(cats => {
      setCategories(cats);
      if (!categoryId && cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  useEffect(() => {
    if (!categoryId) { setSubcategories([]); return; }
    getSubcategoriesByCategory(categoryId).then(subs => {
      setSubcategories(subs);
      setSubcategoryId('');
    });
  }, [categoryId]);

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setAudioFile({ uri: asset.uri, name: asset.name });
      }
    } catch {
      Alert.alert('பிழை', 'Audio file தேர்ந்தெடுக்க முடியவில்லை');
    }
  }

  async function handleUpload() {
    if (!title.trim()) { Alert.alert('தவறு', 'Title உள்ளிடுங்க'); return; }
    if (!audioFile) { Alert.alert('தவறு', 'Audio file தேர்ந்தெடுங்க'); return; }
    if (!categoryId) { Alert.alert('தவறு', 'Category தேர்ந்தெடுங்க'); return; }
    setLoading(true);
    try {
      const persistedUri = await persistAudioFile(audioFile.uri, audioFile.name);
      const selectedCat = categories.find(c => c.id === categoryId);
      await addTrack({
        id: `custom_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        categoryId,
        categoryName: selectedCat?.name ?? categoryId,
        subcategoryId: subcategoryId || undefined,
        audioUrl: persistedUri,
        fileName: audioFile.name,
        uploadedAt: Date.now(),
        duration: 0,
        viewCount: 0,
        isPremium: false,
        sortOrder: 9999,
        hasQuiz: false,
        isBuiltIn: false,
      });
      setSuccess(true);
      setTimeout(() => router.back(), 2000);
    } catch {
      Alert.alert('பிழை', 'Upload பண்ண முடியவில்லை');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>வெற்றிகரமாக சேமிக்கப்பட்டது!</Text>
        <Text style={styles.successSub}>"{title}" சேர்க்கப்பட்டது</Text>
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
        <Text style={styles.headerTitle}>🎵 Audio Upload</Text>
      </View>

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="பாடலின் பெயர் உள்ளிடுங்க"
        placeholderTextColor="#555"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="விவரம் (optional)"
        placeholderTextColor="#555"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, categoryId === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color }]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text style={[styles.chipTxt, categoryId === cat.id && { color: cat.color }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {subcategories.length > 0 && (
        <>
          <Text style={styles.label}>Subcategory (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !subcategoryId && styles.chipActive]}
              onPress={() => setSubcategoryId('')}
            >
              <Text style={[styles.chipTxt, !subcategoryId && { color: '#f0bc42' }]}>None</Text>
            </TouchableOpacity>
            {subcategories.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.chip, subcategoryId === sub.id && styles.chipActive]}
                onPress={() => setSubcategoryId(sub.id)}
              >
                <Text style={[styles.chipTxt, subcategoryId === sub.id && { color: '#f0bc42' }]}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.label}>Audio File (MP3) *</Text>
      <TouchableOpacity style={styles.filePicker} onPress={pickAudio}>
        {audioFile ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.filePickerIcon}>🎵</Text>
            <Text style={styles.filePickerName}>{audioFile.name}</Text>
            <Text style={styles.filePickerChange}>மாற்ற tap பண்ணுங்க</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.filePickerIcon}>📁</Text>
            <Text style={styles.filePickerText}>MP3 file தேர்ந்தெடுக்க tap பண்ணுங்க</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.uploadBtn, loading && { opacity: 0.6 }]}
        onPress={handleUpload}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.uploadBtnText}>⬆️ Upload பண்ணு</Text>}
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
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 8, padding: 14, fontSize: 15, color: '#fff',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipScroll: { marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#333', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginVertical: 4,
  },
  chipActive: { backgroundColor: '#f0bc4222', borderColor: '#f0bc42' },
  chipIcon: { fontSize: 16 },
  chipTxt: { color: '#888', fontSize: 13 },
  filePicker: {
    backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#2a2a2a',
    borderStyle: 'dashed', borderRadius: 12, padding: 28, alignItems: 'center',
  },
  filePickerIcon: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  filePickerText: { color: '#666', fontSize: 14, textAlign: 'center' },
  filePickerName: { color: '#f0bc42', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  filePickerChange: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 4 },
  uploadBtn: { backgroundColor: '#f0bc42', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  uploadBtnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
  successContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successSub: { color: '#888', fontSize: 15 },
});
