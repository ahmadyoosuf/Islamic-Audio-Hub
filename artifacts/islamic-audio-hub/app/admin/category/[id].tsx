import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CATEGORIES } from '../../../data/categories';
import {
  getTracksByCategory,
  deleteTrack,
  type UnifiedTrack,
} from '../../../data/unifiedStorage';

const CAT_COLORS: Record<string, string> = {
  quran: '#f0bc42',
  hadith: '#4CAF50',
  iman: '#2196F3',
  seerah: '#9C27B0',
  daily: '#FF5722',
};

export default function AdminCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = CATEGORIES.find(c => c.id === id);
  const color = CAT_COLORS[id ?? ''] ?? '#f0bc42';

  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getTracksByCategory(id ?? '').then(result => {
        setTracks(result);
        setLoading(false);
      });
    }, [id])
  );

  function handleDelete(track: UnifiedTrack) {
    Alert.alert(
      'நீக்கவா?',
      `"${track.title}" audio-ஐ நீக்க விரும்புகிறீர்களா?`,
      [
        { text: 'இல்லை', style: 'cancel' },
        {
          text: 'நீக்கு',
          style: 'destructive',
          onPress: async () => {
            await deleteTrack(track.id);
            setTracks(prev => prev.filter(t => t.id !== track.id));
          },
        },
      ]
    );
  }

  function handleEdit(trackId: string) {
    router.push(`/admin/edit-audio/${trackId}`);
  }

  function handleAddNew() {
    router.push({
      pathname: '/admin/upload-audio',
      params: { preselectedCategory: id },
    });
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{category?.name ?? id}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: color }]} onPress={handleAddNew}>
          <Text style={styles.addBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={color} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.statsBar, { borderColor: color + '33' }]}>
            <Text style={[styles.statsTxt, { color }]}>
              மொத்தம் {tracks.length} பாடங்கள்
            </Text>
            <Text style={styles.statsNote}>
              {tracks.filter(t => t.hasQuiz).length} Quiz உள்ளன
            </Text>
          </View>

          {tracks.map((track, i) => (
            <View key={track.id} style={[styles.card, { borderLeftColor: color }]}>
              <View style={styles.cardLeft}>
                <View style={[styles.numBox, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.numTxt, { color }]}>{i + 1}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{track.title}</Text>
                    {track.hasQuiz && (
                      <View style={[styles.quizBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[styles.quizBadgeTxt, { color }]}>Quiz</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {track.isBuiltIn ? 'Built-in' : 'Admin Upload'}
                    {track.fileName ? ` · ${track.fileName}` : ''}
                    {track.description ? ` · ${track.description}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: color + '66' }]}
                  onPress={() => handleEdit(track.id)}
                >
                  <Text style={[styles.actionTxt, { color }]}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(track)}
                >
                  <Text style={styles.deleteTxt}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {tracks.length === 0 && (
            <TouchableOpacity
              style={[styles.emptyAddCard, { borderColor: color + '44' }]}
              onPress={handleAddNew}
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyAddIcon, { color }]}>+</Text>
              <Text style={[styles.emptyAddTxt, { color }]}>
                இந்த category-ல முதல் audio-ஐ சேர்க்கவும்
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: '#0e0e0e',
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 18, fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  statsTxt: { fontSize: 14, fontWeight: '700' },
  statsNote: { color: '#777', fontSize: 12 },
  card: {
    backgroundColor: '#111',
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  numBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 13, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  quizBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  quizBadgeTxt: { fontSize: 10, fontWeight: '700' },
  cardMeta: { color: '#666', fontSize: 11 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionTxt: { fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#ff444422',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteTxt: { fontSize: 14 },
  emptyAddCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyAddIcon: { fontSize: 36, fontWeight: '200' },
  emptyAddTxt: { fontSize: 14, fontWeight: '600' },
});
