import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  getCategoryById,
  getSubcategoriesByCategory,
  getAllTracks,
  deleteTrack,
  batchUpdateSortOrder,
  type UnifiedTrack,
  type StoredCategory,
  type StoredSubcategory,
} from '../../../data/unifiedStorage';

export default function AdminSubcategoryScreen() {
  const router = useRouter();
  const { id, categoryId: qCategoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();

  const isUnassigned = id === 'unassigned';

  const [category, setCategory] = useState<StoredCategory | null>(null);
  const [subcategory, setSubcategory] = useState<StoredSubcategory | null>(null);
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id, qCategoryId])
  );

  async function load() {
    setLoading(true);
    try {
      let catId = qCategoryId ?? '';
      let sub: StoredSubcategory | null = null;
      let cat: StoredCategory | null = null;

      if (!isUnassigned) {
        // Find the subcategory across all categories
        const allTracks = await getAllTracks();
        const track = allTracks.find(t => t.subcategoryId === id);
        catId = track?.categoryId ?? qCategoryId ?? '';

        // Get all subcategories to find this one
        if (catId) {
          const subs = await getSubcategoriesByCategory(catId);
          sub = subs.find(s => s.id === id) ?? null;
        }
      }

      if (catId) {
        cat = await getCategoryById(catId);
      }

      setCategory(cat);
      setSubcategory(sub);

      const all = await getAllTracks();
      let filtered: UnifiedTrack[];
      if (isUnassigned) {
        filtered = all
          .filter(t => t.categoryId === catId && !t.subcategoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      } else {
        filtered = all
          .filter(t => t.subcategoryId === id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }
      setTracks(filtered);
    } finally {
      setLoading(false);
    }
  }

  const color = category?.color ?? '#f0bc42';

  function flashSave() {
    setSaving(true);
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(saveAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaving(false));
  }

  async function handleDragEnd({ data }: { data: UnifiedTrack[] }) {
    setTracks(data);
    await batchUpdateSortOrder(data.map((t, i) => ({ id: t.id, sortOrder: i + 1 })));
    flashSave();
  }

  function handleDelete(track: UnifiedTrack) {
    Alert.alert('நீக்கவா?', `"${track.title}" நீக்க விரும்புகிறீர்களா?`, [
      { text: 'இல்லை', style: 'cancel' },
      {
        text: 'நீக்கு', style: 'destructive',
        onPress: async () => {
          await deleteTrack(track.id);
          setTracks(prev => prev.filter(t => t.id !== track.id));
        },
      },
    ]);
  }

  const screenTitle = isUnassigned
    ? 'Unassigned Tracks'
    : (subcategory?.name ?? id);

  function renderItem({ item: track, drag, isActive, getIndex }: RenderItemParams<UnifiedTrack>) {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={1.03}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={drag}
          disabled={isActive}
          style={[styles.card, { borderLeftColor: color }, isActive && styles.cardActive]}
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
                <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.badgeTxt, { color }]}>Quiz</Text>
                </View>
              )}
              {track.isBuiltIn && (
                <View style={[styles.badge, { backgroundColor: '#ffffff11' }]}>
                  <Text style={[styles.badgeTxt, { color: '#666' }]}>Built-in</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {track.fileName ?? (track.isBuiltIn ? 'Online audio' : 'No file')}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: color + '66' }]}
              onPress={() => router.push(`/admin/edit-audio/${track.id}` as any)}
            >
              <Text style={[styles.editBtnTxt, { color }]}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(track)}>
              <Text style={styles.deleteTxt}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{screenTitle}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={() => router.push({
            pathname: '/admin/upload-audio',
            params: { preselectedCategory: category?.id ?? '' },
          })}
        >
          <Text style={styles.addBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      {/* Breadcrumb */}
      <View style={[styles.breadcrumb, { borderBottomColor: '#1a1a1a' }]}>
        <Text style={styles.bcItem} onPress={() => router.push('/admin')}>Admin</Text>
        <Text style={styles.bcSep}> › </Text>
        <Text
          style={styles.bcItem}
          onPress={() => category ? router.push(`/admin/category/${category.id}` as any) : undefined}
        >
          {category?.name ?? '...'}
        </Text>
        <Text style={styles.bcSep}> › </Text>
        <Text style={[styles.bcItem, styles.bcActive, { color }]}>{screenTitle}</Text>
      </View>

      {/* Save flash banner */}
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
          <View style={[styles.statsBar, { borderBottomColor: color + '33' }]}>
            <Text style={[styles.statsTxt, { color }]}>{tracks.length} பாடங்கள்</Text>
            <Text style={styles.statsNote}>நீண்ட அழுத்தி இழுத்து வரிசை மாற்றலாம்</Text>
          </View>

          {tracks.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyCard, { borderColor: color + '44' }]}
              onPress={() => router.push({
                pathname: '/admin/upload-audio',
                params: { preselectedCategory: category?.id ?? '' },
              })}
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyIcon, { color }]}>+</Text>
              <Text style={[styles.emptyTxt, { color }]}>முதல் audio சேர்க்கவும்</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#0e0e0e', borderBottomWidth: 1,
  },
  backBtn: { padding: 4, minWidth: 64 },
  backTxt: { fontSize: 17, fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  bcItem: { color: '#888', fontSize: 12 },
  bcSep: { color: '#444', fontSize: 12 },
  bcActive: { fontWeight: '700' },
  savedBanner: {
    backgroundColor: '#1a2a1a', borderBottomWidth: 1, borderBottomColor: '#2a4a2a',
    paddingVertical: 8, alignItems: 'center',
  },
  savedTxt: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  statsTxt: { fontSize: 13, fontWeight: '700' },
  statsNote: { color: '#555', fontSize: 11 },
  listContent: { padding: 12, gap: 8, paddingBottom: 80 },
  card: {
    backgroundColor: '#111', borderRadius: 10, borderLeftWidth: 3,
    paddingVertical: 12, paddingRight: 12, paddingLeft: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#1e1e1e',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 2, elevation: 2,
  },
  cardActive: {
    backgroundColor: '#1a1a1a', shadowOpacity: 0.6, shadowRadius: 8, elevation: 8,
    borderColor: '#333',
  },
  dragHandle: { paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  dragIcon: { fontSize: 22, color: '#444', lineHeight: 24 },
  numBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 12, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardTitle: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  cardMeta: { color: '#555', fontSize: 11 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  editBtnTxt: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#ff444422', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  deleteTxt: { fontSize: 13 },
  emptyCard: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 40, margin: 16, alignItems: 'center', gap: 10, marginTop: 20,
  },
  emptyIcon: { fontSize: 36, fontWeight: '200' },
  emptyTxt: { fontSize: 14, fontWeight: '600' },
});
