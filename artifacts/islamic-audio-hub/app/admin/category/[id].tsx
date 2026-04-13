import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getCategoryById,
  getAllTracks,
  getSubcategoriesByCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  type StoredCategory,
  type StoredSubcategory,
} from '../../../data/unifiedStorage';

export default function AdminCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [category, setCategory] = useState<StoredCategory | null>(null);
  const [subcategories, setSubcategories] = useState<StoredSubcategory[]>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<StoredSubcategory | null>(null);
  const [subNameInput, setSubNameInput] = useState('');
  const [subNameEnInput, setSubNameEnInput] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id])
  );

  async function load() {
    setLoading(true);
    const [cat, subs, tracks] = await Promise.all([
      getCategoryById(id ?? ''),
      getSubcategoriesByCategory(id ?? ''),
      getAllTracks(),
    ]);
    setCategory(cat);
    setSubcategories(subs);

    const catTracks = tracks.filter(t => t.categoryId === id);
    const counts: Record<string, number> = {};
    let unassigned = 0;
    for (const t of catTracks) {
      if (t.subcategoryId) {
        counts[t.subcategoryId] = (counts[t.subcategoryId] ?? 0) + 1;
      } else {
        unassigned++;
      }
    }
    setTrackCounts(counts);
    setUnassignedCount(unassigned);
    setLoading(false);
  }

  const color = category?.color ?? '#f0bc42';

  function openAddSub() {
    setEditingSub(null);
    setSubNameInput('');
    setSubNameEnInput('');
    setSubModalVisible(true);
  }

  function openEditSub(sub: StoredSubcategory) {
    setEditingSub(sub);
    setSubNameInput(sub.name);
    setSubNameEnInput(sub.nameEn ?? '');
    setSubModalVisible(true);
  }

  async function handleSaveSub() {
    if (!subNameInput.trim()) return;
    setSubSaving(true);
    try {
      const payload = {
        name: subNameInput.trim(),
        nameEn: subNameEnInput.trim() || undefined,
      };
      if (editingSub) {
        await updateSubcategory(editingSub.id, payload);
      } else {
        await addSubcategory({
          categoryId: id ?? '',
          sortOrder: subcategories.length + 1,
          ...payload,
        });
      }
      const fresh = await getSubcategoriesByCategory(id ?? '');
      setSubcategories(fresh);
      setSubModalVisible(false);
    } finally {
      setSubSaving(false);
    }
  }

  function handleDeleteSub(sub: StoredSubcategory) {
    Alert.alert(
      'Subcategory நீக்கவா?',
      `"${sub.name}" நீக்கினால் அதன் tracks unassigned ஆகும்.`,
      [
        { text: 'இல்லை', style: 'cancel' },
        {
          text: 'நீக்கு', style: 'destructive',
          onPress: async () => {
            await deleteSubcategory(sub.id);
            await load();
          },
        },
      ]
    );
  }

  const totalTracks = Object.values(trackCounts).reduce((s, n) => s + n, 0) + unassignedCount;

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={[styles.catEmoji]}>{category?.icon ?? '📂'}</Text>
          <Text style={styles.topTitle} numberOfLines={1}>{category?.name ?? id}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={() => router.push({
            pathname: '/admin/upload-audio',
            params: { preselectedCategory: id },
          })}
        >
          <Text style={styles.addBtnTxt}>+ Track</Text>
        </TouchableOpacity>
      </View>

      {/* Breadcrumb */}
      <View style={[styles.breadcrumb, { borderBottomColor: '#1a1a1a' }]}>
        <Text style={styles.bcItem} onPress={() => router.push('/admin')}>Admin</Text>
        <Text style={styles.bcSep}> › </Text>
        <Text style={[styles.bcItem, styles.bcActive, { color }]}>{category?.name ?? id}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={color} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Stats */}
          <View style={[styles.statsCard, { borderColor: color + '33' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color }]}>{subcategories.length}</Text>
              <Text style={styles.statLbl}>Subcategories</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color }]}>{totalTracks}</Text>
              <Text style={styles.statLbl}>Tracks</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: '#888' }]}>{unassignedCount}</Text>
              <Text style={styles.statLbl}>Unassigned</Text>
            </View>
          </View>

          {/* Subcategories section */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>📁 Subcategories</Text>
            <TouchableOpacity style={[styles.addSubBtn, { borderColor: color }]} onPress={openAddSub}>
              <Text style={[styles.addSubTxt, { color }]}>+ சேர்</Text>
            </TouchableOpacity>
          </View>

          {subcategories.length === 0 && (
            <TouchableOpacity
              style={[styles.emptyCard, { borderColor: color + '33' }]}
              onPress={openAddSub}
            >
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={[styles.emptyTxt, { color }]}>முதல் subcategory சேர்க்க tap பண்ணுங்க</Text>
            </TouchableOpacity>
          )}

          {subcategories.map(sub => {
            const count = trackCounts[sub.id] ?? 0;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subCard, { borderLeftColor: color }]}
                onPress={() => router.push(`/admin/subcategory/${sub.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.subIconBox, { backgroundColor: color + '22' }]}>
                  <Text style={styles.subIcon}>📁</Text>
                </View>
                <View style={styles.subInfo}>
                  <Text style={styles.subName}>{sub.name}</Text>
                  <Text style={styles.subMeta}>{count} பாடங்கள்</Text>
                </View>
                <View style={[styles.subCountBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.subCountTxt, { color }]}>{count}</Text>
                </View>
                <View style={styles.subActions}>
                  <TouchableOpacity
                    style={styles.subEditBtn}
                    onPress={e => { e.stopPropagation?.(); openEditSub(sub); }}
                  >
                    <Text style={styles.subEditTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.subDelBtn}
                    onPress={e => { e.stopPropagation?.(); handleDeleteSub(sub); }}
                  >
                    <Text style={styles.subDelTxt}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.subArrow, { color }]}>›</Text>
              </TouchableOpacity>
            );
          })}

          {/* Unassigned tracks shortcut */}
          {unassignedCount > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>📝 Unassigned Tracks</Text>
              </View>
              <TouchableOpacity
                style={[styles.subCard, { borderLeftColor: '#888' }]}
                onPress={() => router.push(`/admin/subcategory/unassigned?categoryId=${id}` as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.subIconBox, { backgroundColor: '#88888822' }]}>
                  <Text style={styles.subIcon}>📝</Text>
                </View>
                <View style={styles.subInfo}>
                  <Text style={styles.subName}>Subcategory இல்லாத Tracks</Text>
                  <Text style={styles.subMeta}>எந்த subcategory-லும் இல்லாதவை</Text>
                </View>
                <View style={[styles.subCountBadge, { backgroundColor: '#88888822' }]}>
                  <Text style={[styles.subCountTxt, { color: '#888' }]}>{unassignedCount}</Text>
                </View>
                <Text style={[styles.subArrow, { color: '#888' }]}>›</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* Add/Edit Subcategory Modal */}
      <Modal
        visible={subModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSubModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingSub ? '✏️ Subcategory திருத்து' : '➕ Subcategory சேர்'}
            </Text>
            <Text style={styles.modalLabel}>English Title (Main)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Surah Al-Fatiha"
              placeholderTextColor="#555"
              value={subNameEnInput}
              onChangeText={setSubNameEnInput}
              autoFocus
            />
            <Text style={styles.modalLabel}>தமிழ் தலைப்பு (Subtitle)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subcategory பெயர்"
              placeholderTextColor="#555"
              value={subNameInput}
              onChangeText={setSubNameInput}
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
                  : <Text style={styles.modalSaveTxt}>சேமி</Text>}
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
  backBtn: { padding: 4, minWidth: 64 },
  backTxt: { fontSize: 17, fontWeight: '600' },
  topCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  catEmoji: { fontSize: 18 },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 12, fontWeight: '800' },
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 8, borderBottomWidth: 1,
  },
  bcItem: { color: '#888', fontSize: 12 },
  bcSep: { color: '#444', fontSize: 12 },
  bcActive: { fontWeight: '700' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16 },
  statsCard: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 12,
    backgroundColor: '#111', marginBottom: 20, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: '#222' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addSubBtn: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  addSubTxt: { fontSize: 12, fontWeight: '700' },
  emptyCard: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 32, alignItems: 'center', gap: 8, marginBottom: 16,
  },
  emptyIcon: { fontSize: 32 },
  emptyTxt: { fontSize: 13, fontWeight: '600' },
  subCard: {
    backgroundColor: '#111', borderRadius: 12, marginBottom: 10,
    borderLeftWidth: 3, borderWidth: 1, borderColor: '#1e1e1e',
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  subIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subIcon: { fontSize: 20 },
  subInfo: { flex: 1 },
  subName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  subMeta: { color: '#555', fontSize: 12, marginTop: 2 },
  subCountBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 32, alignItems: 'center' },
  subCountTxt: { fontSize: 14, fontWeight: '800' },
  subActions: { flexDirection: 'row', gap: 4 },
  subEditBtn: { padding: 7, borderRadius: 6, backgroundColor: '#ffffff11', borderWidth: 1, borderColor: '#333' },
  subEditTxt: { fontSize: 13 },
  subDelBtn: { padding: 7, borderRadius: 6, backgroundColor: '#ff444411', borderWidth: 1, borderColor: '#44111122' },
  subDelTxt: { fontSize: 13 },
  subArrow: { fontSize: 22, fontWeight: '300', marginLeft: 2 },
  modalOverlay: {
    flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24,
    width: '85%', borderWidth: 1, borderColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  modalLabel: { color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  modalInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#333',
    borderRadius: 8, padding: 12, fontSize: 15, color: '#fff', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, padding: 12, borderRadius: 8, borderWidth: 1,
    borderColor: '#333', alignItems: 'center',
  },
  modalCancelTxt: { color: '#888', fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalSaveTxt: { color: '#000', fontWeight: '800', fontSize: 14 },
});
