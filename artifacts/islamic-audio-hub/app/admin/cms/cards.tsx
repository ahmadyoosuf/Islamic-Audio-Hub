import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getCMSCardsBySubcategory, getCMSCardTrackCounts,
  addCMSCard, updateCMSCard, deleteCMSCard,
  type CMSCard,
} from '../../../data/cmsStorage';

export default function CMSAdminCards() {
  const router = useRouter();
  const { subId, subName, catColor } = useLocalSearchParams<{ subId: string; subName: string; catColor: string }>();
  const color = catColor ?? '#f0bc42';

  const [cards, setCards] = useState<CMSCard[]>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CMSCard | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [subId]));

  async function load() {
    setLoading(true);
    const [c, counts] = await Promise.all([
      getCMSCardsBySubcategory(subId ?? ''),
      getCMSCardTrackCounts(subId ?? ''),
    ]);
    setCards(c); setTrackCounts(counts); setLoading(false);
  }

  function openAdd() { setEditing(null); setForm({ title: '', description: '' }); setShowModal(true); }
  function openEdit(card: CMSCard) {
    setEditing(card); setForm({ title: card.title, description: card.description ?? '' }); setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { Alert.alert('தலைப்பு தேவை'); return; }
    setSaving(true);
    if (editing) {
      await updateCMSCard(editing.id, { title: form.title.trim(), description: form.description });
    } else {
      const maxOrder = cards.length > 0 ? Math.max(...cards.map(c => c.sortOrder)) : 0;
      await addCMSCard({ subcategoryId: subId!, title: form.title.trim(), description: form.description, sortOrder: maxOrder + 1 });
    }
    setSaving(false); setShowModal(false); load();
  }

  function handleDelete(card: CMSCard) {
    Alert.alert('நீக்கவா?', `"${card.title}" மற்றும் அதன் அனைத்து tracks நீக்கப்படும்.`, [
      { text: 'இல்லை', style: 'cancel' },
      { text: 'நீக்கு', style: 'destructive', onPress: async () => { await deleteCMSCard(card.id); load(); } },
    ]);
  }

  return (
    <View style={s.screen}>
      <View style={[s.header, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{subName ?? 'Cards'}</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: color }]} onPress={openAdd}>
          <Text style={s.addBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={color} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.hint}>{cards.length} Cards — ஒவ்வொரு card-லும் multiple tracks இருக்கலாம்</Text>

          {cards.length === 0 && (
            <TouchableOpacity style={[s.emptyCard, { borderColor: color + '44' }]} onPress={openAdd}>
              <Text style={[s.emptyIcon, { color }]}>+</Text>
              <Text style={[s.emptyTxt, { color }]}>முதல் Card சேர்க்கவும்</Text>
            </TouchableOpacity>
          )}

          {cards.map((card, i) => {
            const tc = trackCounts[card.id] ?? 0;
            return (
              <TouchableOpacity
                key={card.id}
                style={[s.card, { borderLeftColor: color }]}
                onPress={() => router.push({ pathname: '/admin/cms/card', params: { cardId: card.id, cardTitle: card.title, catColor: color } })}
                activeOpacity={0.8}
              >
                <View style={[s.numBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[s.numTxt, { color }]}>{i + 1}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle}>{card.title}</Text>
                  {card.description ? <Text style={s.cardDesc} numberOfLines={1}>{card.description}</Text> : null}
                  <View style={[s.trackBadge, { backgroundColor: color + '15' }]}>
                    <Text style={[s.trackBadgeTxt, { color }]}>🎵 {tc} Track{tc !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <View style={s.actions}>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEdit(card)}>
                    <Text style={s.editTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(card)}>
                    <Text style={s.delTxt}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[s.arrow, { color }]}>›</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{editing ? 'Card திருத்து' : 'புதிய Card'}</Text>
          <Text style={s.fieldLabel}>தலைப்பு *</Text>
          <TextInput
            style={s.input}
            value={form.title}
            onChangeText={t => setForm(f => ({ ...f, title: t }))}
            placeholder="Card தலைப்பு (e.g., சூரத்துல் பாத்திஹா)..."
            placeholderTextColor="#444"
            autoFocus
          />
          <Text style={s.fieldLabel}>விவரம் (விரும்பினால்)</Text>
          <TextInput
            style={[s.input, { height: 72 }]}
            value={form.description}
            onChangeText={t => setForm(f => ({ ...f, description: t }))}
            placeholder="சிறு விவரம்..."
            placeholderTextColor="#444"
            multiline
          />
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }]} onPress={handleSave} disabled={saving}>
            <Text style={s.saveTxt}>{saving ? '...' : editing ? 'சேமிக்கவும்' : 'உருவாக்கவும்'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: '#0e0e0e', borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, gap: 10 },
  hint: { color: '#444', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 40, alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#111', borderRadius: 10, borderLeftWidth: 3, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1e1e1e' },
  numBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 12, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#555', fontSize: 11 },
  trackBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  trackBadgeTxt: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#f0bc4222', borderRadius: 8, padding: 8 },
  editTxt: { fontSize: 14 },
  delBtn: { backgroundColor: '#ff444422', borderRadius: 8, padding: 8 },
  delTxt: { fontSize: 14 },
  arrow: { fontSize: 22 },
  overlay: { flex: 1, backgroundColor: '#00000099' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 16 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
});
