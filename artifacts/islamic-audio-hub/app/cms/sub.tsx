import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getCMSSubcategoriesByCategory, getCMSCardsBySubcategory, type CMSSubcategory } from '../../data/cmsStorage';

export default function CMSSub() {
  const router = useRouter();
  const { catId, catName, catColor } = useLocalSearchParams<{ catId: string; catName: string; catColor: string }>();
  const color = catColor ?? '#f0bc42';

  const [subs, setSubs] = useState<CMSSubcategory[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    load();
  }, [catId]));

  async function load() {
    setLoading(true);
    const all = await getCMSSubcategoriesByCategory(catId ?? '');
    setSubs(all);
    const counts: Record<string, number> = {};
    await Promise.all(all.map(async sub => {
      const cards = await getCMSCardsBySubcategory(sub.id);
      counts[sub.id] = cards.length;
    }));
    setCardCounts(counts);
    setLoading(false);
  }

  return (
    <View style={s.screen}>
      <View style={[s.topBar, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.breadcrumb}>Library</Text>
          <Text style={[s.topTitle, { color }]}>{catName ?? '...'}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={color} /></View>
      ) : subs.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyTitle}>Subcategories இல்லை</Text>
          <Text style={s.emptySub}>Admin Panel-ல் subcategories உருவாக்கவும்</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.sectionHint}>Subcategory தேர்ந்தெடுக்கவும்</Text>
          {subs.map((sub, i) => {
            const cc = cardCounts[sub.id] ?? 0;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[s.card, { borderLeftColor: color }]}
                onPress={() => router.push({ pathname: '/cms/cards', params: { subId: sub.id, subName: sub.name, catColor: color, catName } })}
                activeOpacity={0.8}
              >
                <View style={[s.numBox, { backgroundColor: color + '22' }]}>
                  <Text style={[s.numTxt, { color }]}>{i + 1}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.cardTitle}>{sub.name}</Text>
                  {sub.description ? <Text style={s.cardDesc} numberOfLines={1}>{sub.description}</Text> : null}
                  <View style={[s.badge, { backgroundColor: color + '15' }]}>
                    <Text style={[s.badgeTxt, { color }]}>{cc} Cards</Text>
                  </View>
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
  breadcrumb: { color: '#555', fontSize: 11 },
  topTitle: { fontSize: 17, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  sectionHint: { color: '#555', fontSize: 12, marginBottom: 8 },
  card: { backgroundColor: '#111', borderRadius: 12, borderLeftWidth: 3, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  numBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 13, fontWeight: '800' },
  info: { flex: 1, gap: 4 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardDesc: { color: '#555', fontSize: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 24, fontWeight: '200' },
});
