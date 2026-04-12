import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getCMSCategoryById, getCMSSubcategoriesByCategory,
  addCMSSubcategory, updateCMSSubcategory, deleteCMSSubcategory,
  type CMSCategory, type CMSSubcategory,
} from '../../../data/cmsStorage';

export default function CMSAdminSub() {
  const router = useRouter();
  const { catId } = useLocalSearchParams<{ catId: string }>();

  const [cat, setCat] = useState<CMSCategory | null>(null);
  const [subs, setSubs] = useState<CMSSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CMSSubcategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [catId]));

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([
      getCMSCategoryById(catId ?? ''),
      getCMSSubcategoriesByCategory(catId ?? ''),
    ]);
    setCat(c); setSubs(s); setLoading(false);
  }

  const color = cat?.color ?? '#f0bc42';

  function openAdd() { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); }
  function openEdit(sub: CMSSubcategory) {
    setEditing(sub); setForm({ name: sub.name, description: sub.description ?? '' }); setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('பெயர் தேவை'); return; }
    setSaving(true);
    if (editing) {
      await updateCMSSubcategory(editing.id, { name: form.name.trim(), description: form.description });
    } else {
      const maxOrder = subs.length > 0 ? Math.max(...subs.map(s => s.sortOrder)) : 0;
      await addCMSSubcategory({ categoryId: catId!, name: form.name.trim(), description: form.description, sortOrder: maxOrder + 1 });
    }
    setSaving(false); setShowModal(false); load();
  }

  function handleDelete(sub: CMSSubcategory) {
    Alert.alert('நீக்கவா?', `"${sub.name}" மற்றும் அதன் அனைத்து cards, tracks நீக்கப்படும்.`, [
      { text: 'இல்லை', style: 'cancel' },
      { text: 'நீக்கு', style: 'destructive', onPress: async () => { await deleteCMSSubcategory(sub.id); load(); } },
    ]);
  }

  return (
    <View style={s.screen}>
      <View style={[s.header, { borderBottomColor: color + '33' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color }]}>‹ திரும்பு</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.catIcon}>{cat?.icon ?? '📚'}</Text>
          <Text style={s.headerTitle}>{cat?.name ?? '...'}</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: color }]} onPress={openAdd}>
          <Text style={s.addBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={color} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.hint}>Subcategory → Cards → Tracks வரிசையில் manage செய்யுங்கள்</Text>

          {subs.length === 0 && (
            <TouchableOpacity style={[s.emptyCard, { borderColor: color + '44' }]} onPress={openAdd}>
              <Text style={[s.emptyIcon, { color }]}>+</Text>
              <Text style={[s.emptyTxt, { color }]}>முதல் Subcategory சேர்க்கவும்</Text>
            </TouchableOpacity>
          )}

          {subs.map((sub, i) => (
            <TouchableOpacity
              key={sub.id}
              style={[s.card, { borderLeftColor: color }]}
              onPress={() => router.push({ pathname: '/admin/cms/cards', params: { subId: sub.id, subName: sub.name, catColor: color } })}
              activeOpacity={0.8}
            >
              <View style={[s.numBadge, { backgroundColor: color + '22' }]}>
                <Text style={[s.numTxt, { color }]}>{i + 1}</Text>
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{sub.name}</Text>
                {sub.description ? <Text style={s.cardDesc} numberOfLines={1}>{sub.description}</Text> : null}
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(sub)}>
                  <Text style={s.editTxt}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(sub)}>
                  <Text style={s.delTxt}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.arrow, { color }]}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{editing ? 'Subcategory திருத்து' : 'புதிய Subcategory'}</Text>
          <Text style={s.fieldLabel}>பெயர் *</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={t => setForm(f => ({ ...f, name: t }))}
            placeholder="Subcategory பெயர்..."
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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  catIcon: { fontSize: 20 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
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
  cardInfo: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#555', fontSize: 11, marginTop: 2 },
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
