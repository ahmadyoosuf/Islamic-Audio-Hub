import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, TRACKS } from '../../data/categories';
import { getCustomTracks, getCustomQuizzes, type CustomTrack } from '../../data/customStorage';

const CAT_ICONS: Record<string, string> = {
  quran: '📖',
  hadith: '📜',
  iman: '✨',
  seerah: '🌙',
  daily: '☀️',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('');
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const [quizCount, setQuizCount] = useState(0);

  useEffect(() => { loadSession(); }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  async function loadSession() {
    try {
      const raw = await AsyncStorage.getItem('admin_session');
      if (raw) {
        const session = JSON.parse(raw);
        setAdminEmail(session.email);
      }
    } catch {}
  }

  async function loadStats() {
    const [tracks, quizzes] = await Promise.all([getCustomTracks(), getCustomQuizzes()]);
    setCustomTracks(tracks);
    setQuizCount(quizzes.length);
  }

  function handleLogout() {
    Alert.alert(
      'வெளியேறு',
      'Admin-ஆக வெளியேற விரும்புகிறீர்களா?',
      [
        { text: 'இல்லை', style: 'cancel' },
        {
          text: 'ஆமா',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('admin_session');
            router.replace('/admin/login');
          },
        },
      ]
    );
  }

  const totalTracks = TRACKS.length + customTracks.length;

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
          <Text style={[styles.statVal, { color: '#f0bc42' }]}>{CATEGORIES.length}</Text>
          <Text style={styles.statLbl}>Categories</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#4CAF50' }]}>
          <Text style={[styles.statVal, { color: '#4CAF50' }]}>{totalTracks}</Text>
          <Text style={styles.statLbl}>Total Tracks</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#9C27B0' }]}>
          <Text style={[styles.statVal, { color: '#9C27B0' }]}>{customTracks.length}</Text>
          <Text style={styles.statLbl}>Uploaded</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#2196F3' }]}>
          <Text style={[styles.statVal, { color: '#2196F3' }]}>{quizCount}</Text>
          <Text style={styles.statLbl}>Quizzes</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>📂 Categories — Audio Content</Text>
      <Text style={styles.sectionSub}>Category tap பண்ணி audio manage செய்யுங்க</Text>

      {CATEGORIES.map(cat => {
        const builtInCount = TRACKS.filter(t => t.categoryId === cat.id).length;
        const customCount = customTracks.filter(t => t.categoryId === cat.id).length;
        const total = builtInCount + customCount;
        return (
          <TouchableOpacity
            key={cat.id}
            style={styles.catCard}
            onPress={() => router.push(`/admin/category/${cat.id}`)}
            activeOpacity={0.75}
          >
            <View style={[styles.catIconBox, { backgroundColor: cat.color + '22' }]}>
              <Text style={styles.catIcon}>{CAT_ICONS[cat.id] ?? '🎵'}</Text>
            </View>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catMeta}>
                {builtInCount} built-in
                {customCount > 0 ? ` · ${customCount} uploaded` : ''}
              </Text>
            </View>
            <View style={styles.catRight}>
              <View style={[styles.catBadge, { backgroundColor: cat.color + '22' }]}>
                <Text style={[styles.catBadgeText, { color: cat.color }]}>{total}</Text>
              </View>
              <Text style={styles.catArrow}>›</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#f0bc42' },
  headerSub: { fontSize: 12, color: '#555', marginTop: 3 },
  logoutBtn: {
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#4a1515',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#ff6b6b', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#222',
  },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLbl: { fontSize: 9, color: '#666', textAlign: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#555',
    marginBottom: 16,
  },
  catCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  catIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIcon: { fontSize: 26 },
  catInfo: { flex: 1 },
  catName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  catMeta: { color: '#555', fontSize: 12, marginTop: 3 },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  catBadgeText: { fontSize: 14, fontWeight: '800' },
  catArrow: { color: '#444', fontSize: 24, fontWeight: '300' },
});
