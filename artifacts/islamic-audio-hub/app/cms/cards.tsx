import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getCMSCardsBySubcategory, getCMSCardTrackCounts, type CMSCard } from '../../data/cmsStorage';

export default function CMSCards() {
  const router = useRouter();
  const { subId, subName, catColor, catName } = useLocalSearchParams<{ subId: string; subName: string; catColor: string; catName: string }>();
  const color = catColor ?? '#f0bc42';

  const [cards, setCards] = useState<CMSCard[]>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { load(); }, [subId]));

  async function load() {
    setLoading(true);
    const [c, counts] = await Promise.all([
      getCMSCardsBySubcategory(subId ?? ''),
      getCMSCardTrackCounts(subId ?? ''),
    ]);
    setCards(c); setTrackCounts(counts); setLoading(false);
  }

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.breadcrumb}>{catName} › {subName}</Text>
          <Text style={s.topTitle}>Cards</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={color} /></View>
      ) : cards.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyTitle}>Cards இல்லை</Text>
          <Text style={s.emptySub}>Admin Panel-ல் cards உருவாக்கவும்</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.sectionHint}>{cards.length} cards — ஒரு card தேர்ந்தெடுக்கவும்</Text>
          {cards.map((card, i) => {
            const tc = trackCounts[card.id] ?? 0;
            return (
              <TouchableOpacity
                key={card.id}
                style={s.card}
                onPress={() => router.push({ pathname: '/cms/card', params: { cardId: card.id, cardTitle: card.title, catColor: color, catName, subName } })}
                activeOpacity={0.8}
              >
                <View style={[s.indexBox, { backgroundColor: color + '18' }]}>
                  <Text style={[s.indexTxt, { color }]}>{i + 1}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.cardTitle}>{card.title}</Text>
                  {card.description ? <Text style={s.cardDesc} numberOfLines={1}>{card.description}</Text> : null}
                </View>
                <View style={[s.tracksBadge, { backgroundColor: color + '18', borderColor: color + '44' }]}>
                  <Text style={[s.tracksBadgeTxt, { color }]}>🎵 {tc}</Text>
                  <Text style={[s.tracksLabel, { color: color + 'aa' }]}>Tracks</Text>
                </View>
                <Text style={[s.arrow, { color }]}>›</Text>
              </TouchableOpacity>
            );
          })}
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
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  sectionHint: { color: '#555', fontSize: 12, marginBottom: 8 },
  card: { backgroundColor: '#111', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  indexBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  indexTxt: { fontSize: 15, fontWeight: '800' },
  info: { flex: 1, gap: 4 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#555', fontSize: 12 },
  tracksBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', minWidth: 58 },
  tracksBadgeTxt: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  tracksLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  arrow: { fontSize: 22, fontWeight: '200' },
});
