import { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Pressable, Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getAllCMSCategories, addCMSCategory, updateCMSCategory, deleteCMSCategory,
  getCMSTotals, type CMSCategory,
} from '../../../data/cmsStorage';

const PRESET_COLORS = ['#f0bc42','#4CAF50','#2196F3','#9C27B0','#FF5722','#E91E63','#00BCD4','#FF9800'];
const PRESET_ICONS  = ['📖','📜','💫','🌙','☀️','🕌','🤲','⭐','📿','🎵','🗣️','✨'];

const EMPTY_FORM = { name: '', icon: '📖', color: '#f0bc42', description: '' };

export default function CMSAdminIndex() {
  const router = useRouter();
  const [cats, setCats] = useState<CMSCategory[]>([]);
  const [totals, setTotals] = useState({ categories: 0, subcategories: 0, cards: 0, tracks: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CMSCategory | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    setLoading(true);
    const [c, t] = await Promise.all([getAllCMSCategories(), getCMSTotals()]);
    setCats(c); setTotals(t); setLoading(false);
  }

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM); setShowModal(true);
  }

  function openEdit(cat: CMSCategory) {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, description: cat.description ?? '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('பெயர் தேவை', 'Category பெயரை உள்ளிடுக'); return; }
    setSaving(true);
    if (editing) {
      await updateCMSCategory(editing.id, { name: form.name.trim(), icon: form.icon, color: form.color, description: form.description });
    } else {
      const maxOrder = cats.length > 0 ? Math.max(...cats.map(c => c.sortOrder)) : 0;
      await addCMSCategory({ name: form.name.trim(), icon: form.icon, color: form.color, description: form.description, sortOrder: maxOrder + 1 });
    }
    setSaving(false); setShowModal(false); load();
  }

  function handleDelete(cat: CMSCategory) {
    Alert.alert(
      'நீக்கவா?',
      `"${cat.name}" மற்றும் அதன் அனைத்து subcategories, cards, tracks நீக்கப்படும்.`,
      [
        { text: 'இல்லை', style: 'cancel' },
        { text: 'நீக்கு', style: 'destructive', onPress: async () => { await deleteCMSCategory(cat.id); load(); } },
      ]
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Admin</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>📚 Library CMS</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnTxt}>+ சேர்</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          { label: 'Categories', val: totals.categories, color: '#f0bc42' },
          { label: 'Subcategories', val: totals.subcategories, color: '#4CAF50' },
          { label: 'Cards', val: totals.cards, color: '#2196F3' },
          { label: 'Tracks', val: totals.tracks, color: '#9C27B0' },
        ].map(s2 => (
          <View key={s2.label} style={[s.statCard, { borderTopColor: s2.color }]}>
            <Text style={[s.statVal, { color: s2.color }]}>{s2.val}</Text>
            <Text style={s.statLbl}>{s2.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#f0bc42" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {cats.length === 0 && (
            <TouchableOpacity style={s.emptyCard} onPress={openAdd}>
              <Text style={s.emptyIcon}>+</Text>
              <Text style={s.emptyTxt}>முதல் category-ஐ உருவாக்குங்கள்</Text>
            </TouchableOpacity>
          )}
          {cats.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={s.catCard}
              onPress={() => router.push({ pathname: '/admin/cms/sub', params: { catId: cat.id } })}
              activeOpacity={0.75}
            >
              <View style={[s.catIcon, { backgroundColor: cat.color + '22' }]}>
                <Text style={s.catIconTxt}>{cat.icon}</Text>
              </View>
              <View style={s.catInfo}>
                <Text style={s.catName}>{cat.name}</Text>
                <Text style={s.catDesc} numberOfLines={1}>{cat.description || 'Subcategory இல்லை'}</Text>
              </View>
              <View style={s.catActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(cat)}>
                  <Text style={s.editTxt}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(cat)}>
                  <Text style={s.delTxt}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.arrow, { color: cat.color }]}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{editing ? 'Category திருத்து' : 'புதிய Category'}</Text>

          <Text style={s.fieldLabel}>பெயர் *</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={t => setForm(f => ({ ...f, name: t }))}
            placeholder="Category பெயர்..."
            placeholderTextColor="#444"
          />

          <Text style={s.fieldLabel}>Icon (Emoji)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {PRESET_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[s.iconChip, form.icon === ic && s.iconChipActive]}
                onPress={() => setForm(f => ({ ...f, icon: ic }))}
              >
                <Text style={s.iconChipTxt}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.fieldLabel}>நிறம் (Color)</Text>
          <View style={s.colorRow}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorDot, { backgroundColor: c }, form.color === c && s.colorDotActive]}
                onPress={() => setForm(f => ({ ...f, color: c }))}
              />
            ))}
          </View>

          <Text style={s.fieldLabel}>விவரம் (விரும்பினால்)</Text>
          <TextInput
            style={[s.input, { height: 72 }]}
            value={form.description}
            onChangeText={t => setForm(f => ({ ...f, description: t }))}
            placeholder="சிறு விவரம்..."
            placeholderTextColor="#444"
            multiline
          />

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: form.color }]} onPress={handleSave} disabled={saving}>
            <Text style={s.saveTxt}>{saving ? '...' : editing ? 'சேமிக்கவும்' : 'உருவாக்கவும்'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: '#0e0e0e', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  backBtn: { padding: 4 },
  backTxt: { color: '#f0bc42', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  addBtn: { backgroundColor: '#f0bc42', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, padding: 14 },
  statCard: { flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 10, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: '#1e1e1e' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { color: '#555', fontSize: 9, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, gap: 10 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#f0bc4444', borderRadius: 14, paddingVertical: 50, alignItems: 'center', gap: 12 },
  emptyIcon: { color: '#f0bc42', fontSize: 40 },
  emptyTxt: { color: '#f0bc42', fontSize: 14, fontWeight: '600' },
  catCard: { backgroundColor: '#111', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  catIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catIconTxt: { fontSize: 26 },
  catInfo: { flex: 1 },
  catName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  catDesc: { color: '#555', fontSize: 11, marginTop: 2 },
  catActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#f0bc4222', borderRadius: 8, padding: 8 },
  editTxt: { fontSize: 14 },
  delBtn: { backgroundColor: '#ff444422', borderRadius: 8, padding: 8 },
  delTxt: { fontSize: 14 },
  arrow: { fontSize: 24, fontWeight: '200' },
  overlay: { flex: 1, backgroundColor: '#00000099' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 16 },
  iconChip: { paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  iconChipActive: { borderColor: '#f0bc42', backgroundColor: '#f0bc4222' },
  iconChipTxt: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#fff', transform: [{ scale: 1.2 }] },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveTxt: { color: '#000', fontSize: 16, fontWeight: '800' },
});
