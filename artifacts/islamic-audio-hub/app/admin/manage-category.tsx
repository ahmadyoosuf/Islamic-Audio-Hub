import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getAllCategories,
  addCategory,
  updateCategory,
  getCategoryById,
  type StoredCategory,
} from '../../data/unifiedStorage';

const PRESET_ICONS = [
  '📖','📜','✨','🌙','☀️','🕌','🤲','📿','⭐','🌟',
  '💛','🎵','🎓','📚','💡','🌿','🕋','📝','🎙️','🏆',
  '❤️','🌸','🔑','🌺',
];

const PRESET_COLORS = [
  '#f0bc42','#4ade80','#60a5fa','#f472b6','#fb923c',
  '#a78bfa','#34d399','#f87171','#38bdf8','#fbbf24',
  '#e879f9','#2dd4bf',
];

export default function ManageCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [color, setColor] = useState('#f0bc42');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useFocusEffect(
    useCallback(() => {
      if (!isEdit) return;
      setLoadingData(true);
      getCategoryById(id).then(cat => {
        if (cat) {
          setName(cat.name);
          setIcon(cat.icon);
          setColor(cat.color);
          setDescription(cat.description ?? '');
        }
        setLoadingData(false);
      });
    }, [id, isEdit])
  );

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('தவறு', 'Category பெயர் உள்ளிடுங்க');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        const all = await getAllCategories();
        await updateCategory(id, {
          name: name.trim(),
          icon,
          color,
          description: description.trim() || undefined,
        });
      } else {
        const all = await getAllCategories();
        await addCategory({
          name: name.trim(),
          icon,
          color,
          description: description.trim() || undefined,
          sortOrder: all.length + 1,
        });
      }
      router.back();
    } catch {
      Alert.alert('பிழை', 'சேமிக்க முடியவில்லை');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#f0bc42" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? '✏️ Category திருத்து' : '➕ புதிய Category'}</Text>
      </View>

      <View style={[styles.preview, { borderColor: color + '66', backgroundColor: color + '11' }]}>
        <Text style={styles.previewIcon}>{icon}</Text>
        <View>
          <Text style={[styles.previewName, { color }]}>{name || 'Category பெயர்...'}</Text>
          {description ? <Text style={styles.previewDesc} numberOfLines={1}>{description}</Text> : null}
        </View>
      </View>

      <Text style={styles.label}>Category பெயர் *</Text>
      <TextInput
        style={styles.input}
        placeholder="எ.கா. குர்ஆன் விளக்கம்"
        placeholderTextColor="#555"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>விளக்கம் (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Short description..."
        placeholderTextColor="#555"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={2}
      />

      <Text style={styles.label}>Icon தேர்ந்தெடு</Text>
      <View style={styles.iconGrid}>
        {PRESET_ICONS.map(e => (
          <TouchableOpacity
            key={e}
            style={[styles.iconBtn, icon === e && { backgroundColor: color + '33', borderColor: color }]}
            onPress={() => setIcon(e)}
          >
            <Text style={styles.iconEmoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>நிறம் தேர்ந்தெடு</Text>
      <View style={styles.colorRow}>
        {PRESET_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: color }, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.saveBtnTxt}>{isEdit ? '✓ புதுப்பி' : '➕ சேர்'}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 52, paddingBottom: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  back: { color: '#f0bc42', fontSize: 18, fontWeight: '600' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  previewIcon: { fontSize: 36 },
  previewName: { fontSize: 16, fontWeight: '800' },
  previewDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 18 },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#fff',
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 24 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  saveBtn: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
});
