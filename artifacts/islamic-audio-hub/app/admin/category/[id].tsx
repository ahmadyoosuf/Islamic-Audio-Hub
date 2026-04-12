import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Animated, Modal, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  getCategoryById,
  getTracksByCategory,
  deleteTrack,
  batchUpdateSortOrder,
  getSubcategoriesByCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  type UnifiedTrack,
  type StoredCategory,
  type StoredSubcategory,
} from '../../../data/unifiedStorage';

export default function AdminCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [category, setCategory] = useState<StoredCategory | null>(null);
  const [subcategories, setSubcategories] = useState<StoredSubcategory[]>([]);
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<StoredSubcategory | null>(null);
  const [subNameInput, setSubNameInput] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id])
  );

  async function load() {
    setLoading(true);
    const [cat, subs, trks] = await Promise.all([
      getCategoryById(id ?? ''),
      getSubcategoriesByCategory(id ?? ''),
      getTracksByCategory(id ?? ''),
    ]);
    setCategory(cat);
    setSubcategories(subs);
    setTracks(trks);
    setLoading(false);
  }

  const color = category?.color ?? '#f0bc42';

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

  function openAddSub() {
    setEditingSub(null);
    setSubNameInput('');
    setSubModalVisible(true);
  }

  function openEditSub(sub: StoredSubcategory) {
    setEditingSub(sub);
    setSubNameInput(sub.name);
    setSubModalVisible(true);
  }

  async function handleSaveSub() {
    if (!subNameInput.trim()) return;
    setSubSaving(true);
    if (editingSub) {
      await updateSubcategory(editingSub.id, { name: subNameInput.trim() });
    } else {
      await addSubcategory({ categoryId: id ?? '', name: subNameInput.trim(), sortOrder: subcategories.length + 1 });
    }
    const fresh = await getSubcategoriesByCategory(id ?? '');
    setSubcategories(fresh);
    setSubModalVisible(false);
    setSubSaving(false);
  }

  function handleDeleteSub(sub: StoredSubcategory) {
    Alert.alert('Subcategory நீக்கவா?', `"${sub.name}" நீக்க விரும்புகிறீர்களா? (Tracks unassigned ஆகும்)`, [
      { text: 'இல்லை', style: 'cancel' },
      {
        text: 'நீக்கு', style: 'destructive',
        onPress: async () => {
          await deleteSubcategory(sub.id);
          const fresh = await getSubcategoriesByCategory(id ?? '');
          setSubcategories(fresh);
          if (selectedSubId === sub.id) setSelectedSubId(null);
          const freshTracks = await getTracksByCategory(id ?? '');
          setTracks(freshTracks);
        },
      },
    ]);
  }

  const displayTracks = selectedSubId
    ? tracks.filter(t => t.subcategoryId === selectedSubId)
    : tracks;

  function renderItem({ item: track, drag, isActive, getIndex }: RenderItemParams<UnifiedTrack>) {
    const index = getIndex() ?? 0;
    const subName = subcategories.find(s => s.id === track.subcategoryId)?.name;
    return (
      <ScaleDecorator activeScale={1.03}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={drag}
          disabled={isActive}
          style={[styles.card, { borderLeftColor: color }, isActive && styles.cardActive]}
        >
          <TouchableOpacity onLongPress={drag} style={styles.dragHandle} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
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
              {subName && (
                <View style={[styles.badge, { backgroundColor: '#ffffff11' }]}>
                  <Text style={[styles.badgeTxt, { color: '#aaa' }]}>{subName}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {track.isBuiltIn ? 'Built-in' : 'Uploaded'}
              {track.fileName ? ` · ${track.fileName}` : ''}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: color + '66' }]}
              onPress={() => router.push(`/admin/edit-audio/${track.id}`)}
            >
              <Text style={[styles.actionTxt, { color }]}>✏️</Text>
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
      <View style={[styles.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{category?.name ?? id}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={() => router.push({ pathname: '/admin/upload-audio', params: { preselectedCategory: id } })}
        >
          <Text style={styles.addBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      {saving && (
        <Animated.View style={[styles.savedBanner, { opacity: saveAnim }]}>
          <Text style={styles.savedTxt}>✓ வரிசை சேமிக்கப்பட்டது</Text>
        </Animated.View>
      )}

      {subcategories.length > 0 || true ? (
        <View style={[styles.subBar, { borderBottomColor: color + '22' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subScroll}>
            <TouchableOpacity
              style={[styles.subChip, !selectedSubId && { backgroundColor: color + '33', borderColor: color }]}
              onPress={() => setSelectedSubId(null)}
            >
              <Text style={[styles.subChipTxt, !selectedSubId && { color }]}>அனைத்தும்</Text>
            </TouchableOpacity>
            {subcategories.map(sub => (
              <View key={sub.id} style={styles.subChipWrap}>
                <TouchableOpacity
                  style={[styles.subChip, selectedSubId === sub.id && { backgroundColor: color + '33', borderColor: color }]}
                  onPress={() => setSelectedSubId(sub.id)}
                >
                  <Text style={[styles.subChipTxt, selectedSubId === sub.id && { color }]}>{sub.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subChipEdit} onPress={() => openEditSub(sub)}>
                  <Text style={styles.subChipEditTxt}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subChipDel} onPress={() => handleDeleteSub(sub)}>
                  <Text style={styles.subChipDelTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.subChip, styles.subChipAdd]} onPress={openAddSub}>
              <Text style={[styles.subChipTxt, { color }]}>+ Subcategory</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={color} />
        </View>
      ) : (
        <>
          <View style={[styles.statsBar, { borderColor: color + '33' }]}>
            <Text style={[styles.statsTxt, { color }]}>
              {displayTracks.length} பாடங்கள் {selectedSubId ? '(filtered)' : ''}
            </Text>
            <Text style={styles.statsNote}>
              {tracks.filter(t => t.hasQuiz).length} Quiz · நீண்ட அழுத்தி இழுக்கவும்
            </Text>
          </View>

          {displayTracks.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyAddCard, { borderColor: color + '44' }]}
              onPress={() => router.push({ pathname: '/admin/upload-audio', params: { preselectedCategory: id } })}
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyAddIcon, { color }]}>+</Text>
              <Text style={[styles.emptyAddTxt, { color }]}>முதல் audio சேர்க்கவும்</Text>
            </TouchableOpacity>
          ) : (
            <DraggableFlatList
              data={displayTracks}
              onDragEnd={handleDragEnd}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              activationDistance={10}
            />
          )}
        </>
      )}

      <Modal
        visible={subModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingSub ? '✏️ Subcategory திருத்து' : '➕ Subcategory சேர்'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subcategory பெயர்"
              placeholderTextColor="#555"
              value={subNameInput}
              onChangeText={setSubNameInput}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSubModalVisible(false)}>
                <Text style={styles.modalCancelTxt}>ரத்து</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: color }, subSaving && { opacity: 0.6 }]}
                onPress={handleSaveSub}
                disabled={subSaving}
              >
                {subSaving
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.modalSaveTxt}>சேமி</Text>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  backBtn: { padding: 4 },
  backTxt: { fontSize: 18, fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  savedBanner: {
    backgroundColor: '#1a2a1a', borderBottomWidth: 1, borderBottomColor: '#2a4a2a',
    paddingVertical: 8, alignItems: 'center',
  },
  savedTxt: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
  subBar: { borderBottomWidth: 1 },
  subScroll: { padding: 10, gap: 6, flexDirection: 'row', alignItems: 'center' },
  subChip: {
    borderWidth: 1, borderColor: '#333', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  subChipTxt: { color: '#888', fontSize: 12, fontWeight: '600' },
  subChipWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  subChipEdit: { padding: 4 },
  subChipEditTxt: { fontSize: 12 },
  subChipDel: { padding: 4 },
  subChipDelTxt: { color: '#ff6b6b', fontSize: 12, fontWeight: '700' },
  subChipAdd: { borderStyle: 'dashed' },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  statsTxt: { fontSize: 13, fontWeight: '700' },
  statsNote: { color: '#666', fontSize: 11 },
  listContent: { padding: 12, gap: 8, paddingBottom: 80 },
  card: {
    backgroundColor: '#111', borderRadius: 10, borderLeftWidth: 3,
    paddingVertical: 12, paddingRight: 12, paddingLeft: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 2, elevation: 2,
  },
  cardActive: {
    backgroundColor: '#1a1a1a', shadowOpacity: 0.6, shadowRadius: 8,
    elevation: 8, borderWidth: 1, borderColor: '#333',
  },
  dragHandle: { paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  dragIcon: { fontSize: 22, color: '#444', lineHeight: 24 },
  numBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 12, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  cardMeta: { color: '#555', fontSize: 11 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  actionTxt: { fontSize: 13 },
  deleteBtn: { backgroundColor: '#ff444422', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  deleteTxt: { fontSize: 13 },
  emptyAddCard: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 40, margin: 16, alignItems: 'center', gap: 10, marginTop: 20,
  },
  emptyAddIcon: { fontSize: 36, fontWeight: '200' },
  emptyAddTxt: { fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24,
    width: '85%', borderWidth: 1, borderColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#333',
    borderRadius: 8, padding: 12, fontSize: 15, color: '#fff', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  modalCancelTxt: { color: '#888', fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalSaveTxt: { color: '#000', fontWeight: '800', fontSize: 14 },
});
