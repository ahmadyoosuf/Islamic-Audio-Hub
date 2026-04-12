import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllCMSCategories, getCMSSubcategoriesByCategory, type CMSCategory } from '../../data/cmsStorage';

export default function CMSHome() {
  const router = useRouter();
  const [cats, setCats] = useState<CMSCategory[]>([]);
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    setLoading(true);
    const all = await getAllCMSCategories();
    setCats(all);
    const counts: Record<string, number> = {};
    await Promise.all(all.map(async c => {
      const subs = await getCMSSubcategoriesByCategory(c.id);
      counts[c.id] = subs.length;
    }));
    setSubCounts(counts);
    setLoading(false);
  }

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.topTitle}>📚 Library</Text>
          <Text style={s.topSub}>Category தேர்ந்தெடுக்கவும்</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#f0bc42" /></View>
      ) : cats.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyTitle}>Content இல்லை</Text>
          <Text style={s.emptySub}>Admin Panel-ல் categories உருவாக்கவும்</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.grid}>
          {cats.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.card, { borderTopColor: cat.color }]}
              onPress={() => router.push({ pathname: '/cms/sub', params: { catId: cat.id, catName: cat.name, catColor: cat.color } })}
              activeOpacity={0.8}
            >
              <View style={[s.iconBox, { backgroundColor: cat.color + '20' }]}>
                <Text style={s.icon}>{cat.icon}</Text>
              </View>
              <Text style={s.cardName}>{cat.name}</Text>
              {cat.description ? (
                <Text style={s.cardDesc} numberOfLines={2}>{cat.description}</Text>
              ) : null}
              <View style={[s.badge, { backgroundColor: cat.color + '20' }]}>
                <Text style={[s.badgeTxt, { color: cat.color }]}>{subCounts[cat.id] ?? 0} Subcategories</Text>
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
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#0e0e0e', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backTxt: { color: '#f0bc42', fontSize: 26, fontWeight: '300' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  topSub: { color: '#666', fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySub: { color: '#666', fontSize: 14, textAlign: 'center' },
  grid: { padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 10,
  },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 30 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#666', fontSize: 11, lineHeight: 16 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
});
