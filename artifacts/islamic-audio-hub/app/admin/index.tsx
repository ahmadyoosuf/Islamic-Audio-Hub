import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, TRACKS } from '../../data/categories';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('');
  const [loginTime, setLoginTime] = useState('');

  useEffect(() => {
    loadSession();
  }, []);

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

  const totalTracks = TRACKS.length;
  const totalCategories = CATEGORIES.length;
  const totalQuizzes = CATEGORIES.reduce((sum, c) => sum + (c.quizzes?.length || 0), 0);

  const stats = [
    { label: 'Categories', value: totalCategories, icon: '📂', color: '#f0bc42' },
    { label: 'Tracks', value: totalTracks, icon: '🎵', color: '#4CAF50' },
    { label: 'Quizzes', value: totalQuizzes, icon: '🎮', color: '#2196F3' },
    { label: 'Users', value: '∞', icon: '👥', color: '#9C27B0' },
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

      <Text style={styles.sectionTitle}>📊 App Statistics</Text>
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { borderTopColor: stat.color }]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>📋 Categories Overview</Text>
      {CATEGORIES.map((cat) => (
        <View key={cat.id} style={styles.categoryRow}>
          <Text style={styles.categoryIcon}>{cat.icon}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{cat.title}</Text>
            <Text style={styles.categoryMeta}>
              {cat.tracks?.length || 0} tracks · {cat.quizzes?.length || 0} quizzes
            </Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: cat.color + '22' }]}>
            <Text style={[styles.categoryBadgeText, { color: cat.color }]}>
              {cat.tracks?.length || 0}
            </Text>
          </View>
        </View>
      ))}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Admin Info</Text>
        <Text style={styles.infoText}>• Email: admin@example.com</Text>
        <Text style={styles.infoText}>• இந்த dashboard மூலம் app statistics பார்க்கலாம்</Text>
        <Text style={styles.infoText}>• Data எல்லாம் app-லேயே built-in ஆக உள்ளது</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0bc42',
  },
  headerSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#2a1010',
    borderWidth: 1,
    borderColor: '#5a2020',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  profileIcon: {
    fontSize: 36,
  },
  profileEmail: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  profileTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ccc',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  categoryRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#111a0a',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2a3a1a',
    gap: 6,
  },
  infoTitle: {
    color: '#8bc34a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 20,
  },
});
