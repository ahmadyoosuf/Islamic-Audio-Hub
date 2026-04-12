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
import { getCustomTracks, getCustomQuizzes, deleteCustomTrack, deleteCustomQuiz, type CustomTrack, type CustomQuiz } from '../../data/customStorage';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('');
  const [loginTime, setLoginTime] = useState('');
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);

  useEffect(() => {
    loadSession();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomData();
    }, [])
  );

  async function loadSession() {
    try {
      const raw = await AsyncStorage.getItem('admin_session');
      if (raw) {
        const session = JSON.parse(raw);
        setAdminEmail(session.email);
        const date = new Date(session.loginTime);
        setLoginTime(date.toLocaleString());
      }
    } catch {}
  }

  async function loadCustomData() {
    const [tracks, quizzes] = await Promise.all([getCustomTracks(), getCustomQuizzes()]);
    setCustomTracks(tracks);
    setCustomQuizzes(quizzes);
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

  async function handleDeleteTrack(id: string) {
    Alert.alert('நீக்கவா?', 'இந்த audio-ஐ நீக்க விரும்புகிறீர்களா?', [
      { text: 'இல்லை', style: 'cancel' },
      {
        text: 'நீக்கு',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomTrack(id);
          loadCustomData();
        },
      },
    ]);
  }

  async function handleDeleteQuiz(id: string) {
    Alert.alert('நீக்கவா?', 'இந்த quiz-ஐ நீக்க விரும்புகிறீர்களா?', [
      { text: 'இல்லை', style: 'cancel' },
      {
        text: 'நீக்கு',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomQuiz(id);
          loadCustomData();
        },
      },
    ]);
  }

  const totalTracks = TRACKS.length + customTracks.length;
  const totalCategories = CATEGORIES.length;
  const totalQuizzes = customQuizzes.length;

  const stats = [
    { label: 'Categories', value: totalCategories, icon: '📂', color: '#f0bc42' },
    { label: 'Tracks', value: totalTracks, icon: '🎵', color: '#4CAF50' },
    { label: 'Custom Quizzes', value: totalQuizzes, icon: '🎮', color: '#2196F3' },
    { label: 'Uploaded', value: customTracks.length, icon: '⬆️', color: '#9C27B0' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Islamic Audio Hub</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>வெளியேறு</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.profileIcon}>👤</Text>
        <View>
          <Text style={styles.profileEmail}>{adminEmail}</Text>
          <Text style={styles.profileTime}>உள்நுழைந்த நேரம்: {loginTime}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: '#f0bc42' }]}
          onPress={() => router.push('/admin/upload-audio')}
        >
          <Text style={styles.actionBtnIcon}>🎵</Text>
          <Text style={[styles.actionBtnText, { color: '#f0bc42' }]}>Audio Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: '#2196F3' }]}
          onPress={() => router.push('/admin/add-quiz')}
        >
          <Text style={styles.actionBtnIcon}>🎮</Text>
          <Text style={[styles.actionBtnText, { color: '#2196F3' }]}>Quiz சேர்க்க</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📊 Statistics</Text>
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { borderTopColor: stat.color }]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {customTracks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⬆️ Uploaded Audios ({customTracks.length})</Text>
          {customTracks.map(track => (
            <View key={track.id} style={styles.uploadedRow}>
              <Text style={styles.uploadedIcon}>🎵</Text>
              <View style={styles.uploadedInfo}>
                <Text style={styles.uploadedTitle}>{track.title}</Text>
                <Text style={styles.uploadedMeta}>
                  {track.categoryName} · {track.fileName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteTrack(track.id)}>
                <Text style={styles.deleteBtn}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {customQuizzes.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🎮 Custom Quizzes ({customQuizzes.length})</Text>
          {customQuizzes.map(quiz => (
            <View key={quiz.id} style={styles.uploadedRow}>
              <Text style={styles.uploadedIcon}>❓</Text>
              <View style={styles.uploadedInfo}>
                <Text style={styles.uploadedTitle} numberOfLines={2}>{quiz.question}</Text>
                <Text style={styles.uploadedMeta}>
                  {CATEGORIES.find(c => c.id === quiz.categoryId)?.name || quiz.categoryId}
                   · சரி: {quiz.options[quiz.correctIndex]}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteQuiz(quiz.id)}>
                <Text style={styles.deleteBtn}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {customTracks.length === 0 && customQuizzes.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>இன்னும் எதுவும் upload பண்ணவில்லை</Text>
          <Text style={styles.emptySubText}>மேலே உள்ள buttons-ஐ பயன்படுத்துங்க</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>📋 Categories</Text>
      {CATEGORIES.map((cat) => (
        <View key={cat.id} style={styles.categoryRow}>
          <Text style={styles.categoryIcon}>{cat.icon}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <Text style={styles.categoryMeta}>
              {cat.trackCount} built-in tracks
            </Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: cat.color + '22' }]}>
            <Text style={[styles.categoryBadgeText, { color: cat.color }]}>
              {cat.trackCount}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f0bc42' },
  headerSub: { fontSize: 12, color: '#666', marginTop: 2 },
  logoutBtn: { backgroundColor: '#2a1010', borderWidth: 1, borderColor: '#5a2020', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#ff6b6b', fontSize: 13, fontWeight: '600' },
  profileCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, borderWidth: 1, borderColor: '#2a2a2a' },
  profileIcon: { fontSize: 36 },
  profileEmail: { color: '#fff', fontSize: 15, fontWeight: '600' },
  profileTime: { color: '#666', fontSize: 12, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, backgroundColor: '#111', borderWidth: 1.5, borderRadius: 12, padding: 16, alignItems: 'center', gap: 6 },
  actionBtnIcon: { fontSize: 28 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#ccc', marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, alignItems: 'center', width: '47%', borderTopWidth: 3, borderWidth: 1, borderColor: '#2a2a2a' },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#888' },
  uploadedRow: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  uploadedIcon: { fontSize: 22 },
  uploadedInfo: { flex: 1 },
  uploadedTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  uploadedMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  deleteBtn: { fontSize: 20 },
  emptyBox: { alignItems: 'center', padding: 32, marginBottom: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center' },
  emptySubText: { color: '#444', fontSize: 13, textAlign: 'center', marginTop: 6 },
  categoryRow: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  categoryIcon: { fontSize: 24 },
  categoryInfo: { flex: 1 },
  categoryName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  categoryMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: { fontSize: 13, fontWeight: '700' },
});
