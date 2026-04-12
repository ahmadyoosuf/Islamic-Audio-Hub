import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllCategories,
  deleteCategory,
  getAllTracks,
  getAllQuizzes,
  getCategoryTrackCounts,
  type StoredCategory,
} from '../../data/unifiedStorage';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('');
  const [totalTracks, setTotalTracks] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [categories, setCategories] = useState<StoredCategory[]>([]);
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      loadSession();
      loadStats();
    }, [])
  );

  async function loadSession() {
    try {
      const raw = await AsyncStorage.getItem('admin_session');
      if (raw) setAdminEmail(JSON.parse(raw).email ?? '');
    } catch {}
  }

  async function loadStats() {
    const [cats, tracks, quizzes, counts] = await Promise.all([
      getAllCategories(),
      getAllTracks(),
      getAllQuizzes(),
      getCategoryTrackCounts(),
    ]);
    setCategories(cats);
    setTotalTracks(tracks.length);
    setQuizCount(quizzes.length);
    setCatCounts(counts);
  }

  function handleLogout() {
    Alert.alert('வெளியேறு', 'Admin-ஆக வெளியேற விரும்புகிறீர்களா?', [
      { text: 'இல்லை', style: 'cancel' },
      {
        text: 'ஆமா', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('admin_session');
          router.replace('/admin/login');
        },
      },
    ]);
  }

  function handleDeleteCategory(cat: StoredCategory) {
    Alert.alert(
      'Category நீக்கவா?',
      `"${cat.name}" மற்றும் அதன் அனைத்து tracks-ஐயும் நீக்க விரும்புகிறீர்களா?`,
      [
        { text: 'இல்லை', style: 'cancel' },
        {
          text: 'நீக்கு', style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            await loadStats();
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin CMS</Text>
          <Text style={styles.headerSub}>{adminEmail}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>வெளியேறு</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: '#f0bc42' }]}>
          <Text style={[styles.statVal, { color: '#f0bc42' }]}>{categories.length}</Text>
          <Text style={styles.statLbl}>Categories</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#4CAF50' }]}>
          <Text style={[styles.statVal, { color: '#4CAF50' }]}>{totalTracks}</Text>
          <Text style={styles.statLbl}>Tracks</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#9C27B0' }]}>
          <Text style={[styles.statVal, { color: '#9C27B0' }]}>{quizCount}</Text>
          <Text style={styles.statLbl}>Quizzes</Text>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>📂 Categories — Audio Content</Text>
          <Text style={styles.sectionSub}>அனைத்து பிரிவுகளும் database-ல் உள்ளன</Text>
        </View>
        <TouchableOpacity
          style={styles.addCatBtn}
          onPress={() => router.push('/admin/manage-category' as any)}
        >
          <Text style={styles.addCatBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      {categories.map(cat => {
        const count = catCounts[cat.id] ?? 0;
        return (
          <View key={cat.id} style={[styles.catRow, { borderLeftColor: cat.color }]}>
            <TouchableOpacity
              style={styles.catMain}
              onPress={() => router.push(`/admin/category/${cat.id}`)}
              activeOpacity={0.75}
            >
              <View style={[styles.catIconBox, { backgroundColor: cat.color + '22' }]}>
                <Text style={styles.catIcon}>{cat.icon}</Text>
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catMeta}>{count} பாடங்கள்</Text>
              </View>
              <View style={[styles.catBadge, { backgroundColor: cat.color + '22' }]}>
                <Text style={[styles.catBadgeText, { color: cat.color }]}>{count}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.catActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push(`/admin/manage-category?id=${cat.id}` as any)}
              >
                <Text style={[styles.editBtnTxt, { color: cat.color }]}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteCategory(cat)}
              >
                <Text style={styles.deleteBtnTxt}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {categories.length === 0 && (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => router.push('/admin/manage-category' as any)}
        >
          <Text style={styles.emptyIcon}>➕</Text>
          <Text style={styles.emptyTxt}>முதல் category சேர்க்க tap பண்ணுங்க</Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>📚 Library CMS</Text>
      <Text style={styles.sectionSub}>Hierarchical: Categories → Subcategories → Cards → Tracks</Text>

      <TouchableOpacity
        style={styles.cmsCard}
        onPress={() => router.push('/admin/cms' as any)}
        activeOpacity={0.75}
      >
        <View style={[styles.catIconBox, { backgroundColor: '#9C27B022' }]}>
          <Text style={styles.catIcon}>📚</Text>
        </View>
        <View style={styles.catInfo}>
          <Text style={styles.catName}>Library Management</Text>
          <Text style={styles.catMeta}>Categories, Subcategories, Cards, Tracks, Quiz</Text>
        </View>
        <Text style={[styles.catArrow, { color: '#9C27B0' }]}>›</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#f0bc42' },
  headerSub: { fontSize: 12, color: '#555', marginTop: 3 },
  logoutBtn: {
    backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: '#4a1515',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  logoutText: { color: '#ff6b6b', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: '#141414', borderRadius: 10, padding: 12,
    alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: '#222',
  },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLbl: { fontSize: 9, color: '#666', textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sectionSub: { fontSize: 12, color: '#555', marginBottom: 14, marginTop: 2 },
  addCatBtn: {
    backgroundColor: '#f0bc42', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  addCatBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  catRow: {
    backgroundColor: '#141414',
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  catMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  catIconBox: {
    width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  catIcon: { fontSize: 24 },
  catInfo: { flex: 1 },
  catName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  catMeta: { color: '#555', fontSize: 12, marginTop: 2 },
  catBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 32, alignItems: 'center',
  },
  catBadgeText: { fontSize: 14, fontWeight: '800' },
  catActions: { flexDirection: 'row', paddingRight: 10, gap: 4 },
  editBtn: {
    padding: 8, borderRadius: 6,
    backgroundColor: '#ffffff11', borderWidth: 1, borderColor: '#333',
  },
  editBtnTxt: { fontSize: 14 },
  deleteBtn: {
    padding: 8, borderRadius: 6,
    backgroundColor: '#ff444411', borderWidth: 1, borderColor: '#44111122',
  },
  deleteBtnTxt: { fontSize: 14 },
  emptyCard: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#f0bc4444',
    borderRadius: 12, paddingVertical: 32, alignItems: 'center', gap: 8, marginBottom: 10,
  },
  emptyIcon: { fontSize: 32 },
  emptyTxt: { color: '#f0bc42', fontSize: 14 },
  catArrow: { fontSize: 24, fontWeight: '300' },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: 20 },
  cmsCard: {
    backgroundColor: '#0e0a18', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#9C27B033',
  },
});
