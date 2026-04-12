import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { saveCustomTrack } from '../../data/customStorage';
import { CATEGORIES } from '../../data/categories';

export default function UploadAudioScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('quran');
  const [audioFile, setAudioFile] = useState<{ uri: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setAudioFile({ uri: asset.uri, name: asset.name });
      }
    } catch {
      Alert.alert('பிழை', 'Audio file தேர்ந்தெடுக்க முடியவில்லை');
    }
  }

  async function handleUpload() {
    if (!title.trim()) {
      Alert.alert('தவறு', 'Title உள்ளிடுங்க');
      return;
    }
    if (!audioFile) {
      Alert.alert('தவறு', 'Audio file தேர்ந்தெடுங்க');
      return;
    }

    setLoading(true);

    try {
      const selectedCategory = CATEGORIES.find(c => c.id === categoryId);
      const track = {
        id: `custom_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        categoryId,
        categoryName: selectedCategory?.name || categoryId,
        audioUri: audioFile.uri,
        fileName: audioFile.name,
        uploadedAt: Date.now(),
        duration: 0,
      };

      await saveCustomTrack(track);
      setSuccess(true);

      setTimeout(() => {
        router.back();
      }, 2000);
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              categoryId === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color },
            ]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={[styles.categoryChipText, categoryId === cat.id && { color: cat.color }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Audio File (MP3) *</Text>
      <TouchableOpacity style={styles.filePicker} onPress={pickAudio}>
        {audioFile ? (
          <View>
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
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.uploadBtnText}>⬆️ Upload பண்ணு</Text>
        )}
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
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#fff',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { marginBottom: 4 },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginVertical: 4,
  },
  categoryChipText: { color: '#888', fontSize: 13 },
  filePicker: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  filePickerIcon: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  filePickerText: { color: '#666', fontSize: 14, textAlign: 'center' },
  filePickerName: { color: '#f0bc42', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  filePickerChange: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 4 },
  uploadBtn: {
    backgroundColor: '#f0bc42',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  uploadBtnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
  successContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { color: '#4CAF50', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  successSub: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 8 },
});
