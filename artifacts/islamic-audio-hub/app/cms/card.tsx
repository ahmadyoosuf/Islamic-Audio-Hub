import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getCMSTracksByCard, type CMSTrack } from '../../data/cmsStorage';

export default function CMSCard() {
  const router = useRouter();
  const { cardId, cardTitle, catColor, catName, subName } = useLocalSearchParams<{
    cardId: string; cardTitle: string; catColor: string; catName: string; subName: string;
  }>();
  const color = catColor ?? '#f0bc42';

  const [tracks, setTracks] = useState<CMSTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    getCMSTracksByCard(cardId ?? '').then(t => { setTracks(t); setLoading(false); });
  }, [cardId]));

  async function handleShare(track: CMSTrack) {
    try {
      await Share.share({ message: `🎵 "${track.title}" — Islamic Audio Hub-ல் கேளுங்கள்!` });
    } catch {}
  }

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.breadcrumb} numberOfLines={1}>{catName} › {subName}</Text>
          <Text style={s.topTitle} numberOfLines={1}>{cardTitle ?? 'Tracks'}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={color} /></View>
      ) : tracks.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>🎵</Text>
          <Text style={s.emptyTitle}>Tracks இல்லை</Text>
          <Text style={s.emptySub}>Admin Panel-ல் tracks சேர்க்கவும்</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: color + '18' }]}>
              <Text style={s.cardIcon}>🎵</Text>
            </View>
            <View>
              <Text style={s.cardHeaderTitle}>{cardTitle}</Text>
              <Text style={[s.cardHeaderSub, { color }]}>{tracks.length} Tracks</Text>
            </View>
          </View>

          {tracks.map((track, i) => (
            <TouchableOpacity
              key={track.id}
              style={s.trackCard}
              onPress={() => router.push({ pathname: '/cms/track/' + track.id, params: { cardTitle, catColor: color, catName, subName } })}
              activeOpacity={0.8}
            >
              <View style={[s.playBtn, { backgroundColor: color }]}>
                <Text style={s.playIcon}>▶</Text>
              </View>
              <View style={s.trackInfo}>
                <Text style={s.trackTitle}>{track.title}</Text>
                <Text style={s.trackMeta}>⏱ {track.duration} min</Text>
              </View>
              <View style={s.trackRight}>
                {track.hasQuiz && (
                  <View style={[s.quizBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.quizBadgeTxt, { color }]}>Quiz</Text>
                  </View>
                )}
                <TouchableOpacity style={s.shareBtn} onPress={() => handleShare(track)}>
                  <Text style={s.shareTxt}>↗</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#0e0e0e', borderBottomWidth: 1 },
  backBtn: { width: 32, alignItems: 'flex-start' },
  backTxt: { fontSize: 26, fontWeight: '300' },
  topCenter: { flex: 1, alignItems: 'center' },
  breadcrumb: { color: '#555', fontSize: 10, textAlign: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#1e1e1e' },
  cardIconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 28 },
  cardHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cardHeaderSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  trackCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  playBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#000', fontSize: 16, fontWeight: '800', marginLeft: 2 },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  trackMeta: { color: '#555', fontSize: 11, marginTop: 2 },
  trackRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  quizBadgeTxt: { fontSize: 10, fontWeight: '700' },
  shareBtn: { backgroundColor: '#1e1e1e', borderRadius: 8, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  shareTxt: { color: '#888', fontSize: 16 },
});
