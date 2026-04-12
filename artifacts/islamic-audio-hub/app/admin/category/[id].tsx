import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { CATEGORIES } from '../../../data/categories';
import {
  getTracksByCategory,
  deleteTrack,
  batchUpdateSortOrder,
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
  const [saving, setSaving] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getTracksByCategory(id ?? '').then(result => {
        setTracks(result);
        setLoading(false);
      });
    }, [id])
  );

  function flashSave() {
    setSaving(true);
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(saveAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaving(false));
  }

  async function handleDragEnd({ data }: { data: UnifiedTrack[] }) {
    setTracks(data);
    const updates = data.map((t, i) => ({ id: t.id, sortOrder: i + 1 }));
    await batchUpdateSortOrder(updates);
    flashSave();
  }

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

  function renderItem({ item: track, drag, isActive, getIndex }: RenderItemParams<UnifiedTrack>) {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={1.03}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.card,
            { borderLeftColor: color },
            isActive && styles.cardActive,
          ]}
        >
          <TouchableOpacity
            onLongPress={drag}
            style={styles.dragHandle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.dragIcon, isActive && { color }]}>⠿</Text>
          </TouchableOpacity>

          <View style={[styles.numBox, { backgroundColor: color + '22' }]}>
            <Text style={[styles.numTxt, { color }]}>{index + 1}</Text>
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
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: color + '66' }]}
              onPress={() => handleEdit(track.id)}
            >
              <Text style={[styles.actionTxt, { color }]}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(track)}
            >
              <Text style={styles.deleteTxt}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
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

      {saving && (
        <Animated.View style={[styles.savedBanner, { opacity: saveAnim }]}>
          <Text style={styles.savedTxt}>✓ வரிசை சேமிக்கப்பட்டது</Text>
        </Animated.View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={color} />
        </View>
      ) : (
        <>
          <View style={[styles.statsBar, { borderColor: color + '33' }]}>
            <Text style={[styles.statsTxt, { color }]}>
              மொத்தம் {tracks.length} பாடங்கள்
            </Text>
            <Text style={styles.statsNote}>
              {tracks.filter(t => t.hasQuiz).length} Quiz உள்ளன · நீண்ட அழுத்தி இழுக்கவும்
            </Text>
          </View>

          {tracks.length === 0 ? (
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
          ) : (
            <DraggableFlatList
              data={tracks}
              onDragEnd={handleDragEnd}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              activationDistance={10}
            />
          )}
        </>
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
  savedBanner: {
    backgroundColor: '#1a2a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a4a2a',
    paddingVertical: 8,
    alignItems: 'center',
  },
  savedTxt: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statsTxt: { fontSize: 13, fontWeight: '700' },
  statsNote: { color: '#666', fontSize: 11 },
  listContent: { padding: 12, gap: 8, paddingBottom: 80 },
  card: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  cardActive: {
    backgroundColor: '#1a1a1a',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dragHandle: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIcon: {
    fontSize: 22,
    color: '#444',
    lineHeight: 24,
  },
  numBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTxt: { fontSize: 12, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  quizBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  quizBadgeTxt: { fontSize: 10, fontWeight: '700' },
  cardMeta: { color: '#555', fontSize: 11 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionTxt: { fontSize: 13 },
  deleteBtn: {
    backgroundColor: '#ff444422',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deleteTxt: { fontSize: 13 },
  emptyAddCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    margin: 16,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyAddIcon: { fontSize: 36, fontWeight: '200' },
  emptyAddTxt: { fontSize: 14, fontWeight: '600' },
});
