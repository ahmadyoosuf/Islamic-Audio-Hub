import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import {
  addCategory, updateCategory, deleteCategory, getCategories,
  addSubCategory, updateSubCategory, deleteSubCategory, getSubcategories,
  addCard, updateCard, deleteCard, getCards,
  type FBCategory,
  type FBSubcategory,
  type FBCard,
} from "@/services/firebase.firestore";
import { uploadAudio, pickAudioFileWeb, type UploadProgress } from "@/services/firebase.storage";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  green:  "#1a7a4a",
  gold:   "#f0bc42",
  bg:     "#f4faf6",
  card:   "#ffffff",
  border: "#d4ead9",
  txt:    "#0d2414",
  sub:    "#5a7a64",
  red:    "#ef4444",
};

// ─── Shared Field ─────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9abca4"
        multiline={multiline}
      />
    </View>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({
  cat, sub, onHome, onCat,
}: {
  cat: FBCategory | null;
  sub: FBSubcategory | null;
  onHome: () => void;
  onCat: () => void;
}) {
  return (
    <View style={s.breadcrumb}>
      <Pressable onPress={onHome} hitSlop={8}>
        <Text style={[s.bcItem, !cat && s.bcActive]}>பிரிவுகள்</Text>
      </Pressable>
      {cat && (
        <>
          <Ionicons name="chevron-forward" size={12} color={C.sub} />
          <Pressable onPress={onCat} hitSlop={8}>
            <Text style={[s.bcItem, cat && !sub && s.bcActive]} numberOfLines={1}>
              {cat.icon} {cat.name}
            </Text>
          </Pressable>
        </>
      )}
      {sub && (
        <>
          <Ionicons name="chevron-forward" size={12} color={C.sub} />
          <Text style={[s.bcItem, s.bcActive]} numberOfLines={1}>{sub.name}</Text>
        </>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — Categories
// ═══════════════════════════════════════════════════════════════════════════════
function CategoriesView({ onSelect }: { onSelect: (cat: FBCategory) => void }) {
  const [cats,    setCats]    = useState<FBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameEn: "", icon: "📖", color: "#f0bc42", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await getCategories()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditId(null);
    setForm({ name: "", nameEn: "", icon: "📖", color: "#f0bc42", description: "" });
    setShowForm(true);
  }
  function openEdit(cat: FBCategory) {
    setEditId(cat.id);
    setForm({ name: cat.name, nameEn: cat.nameEn, icon: cat.icon, color: cat.color, description: cat.description });
    setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditId(null); }

  async function save() {
    if (!form.name.trim()) { Alert.alert("தவறு", "தமிழ் பெயர் கட்டாயம்"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), nameEn: form.nameEn.trim(),
        icon: form.icon || "📖", color: form.color || "#f0bc42",
        description: form.description.trim(),
        sortOrder: editId ? (cats.find(c => c.id === editId)?.sortOrder ?? 99) : cats.length + 1,
      };
      if (editId) await updateCategory(editId, payload);
      else        await addCategory(payload);
      cancelForm();
      await load();
    } catch (e: any) { Alert.alert("பிழை", e.message); }
    finally { setSaving(false); }
  }

  async function remove(cat: FBCategory) {
    Alert.alert("நீக்கு", `"${cat.name}" நீக்கவா?`, [
      { text: "இல்லை", style: "cancel" },
      { text: "ஆம்", style: "destructive", onPress: async () => {
        try { await deleteCategory(cat.id); await load(); }
        catch (e: any) { Alert.alert("பிழை", e.message); }
      }},
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.mgr} showsVerticalScrollIndicator={false}>

      {/* Add/Edit form */}
      {showForm ? (
        <View style={s.formCard}>
          <Text style={s.formTitle}>{editId ? "✏️ பிரிவு திருத்து" : "➕ புதிய பிரிவு சேர்"}</Text>
          <Field label="தமிழ் பெயர் *" value={form.name}        onChangeText={v => setForm(f => ({ ...f, name: v }))}        placeholder="குர்ஆன் விளக்கம்" />
          <Field label="English Name"   value={form.nameEn}      onChangeText={v => setForm(f => ({ ...f, nameEn: v }))}      placeholder="Quran Explanation" />
          <Field label="Icon (emoji)"   value={form.icon}        onChangeText={v => setForm(f => ({ ...f, icon: v }))}        placeholder="📖" />
          <Field label="Color (hex)"    value={form.color}       onChangeText={v => setForm(f => ({ ...f, color: v }))}       placeholder="#f0bc42" />
          <Field label="விளக்கம்"       value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
          <View style={s.formBtns}>
            <TouchableOpacity style={[s.btn, s.btnGray]} onPress={cancelForm}>
              <Text style={s.btnTxt}>ரத்து</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnGreen, { flex: 1 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnTxt}>{editId ? "சேமி" : "➕ சேர்"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[s.btn, s.btnGreen, { marginBottom: 16 }]} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.btnTxt}>+ புதிய பிரிவு சேர்</Text>
        </TouchableOpacity>
      )}

      {/* Category list */}
      <Text style={s.listTitle}>பிரிவுகள் ({cats.length}) — tap to drill in ›</Text>
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : cats.length === 0 ? (
        <Text style={s.emptyTxt}>இன்னும் பிரிவுகள் இல்லை.</Text>
      ) : (
        cats.map(cat => (
          <Pressable key={cat.id} onPress={() => onSelect(cat)} activeOpacity={0.75}>
            <View style={[s.listRow, { borderLeftWidth: 3, borderLeftColor: cat.color }]}>
              <Text style={s.rowIcon}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowMain}>{cat.name}</Text>
                {!!cat.nameEn && <Text style={s.rowSub}>{cat.nameEn}</Text>}
              </View>
              <View style={[s.colorDot, { backgroundColor: cat.color }]} />
              <Pressable onPress={e => { e.stopPropagation(); openEdit(cat); }} style={s.iconBtn} hitSlop={10}>
                <Ionicons name="pencil" size={16} color={C.green} />
              </Pressable>
              <Pressable onPress={e => { e.stopPropagation(); remove(cat); }} style={s.iconBtn} hitSlop={10}>
                <Ionicons name="trash" size={16} color={C.red} />
              </Pressable>
              <Ionicons name="chevron-forward" size={16} color={C.sub} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — Subcategories (filtered by cat.id)
// ═══════════════════════════════════════════════════════════════════════════════
function SubcategoriesView({
  cat, onSelect,
}: { cat: FBCategory; onSelect: (sub: FBSubcategory) => void }) {
  const [subs,     setSubs]     = useState<FBSubcategory[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameEn: "" });

  const load = useCallback(async () => {
    setLoading(true);
    // Filtered Firestore query — only this category's subcategories
    try { setSubs(await getSubcategories(cat.id)); } finally { setLoading(false); }
  }, [cat.id]);

  useEffect(() => { load(); }, [load]);

  function openAdd()  { setEditId(null); setForm({ name: "", nameEn: "" }); setShowForm(true); }
  function openEdit(sub: FBSubcategory) { setEditId(sub.id); setForm({ name: sub.name, nameEn: sub.nameEn }); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditId(null); }

  async function save() {
    if (!form.name.trim()) { Alert.alert("தவறு", "பெயர் கட்டாயம்"); return; }
    setSaving(true);
    try {
      const payload = {
        categoryId: cat.id,
        name:       form.name.trim(),
        nameEn:     form.nameEn.trim(),
        sortOrder:  editId ? (subs.find(s => s.id === editId)?.sortOrder ?? 99) : subs.length + 1,
      };
      if (editId) await updateSubCategory(editId, payload);
      else        await addSubCategory(payload);
      cancelForm();
      await load();
    } catch (e: any) { Alert.alert("பிழை", e.message); }
    finally { setSaving(false); }
  }

  async function remove(sub: FBSubcategory) {
    Alert.alert("நீக்கு", `"${sub.name}" நீக்கவா?`, [
      { text: "இல்லை", style: "cancel" },
      { text: "ஆம்", style: "destructive", onPress: async () => {
        try { await deleteSubCategory(sub.id); await load(); }
        catch (e: any) { Alert.alert("பிழை", e.message); }
      }},
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.mgr} showsVerticalScrollIndicator={false}>

      {/* Category context badge */}
      <View style={[s.ctxBadge, { borderColor: cat.color + "55", backgroundColor: cat.color + "11" }]}>
        <Text style={[s.ctxBadgeTxt, { color: cat.color }]}>{cat.icon} {cat.name}</Text>
      </View>

      {/* Add/Edit form */}
      {showForm ? (
        <View style={s.formCard}>
          <Text style={s.formTitle}>{editId ? "✏️ உப-பிரிவு திருத்து" : "➕ புதிய உப-பிரிவு சேர்"}</Text>
          <Field label="தமிழ் பெயர் *" value={form.name}   onChangeText={v => setForm(f => ({ ...f, name: v }))}   placeholder="அல்-பாத்திஹா" />
          <Field label="English Name"   value={form.nameEn} onChangeText={v => setForm(f => ({ ...f, nameEn: v }))} placeholder="Al-Fatiha" />
          <View style={s.formBtns}>
            <TouchableOpacity style={[s.btn, s.btnGray]} onPress={cancelForm}>
              <Text style={s.btnTxt}>ரத்து</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnGreen, { flex: 1 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnTxt}>{editId ? "சேமி" : "➕ சேர்"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[s.btn, s.btnGreen, { marginBottom: 16 }]} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.btnTxt}>+ புதிய உப-பிரிவு சேர்</Text>
        </TouchableOpacity>
      )}

      {/* Subcategory list */}
      <Text style={s.listTitle}>உப-பிரிவுகள் ({subs.length}) — tap to see cards ›</Text>
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : subs.length === 0 ? (
        <Text style={s.emptyTxt}>இன்னும் உப-பிரிவுகள் இல்லை.</Text>
      ) : (
        subs.map(sub => (
          <Pressable key={sub.id} onPress={() => onSelect(sub)} activeOpacity={0.75}>
            <View style={s.listRow}>
              <View style={[s.subDot, { backgroundColor: cat.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowMain}>{sub.name}</Text>
                {!!sub.nameEn && <Text style={s.rowSub}>{sub.nameEn}</Text>}
              </View>
              <Pressable onPress={e => { e.stopPropagation(); openEdit(sub); }} style={s.iconBtn} hitSlop={10}>
                <Ionicons name="pencil" size={16} color={C.green} />
              </Pressable>
              <Pressable onPress={e => { e.stopPropagation(); remove(sub); }} style={s.iconBtn} hitSlop={10}>
                <Ionicons name="trash" size={16} color={C.red} />
              </Pressable>
              <Ionicons name="chevron-forward" size={16} color={C.sub} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — Cards (strict filter: subcategoryId === sub.id)
// ═══════════════════════════════════════════════════════════════════════════════
function CardsView({
  cat, sub, router,
}: { cat: FBCategory; sub: FBSubcategory; router: ReturnType<typeof useRouter> }) {
  const [cards,       setCards]       = useState<FBCard[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"reading" | "uploading">("reading");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [editId,        setEditId]        = useState<string | null>(null);
  const [form, setForm] = useState({ titleTa: "", titleEn: "", audioUrl: "", description: "" });

  // ── Strict Firestore query: only cards where subcategoryId == sub.id ─────
  const load = useCallback(async () => {
    setLoading(true);
    try { setCards(await getCards(sub.id)); } finally { setLoading(false); }
  }, [sub.id]);

  useEffect(() => { load(); }, [load]);

  function openAdd()  { setShowTypeModal(true); }
  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ titleTa: "", titleEn: "", audioUrl: "", description: "" });
  }
  function chooseSingle() { setShowTypeModal(false); setShowForm(true); }
  function chooseBulk()   { setShowTypeModal(false); router.push("/admin/firebase/bulk-create" as any); }

  function openEdit(card: FBCard) {
    setEditId(card.id);
    setForm({ titleTa: card.titleTa, titleEn: card.titleEn, audioUrl: card.audioUrl, description: card.description });
    setShowForm(true);
  }

  async function pickAndUploadAudio() {
    try {
      let source: string | File;
      let name: string;
      if (Platform.OS === "web") {
        const file = await pickAudioFileWeb();
        if (!file) return;
        if (file.size === 0) { Alert.alert("பிழை", `"${file.name}" கோப்பு காலியாக உள்ளது`); return; }
        source = file; name = file.name;
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        source = asset.uri; name = asset.name ?? "audio.mp3";
      }
      setUploading(true); setUploadPhase("reading");
      const url = await uploadAudio(source, `${Date.now()}_${name}`, (p: UploadProgress) => {
        if (p.percent > 0) setUploadPhase("uploading");
      });
      setForm(f => ({ ...f, audioUrl: url }));
      Alert.alert("✅ பதிவேற்றம் வெற்றி", `"${name}" Firebase Storage-ல் சேமிக்கப்பட்டது`);
    } catch (e: any) { Alert.alert("பிழை", e.message ?? "பதிவேற்றம் தோல்வி"); }
    finally { setUploading(false); setUploadPhase("reading"); }
  }

  async function save() {
    if (!form.titleTa.trim()) { Alert.alert("தவறு", "தமிழ் தலைப்பு கட்டாயம்"); return; }
    setSaving(true);
    try {
      const payload = {
        categoryId:    cat.id,
        subcategoryId: sub.id,   // always locked to the current subcategory
        titleTa:       form.titleTa.trim(),
        titleEn:       form.titleEn.trim(),
        audioUrl:      form.audioUrl.trim(),
        description:   form.description.trim(),
        isPremium: false, hasQuiz: false, viewCount: 0, duration: 0, quiz: [],
        sortOrder: editId
          ? (cards.find(c => c.id === editId)?.sortOrder ?? 99)
          : cards.length + 1,
      };
      if (editId) await updateCard(editId, payload);
      else        await addCard(payload);
      cancelForm();
      await load();
    } catch (e: any) { Alert.alert("பிழை", e.message); }
    finally { setSaving(false); }
  }

  async function remove(card: FBCard) {
    Alert.alert("நீக்கு", `"${card.titleTa || card.titleEn}" நீக்கவா?`, [
      { text: "இல்லை", style: "cancel" },
      { text: "ஆம்", style: "destructive", onPress: async () => {
        try { await deleteCard(card.id); await load(); }
        catch (e: any) { Alert.alert("பிழை", e.message); }
      }},
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.mgr} showsVerticalScrollIndicator={false}>

      {/* ── Type-selection modal ── */}
      <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowTypeModal(false)}>
          <Pressable style={s.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>Card சேர்க்கும் முறை</Text>
            <Text style={s.modalSub}>எந்த முறையில் Card சேர்க்க விரும்புகிறீர்கள்?</Text>

            <TouchableOpacity style={s.typeCard} onPress={chooseSingle} activeOpacity={0.8}>
              <View style={[s.typeIcon, { backgroundColor: "#e8f5ee" }]}>
                <Ionicons name="create-outline" size={26} color={C.green} />
              </View>
              <View style={s.typeInfo}>
                <Text style={s.typeTitle}>Single Card</Text>
                <Text style={s.typeSub}>ஒரே ஒரு Card-ஐ படிவம் மூலம் சேர்க்கவும்</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.sub} />
            </TouchableOpacity>

            <TouchableOpacity style={[s.typeCard, { borderColor: "#f0bc4244" }]} onPress={chooseBulk} activeOpacity={0.8}>
              <View style={[s.typeIcon, { backgroundColor: "#fff8e6" }]}>
                <Ionicons name="layers-outline" size={26} color={C.gold} />
              </View>
              <View style={s.typeInfo}>
                <Text style={s.typeTitle}>Bulk Card Upload</Text>
                <Text style={s.typeSub}>பல Cards-ஐ ஒரே நேரத்தில் CSV / paste மூலம் சேர்க்கவும்</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.sub} />
            </TouchableOpacity>

            <TouchableOpacity style={s.modalCancel} onPress={() => setShowTypeModal(false)}>
              <Text style={s.modalCancelTxt}>ரத்து</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Context badges */}
      <View style={s.ctxRow}>
        <View style={[s.ctxBadge, { borderColor: cat.color + "55", backgroundColor: cat.color + "11" }]}>
          <Text style={[s.ctxBadgeTxt, { color: cat.color }]}>{cat.icon} {cat.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={12} color={C.sub} />
        <View style={[s.ctxBadge, { borderColor: C.green + "55", backgroundColor: "#e8f5ee" }]}>
          <Text style={[s.ctxBadgeTxt, { color: C.green }]}>{sub.name}</Text>
        </View>
      </View>

      {/* Add card form or trigger button */}
      {showForm ? (
        <View style={s.formCard}>
          <Text style={s.formTitle}>{editId ? "✏️ Card திருத்து" : "➕ புதிய Card சேர்"}</Text>
          <Text style={s.lockedBadge}>📍 {cat.name} › {sub.name}</Text>

          <Field label="தமிழ் தலைப்பு *" value={form.titleTa}     onChangeText={v => setForm(f => ({ ...f, titleTa: v }))}     placeholder="அல்-ஃபாத்திஹா — பாடம் 1" />
          <Field label="English Title"    value={form.titleEn}     onChangeText={v => setForm(f => ({ ...f, titleEn: v }))}     placeholder="Al-Fatiha — Lesson 1" />
          <Field label="விளக்கம்"          value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />

          <Text style={s.fieldLabel}>ஒலி கோப்பு</Text>
          {form.audioUrl ? (
            <View style={[s.audioRow, { backgroundColor: "#e8f5ee", borderColor: "#a8d8b8" }]}>
              <Ionicons name="checkmark-circle" size={18} color={C.green} />
              <Text style={[s.audioTxt, { color: C.green, flex: 1 }]} numberOfLines={1}>
                {form.audioUrl.split("/").pop()?.split("?")[0]}
              </Text>
              <Pressable onPress={() => setForm(f => ({ ...f, audioUrl: "" }))} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.red} />
              </Pressable>
            </View>
          ) : uploading ? (
            <View style={s.audioRow}>
              <ActivityIndicator size="small" color={C.green} />
              <Text style={s.audioTxt}>{uploadPhase === "reading" ? "📂 படிக்கிறது..." : "☁️ பதிவேற்றுகிறது..."}</Text>
            </View>
          ) : (
            <TouchableOpacity style={[s.btn, { backgroundColor: C.gold, marginBottom: 8 }]} onPress={pickAndUploadAudio}>
              <Ionicons name="cloud-upload-outline" size={16} color="#000" />
              <Text style={[s.btnTxt, { color: "#000" }]}>📁 ஒலி கோப்பு பதிவேற்று</Text>
            </TouchableOpacity>
          )}
          <Field label="அல்லது URL ஒட்டு" value={form.audioUrl} onChangeText={v => setForm(f => ({ ...f, audioUrl: v }))} placeholder="https://..." />

          <View style={s.formBtns}>
            <TouchableOpacity style={[s.btn, s.btnGray]} onPress={cancelForm}>
              <Text style={s.btnTxt}>ரத்து</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnGreen, { flex: 1 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnTxt}>{editId ? "சேமி" : "➕ Card சேர்"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[s.btn, s.btnGreen, { marginBottom: 16 }]} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.btnTxt}>+ Add Card</Text>
        </TouchableOpacity>
      )}

      {/* Strict card list — only this subcategory */}
      <Text style={s.listTitle}>Cards ({cards.length}) — {sub.name} மட்டும்</Text>
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : cards.length === 0 ? (
        <Text style={s.emptyTxt}>இந்த உப-பிரிவில் இன்னும் Cards இல்லை.</Text>
      ) : (
        cards.map(card => (
          <View key={card.id} style={s.listRow}>
            <View style={[s.audioIcon, { backgroundColor: card.audioUrl ? "#e8f5ee" : "#f5e8e8" }]}>
              <Ionicons name={card.audioUrl ? "musical-note" : "musical-note-outline"} size={16} color={card.audioUrl ? C.green : C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowMain} numberOfLines={1}>{card.titleTa || card.titleEn}</Text>
              {!!card.titleEn && card.titleTa && <Text style={s.rowSub} numberOfLines={1}>{card.titleEn}</Text>}
              {card.hasQuiz && (
                <View style={s.quizPill}>
                  <Ionicons name="help-circle" size={11} color={C.green} />
                  <Text style={s.quizPillTxt}>{(card.quiz ?? []).length} கேள்விகள்</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => router.push(`/admin/firebase/quiz/${card.id}` as any)}
              style={[s.iconBtn, { backgroundColor: "#e8f5ee", borderColor: C.green + "55" }]}
              hitSlop={10}
            >
              <Ionicons name="help-circle-outline" size={16} color={C.green} />
            </Pressable>
            <Pressable onPress={() => openEdit(card)} style={s.iconBtn} hitSlop={10}>
              <Ionicons name="pencil" size={16} color={C.green} />
            </Pressable>
            <Pressable onPress={() => remove(card)} style={s.iconBtn} hitSlop={10}>
              <Ionicons name="trash" size={16} color={C.red} />
            </Pressable>
          </View>
        ))
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — Drill-down navigation controller
// ═══════════════════════════════════════════════════════════════════════════════
export default function FirebaseAdminScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState<FBCategory | null>(null);
  const [selectedSub, setSelectedSub] = useState<FBSubcategory | null>(null);

  function goBack() {
    if (selectedSub)       { setSelectedSub(null); return; }
    if (selectedCat)       { setSelectedCat(null); return; }
    router.back();
  }
  function goToCategories() { setSelectedCat(null); setSelectedSub(null); }
  function goToSubcategories() { setSelectedSub(null); }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={C.green} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🔥 Firebase CMS</Text>
          <Breadcrumb
            cat={selectedCat}
            sub={selectedSub}
            onHome={goToCategories}
            onCat={goToSubcategories}
          />
        </View>
      </View>

      {/* ── Drill-down content ── */}
      {!selectedCat && (
        <CategoriesView onSelect={cat => { setSelectedCat(cat); setSelectedSub(null); }} />
      )}
      {selectedCat && !selectedSub && (
        <SubcategoriesView cat={selectedCat} onSelect={setSelectedSub} />
      )}
      {selectedCat && selectedSub && (
        <CardsView cat={selectedCat} sub={selectedSub} router={router} />
      )}

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#fff",
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "800", color: C.txt },

  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap" },
  bcItem:     { fontSize: 11, color: C.sub },
  bcActive:   { color: C.green, fontWeight: "700" },

  mgr:  { padding: 16 },

  ctxRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  ctxBadge:   { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  ctxBadgeTxt:{ fontSize: 12, fontWeight: "700" },

  formCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  formTitle:   { fontSize: 15, fontWeight: "800", color: C.txt, marginBottom: 14 },
  formBtns:    { flexDirection: "row", gap: 10, marginTop: 6 },
  lockedBadge: { fontSize: 11, color: C.sub, backgroundColor: "#f0f8f3", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14 },

  fieldWrap:   { marginBottom: 12 },
  fieldLabel:  { fontSize: 12, fontWeight: "600", color: C.sub, marginBottom: 6 },
  fieldInput:  { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.txt, backgroundColor: C.bg },

  btn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  btnGreen:    { backgroundColor: C.green },
  btnGray:     { backgroundColor: "#ccc", paddingHorizontal: 20 },
  btnTxt:      { color: "#fff", fontWeight: "700", fontSize: 14 },

  audioRow:    { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginBottom: 12 },
  audioTxt:    { fontSize: 13, color: C.sub },
  audioIcon:   { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  listTitle:   { fontSize: 13, fontWeight: "700", color: C.sub, marginBottom: 10 },
  emptyTxt:    { textAlign: "center", color: C.sub, marginTop: 20, fontStyle: "italic" },
  listRow:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rowIcon:     { fontSize: 22, width: 34 },
  rowMain:     { fontSize: 14, fontWeight: "600", color: C.txt },
  rowSub:      { fontSize: 11, color: C.sub, marginTop: 2 },
  colorDot:    { width: 14, height: 14, borderRadius: 7 },
  subDot:      { width: 10, height: 10, borderRadius: 5 },
  iconBtn:     { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  quizPill:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  quizPillTxt: { fontSize: 10, color: C.green, fontWeight: "700" },

  // Type-selection modal
  modalOverlay:   { flex: 1, backgroundColor: "#00000066", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox:       { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 12 },
  modalTitle:     { fontSize: 17, fontWeight: "800", color: C.txt, textAlign: "center" },
  modalSub:       { fontSize: 13, color: C.sub, textAlign: "center", marginBottom: 4 },
  typeCard:       { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14 },
  typeIcon:       { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeInfo:       { flex: 1 },
  typeTitle:      { fontSize: 15, fontWeight: "700", color: C.txt, marginBottom: 3 },
  typeSub:        { fontSize: 12, color: C.sub },
  modalCancel:    { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  modalCancelTxt: { fontSize: 14, color: C.sub, fontWeight: "600" },
});
