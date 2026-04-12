import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CATEGORIES, TRACKS, type Track } from '../../../data/categories';
import {
  getCustomTracks,
  deleteCustomTrack,
  type CustomTrack,
} from '../../../data/customStorage';

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
  const builtInTracks = TRACKS.filter(t => t.categoryId === id);

  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCustomTracks().then(all => {
        setCustomTracks(all.filter(t => t.categoryId === id));
      });
    }, [id])
  );

  function handleDelete(trackId: string, title: string) {
    Alert.alert(
      'நீக்கவா?',
      `"${title}" audio-ஐ நீக்க விரும்புகிறீர்களா?`,
      [
        { text: 'இல்லை', style: 'cancel' },
        {
          text: 'நீக்கு',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomTrack(trackId);
            setCustomTracks(prev => prev.filter(t => t.id !== trackId));
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {customTracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBadge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.sectionBadgeTxt, { color }]}>
                  ⬆️ Uploaded — {customTracks.length} tracks
                </Text>
              </View>
            </View>

            {customTracks.map((track, i) => (
              <View key={track.id} style={[styles.card, { borderLeftColor: color }]}>
                <View style={styles.cardLeft}>
                  <View style={[styles.numBox, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.numTxt, { color }]}>
                      {builtInTracks.length + i + 1}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {track.fileName}
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
                    onPress={() => handleDelete(track.id, track.title)}
                  >
                    <Text style={styles.deleteTxt}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBadge, { backgroundColor: '#ffffff11' }]}>
              <Text style={styles.sectionBadgeTxtGray}>
                📚 Built-in — {builtInTracks.length} tracks
              </Text>
            </View>
          </View>

          {builtInTracks.map((track, i) => (
            <View key={track.id} style={[styles.card, styles.cardBuiltIn]}>
              <View style={styles.cardLeft}>
                <View style={styles.numBoxGray}>
                  <Text style={styles.numTxtGray}>{i + 1}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.cardMeta}>
                    {track.duration ? `${track.duration} நிமிடம்` : 'Built-in track'}
                    {track.hasQuiz ? ' · Quiz ✓' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.builtInTag}>
                <Text style={styles.builtInTagTxt}>Built-in</Text>
              </View>
            </View>
          ))}
        </View>

        {customTracks.length === 0 && (
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
  addBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  section: { marginBottom: 20 },
  sectionHeader: { marginBottom: 10 },
  sectionBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sectionBadgeTxt: { fontSize: 13, fontWeight: '700' },
  sectionBadgeTxtGray: { color: '#666', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderLeftWidth: 3,
  },
  cardBuiltIn: {
    borderLeftColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  numBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTxt: { fontSize: 14, fontWeight: '700' },
  numBoxGray: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTxtGray: { color: '#555', fontSize: 14, fontWeight: '600' },
  cardInfo: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardMeta: { color: '#555', fontSize: 11, marginTop: 3 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionTxt: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#200',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTxt: { fontSize: 16 },
  builtInTag: {
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  builtInTagTxt: { color: '#444', fontSize: 11 },
  emptyAddCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyAddIcon: { fontSize: 40, marginBottom: 8 },
  emptyAddTxt: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
