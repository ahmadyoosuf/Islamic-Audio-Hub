import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
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
  orange: "#f59e0b",
};

type Tab = "categories" | "subcategories" | "cards";

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, multiline,
}: {
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

// ─── Category Manager ─────────────────────────────────────────────────────────

function CategoryManager() {
  const [cats,    setCats]    = useState<FBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ name: "", nameEn: "", icon: "📖", color: "#f0bc42", description: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await getCategories()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setEditId(null);
    setForm({ name: "", nameEn: "", icon: "📖", color: "#f0bc42", description: "" });
  }

  async function save() {
    if (!form.name.trim()) { Alert.alert("தவறு", "தமிழ் பெயர் கட்டாயம்"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim(),
        icon: form.icon || "📖",
        color: form.color || "#f0bc42",
        description: form.description.trim(),
        sortOrder: editId ? (cats.find(c => c.id === editId)?.sortOrder ?? 99) : cats.length + 1,
      };
      if (editId) await updateCategory(editId, payload);
      else        await addCategory(payload);
      resetForm();
      await load();
    } catch (e: any) { Alert.alert("பிழை", e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string, name: string) {
    Alert.alert("நீக்கு", `"${name}" நீக்கவா?`, [
      { text: "இல்லை", style: "cancel" },
      { text: "ஆம்", style: "destructive", onPress: async () => {
        try { await deleteCategory(id); await load(); }
        catch (e: any) { Alert.alert("பிழை", e.message); }
      }},
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.mgr} showsVerticalScrollIndicator={false}>

      {/* Add / Edit form */}
      <View style={s.formCard}>
        <Text style={s.formTitle}>{editId ? "✏️ பிரிவு திருத்து" : "➕ புதிய பிரிவு சேர்"}</Text>
        <Field label="தமிழ் பெயர் *" value={form.name}   onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="குர்ஆன் விளக்கம்" />
        <Field label="English Name"   value={form.nameEn} onChangeText={v => setForm(f => ({ ...f, nameEn: v }))} placeholder="Quran Explanation" />
        <Field label="Icon (emoji)"   value={form.icon}   onChangeText={v => setForm(f => ({ ...f, icon: v }))} placeholder="📖" />
        <Field label="Color (hex)"    value={form.color}  onChangeText={v => setForm(f => ({ ...f, color: v }))} placeholder="#f0bc42" />
        <Field label="விளக்கம்"       value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
        <View style={s.formBtns}>
          {editId && (
            <TouchableOpacity style={[s.btn, s.btnGray]} onPress={resetForm}>
              <Text style={s.btnTxt}>ரத்து</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, s.btnGreen, { flex: 1 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={s.btnTxt}>{editId ? "சேமி" : "➕ சேர்"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <Text style={s.listTitle}>பிரிவுகள் ({cats.length})</Text>
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : cats.length === 0 ? (
        <Text style={s.emptyTxt}>இன்னும் பிரிவுகள் இல்லை. மேலே படிவம் பயன்படுத்தி சேர்க்கவும்.</Text>
      ) : (
        cats.map(cat => (
          <View key={cat.id} style={s.listRow}>
            <Text style={s.rowIcon}>{cat.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowMain}>{cat.name}</Text>
              {!!cat.nameEn && <Text style={s.rowSub}>{cat.nameEn}</Text>}
            </View>
            <View style={[s.colorDot, { backgroundColor: cat.color }]} />
            <Pressable onPress={() => { setEditId(cat.id); setForm({ name: cat.name, nameEn: cat.nameEn, icon: cat.icon, color: cat.color, description: cat.description }); }} style={s.iconBtn} hitSlop={10}>
              <Ionicons name="pencil" size={16} color={C.green} />
            </Pressable>
            <Pressable onPress={() => remove(cat.id, cat.name)} style={s.iconBtn} hitSlop={10}>
              <Ionicons name="trash" size={16} color={C.red} />
            </Pressable>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Subcategory Manager ──────────────────────────────────────────────────────

function SubcategoryManager() {
  const [cats,    setCats]    = useState<FBCategory[]>([]);
  const [subs,    setSubs]    = useState<FBSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ categoryId: "", name: "", nameEn: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([getCategories(), getSubcategories()]);
      setCats(c); setSubs(s);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.categoryId || !form.name.trim()) {
      Alert.alert("தவறு", "பிரிவு தேர்ந்தெடுக்கவும் + பெயர் இடவும்");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        name:       form.name.trim(),
        nameEn:     form.nameEn.trim(),
        sortOrder:  editId
          ? (subs.find(s => s.id === editId)?.sortOrder ?? 99)
          : subs.filter(s => s.categoryId === form.categoryId).length + 1,
      };
      if (editId) await updateSubCategory(editId, payload);
      else        await addSubCategory(payload);
      setEditId(null);
      setForm({ categoryId: "", name: "", nameEn: "" });
      await load();
    } catch (e: any) { Alert.alert("பிழை", e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string, name: string) {
    Alert.alert("நீக்கு", `"${name}" நீக்கவா?`, [
      { text: "இல்லை", style: "cancel" },
      { text: "ஆம்", style: "destructive", onPress: async () => {
        try { await deleteSubCategory(id); await load(); }
        catch (e: any) { Alert.alert("பிழை", e.message); }
      }},
    ]);
  }

  const catName = (id: string) => cats.find(c => c.id === id)?.name ?? id;

  return (
    <ScrollView contentContainerStyle={s.mgr} showsVerticalScrollIndicator={false}>

      {/* Form */}
      <View style={s.formCard}>
        <Text style={s.formTitle}>{editId ? "✏️ உப-பிரிவு திருத்து" : "➕ புதிய உப-பிரிவு சேர்"}</Text>

        <Text style={s.fieldLabel}>பிரிவு தேர்வு *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          {cats.map(c => (
            <Pressable
              key={c.id}
              onPress={() => setForm(f => ({ ...f, categoryId: c.id }))}
              style={[s.chip, form.categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
            >
              <Text style={[s.chipTxt, form.categoryId === c.id && { color: "#fff" }]}>
                {c.icon} {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Field label="தமிழ் பெயர் *" value={form.name}   onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="அல்-பாத்திஹா விளக்கம்" />
        <Field label="English Name"   value={form.nameEn} onChangeText={v => setForm(f => ({ ...f, nameEn: v }))} placeholder="Al-Fatiha Explanation" />

        <View style={s.formBtns}>
          {editId && (
            <TouchableOpacity style={[s.btn, s.btnGray]} onPress={() => { setEditId(null); setForm({ categoryId: "", name: "", nameEn: "" }); }}>
              <Text style={s.btnTxt}>ரத்து</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, s.btnGreen, { flex: 1 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={s.btnTxt}>{editId ? "சேமி" : "➕ சேர்"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <Text style={s.listTitle}>உப-பிரிவுகள் ({subs.length})</Text>
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : subs.length === 0 ? (
        <Text style={s.emptyTxt}>இன்னும் உப-பிரிவுகள் இல்லை. மேலே படிவம் பயன்படுத்தி சேர்க்கவும்.</Text>
      ) : (
        subs.map(sub => (
          <View key={sub.id} style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowMain}>{sub.name}</Text>
              {!!sub.nameEn && <Text style={s.rowSub}>{sub.nameEn}</Text>}
              <Text style={[s.rowSub, { color: C.green }]}>↳ {catName(sub.categoryId)}</Text>
            </View>
            <Pressable
              onPress={() => { setEditId(sub.id); setForm({ categoryId: sub.categoryId, name: sub.name, nameEn: sub.nameEn }); }}
              style={s.iconBtn} hitSlop={10}
            >
              <Ionicons name="pencil" size={16} color={C.green} />
            </Pressable>
            <Pressable onPress={() => remove(sub.id, sub.name)} style={s.iconBtn} hitSlop={10}>
              <Ionicons name="trash" size={16} color={C.red} />
            </Pressable>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Card Manager ─────────────────────────────────────────────────────────────

function CardManager() {
  const router = useRouter();
  const [cats,      setCats]      = useState<FBCategory[]>([]);
  const [subs,      setSubs]      = useState<FBSubcategory[]>([]);
  const [cards,     setCards]     = useState<FBCard[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadPhase,  setUploadPhase]  = useState<"reading" | "uploading">("reading");
  const [form, setForm] = useState({
    categoryId: "", subcategoryId: "",
    titleTa: "", titleEn: "", audioUrl: "", description: "",
  });
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, k] = await Promise.all([getCategories(), getSubcategories(), getCards()]);
      setCats(c); setSubs(s); setCards(k);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function pickAndUploadAudio() {
    try {
      let source: string | File;
      let name: string;

      if (Platform.OS === "web") {
        // ── Web: use native <input type="file"> ──────────────────────────────
        // expo-document-picker on web returns an object URL that XHR cannot
        // reliably read. The browser's File object IS already a Blob — no
        // conversion needed, and the user sees the OS file dialog they expect.
        const file = await pickAudioFileWeb();
        if (!file) return;
        if (file.size === 0) {
          Alert.alert("பிழை", `"${file.name}" கோப்பு காலியாக உள்ளது`);
          return;
        }
        source = file;
        name   = file.name;
      } else {
        // ── Native (iOS / Android): expo-document-picker ─────────────────────
        const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        source = asset.uri;
        name   = asset.name ?? "audio.mp3";
      }

      setUploading(true);
      setUploadPhase("reading");

      const filename = `${Date.now()}_${name}`;

      const url = await uploadAudio(source, filename, (p: UploadProgress) => {
        if (p.percent > 0) setUploadPhase("uploading");
      });

      setForm(f => ({ ...f, audioUrl: url }));
      Alert.alert("✅ பதிவேற்றம் வெற்றி", `"${name}" Firebase Storage-ல் சேமிக்கப்பட்டது`);
    } catch (e: any) {
      Alert.alert("பிழை", e.message ?? "பதிவேற்றம் தோல்வி");
    } finally {
      setUploading(false);
      setUploadPhase("reading");
    }
  }

  async function save() {
    if (!form.categoryId || !form.subcategoryId || !form.titleTa.trim()) {
      Alert.alert("தவறு", "பிரிவு, உப-பிரிவு, தமிழ் தலைப்பு கட்டாயம்");
      return;
    }
    setSaving(true);
    try {
      const existingInSub = cards.filter(c => c.subcategoryId === form.subcategoryId);
      const payload = {
        categoryId:    form.categoryId,
        subcategoryId: form.subcategoryId,
        titleTa:       form.titleTa.trim(),
        titleEn:       form.titleEn.trim(),
        audioUrl:      form.audioUrl.trim(),
        description:   form.description.trim(),
        isPremium:     false,
        hasQuiz:       false,
        viewCount:     0,
        duration:      0,
        quiz:          [],
        sortOrder:     editId
          ? (cards.find(c => c.id === editId)?.sortOrder ?? 99)
          : existingInSub.length + 1,
      };
      if (editId) await updateCard(editId, payload);
      else        await addCard(payload);
      setEditId(null);
      setForm({ categoryId: "", subcategoryId: "", titleTa: "", titleEn: "", audioUrl: "", description: "" });
      await load();
    } catch (e: any) { Alert.alert("பிழை", e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string, title: string) {
    Alert.alert("நீக்கு", `"${title}" நீக்கவா?`, [
      { text: "இல்லை", style: "cancel" },
      { text: "ஆம்", style: "destructive", onPress: async () => {
        try { await deleteCard(id); await load(); }
        catch (e: any) { Alert.alert("பிழை", e.message); }
      }},
    ]);
  }

  const filteredSubs = subs.filter(s => s.categoryId === form.categoryId);
  const subName  = (id: string) => subs.find(s => s.id === id)?.name ?? id;
  const catName  = (id: string) => cats.find(c => c.id === id)?.name ?? id;

  return (
    <ScrollView contentContainerStyle={s.mgr} showsVerticalScrollIndicator={false}>
      {/* Form */}
      <View style={s.formCard}>
        <Text style={s.formTitle}>{editId ? "✏️ Card திருத்து" : "➕ புதிய Card சேர்"}</Text>

        {/* Category picker */}
        <Text style={s.fieldLabel}>பிரிவு *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          {cats.map(c => (
            <Pressable
              key={c.id}
              onPress={() => setForm(f => ({ ...f, categoryId: c.id, subcategoryId: "" }))}
              style={[s.chip, form.categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
            >
              <Text style={[s.chipTxt, form.categoryId === c.id && { color: "#fff" }]}>
                {c.icon} {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Subcategory picker */}
        {form.categoryId ? (
          <>
            <Text style={s.fieldLabel}>உப-பிரிவு *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {filteredSubs.length === 0 ? (
                <Text style={[s.chipTxt, { color: C.red, paddingHorizontal: 8 }]}>
                  முதலில் உப-பிரிவு சேர்க்கவும்
                </Text>
              ) : (
                filteredSubs.map(sub => (
                  <Pressable
                    key={sub.id}
                    onPress={() => setForm(f => ({ ...f, subcategoryId: sub.id }))}
                    style={[s.chip, form.subcategoryId === sub.id && { backgroundColor: C.green, borderColor: C.green }]}
                  >
                    <Text style={[s.chipTxt, form.subcategoryId === sub.id && { color: "#fff" }]}>
                      {sub.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </>
        ) : null}

        <Field label="தமிழ் தலைப்பு *" value={form.titleTa}     onChangeText={v => setForm(f => ({ ...f, titleTa: v }))} placeholder="அல்-ஃபாத்திஹா — பாடம் 1" />
        <Field label="English Title"    value={form.titleEn}     onChangeText={v => setForm(f => ({ ...f, titleEn: v }))} placeholder="Al-Fatiha — Lesson 1" />
        <Field label="விளக்கம்"          value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />

        {/* Audio */}
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
            <Text style={s.audioTxt}>
              {uploadPhase === "reading" ? "📂 கோப்பு படிக்கிறது..." : "☁️ Firebase-ல் பதிவேற்றுகிறது..."}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn, { backgroundColor: C.gold, marginBottom: 8 }]} onPress={pickAndUploadAudio}>
            <Ionicons name="cloud-upload-outline" size={16} color="#000" />
            <Text style={[s.btnTxt, { color: "#000" }]}>📁 ஒலி கோப்பு பதிவேற்று</Text>
          </TouchableOpacity>
        )}
        <Field label="அல்லது URL ஒட்டு" value={form.audioUrl} onChangeText={v => setForm(f => ({ ...f, audioUrl: v }))} placeholder="https://..." />

        <View style={s.formBtns}>
          {editId && (
            <TouchableOpacity style={[s.btn, s.btnGray]} onPress={() => { setEditId(null); setForm({ categoryId: "", subcategoryId: "", titleTa: "", titleEn: "", audioUrl: "", description: "" }); }}>
              <Text style={s.btnTxt}>ரத்து</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, s.btnGreen, { flex: 1 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={s.btnTxt}>{editId ? "சேமி" : "➕ Card சேர்"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Card list */}
      <Text style={s.listTitle}>Cards ({cards.length})</Text>
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : cards.length === 0 ? (
        <Text style={s.emptyTxt}>இன்னும் Cards இல்லை. மேலே சேர்க்கவும்.</Text>
      ) : (
        cards.map(card => (
          <View key={card.id} style={s.listRow}>
            <View style={[s.audioIcon, { backgroundColor: card.audioUrl ? "#e8f5ee" : "#f5e8e8" }]}>
              <Ionicons name={card.audioUrl ? "musical-note" : "musical-note-outline"} size={16} color={card.audioUrl ? C.green : C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowMain} numberOfLines={1}>{card.titleTa || card.titleEn}</Text>
              <Text style={s.rowSub}>{catName(card.categoryId)} › {subName(card.subcategoryId)}</Text>
              {card.hasQuiz && (
                <View style={s.quizPill}>
                  <Ionicons name="help-circle" size={11} color={C.green} />
                  <Text style={s.quizPillTxt}>{(card.quiz ?? []).length} கேள்விகள்</Text>
                </View>
              )}
            </View>
            {/* Quiz editor button */}
            <Pressable
              onPress={() => router.push(`/admin/firebase/quiz/${card.id}` as any)}
              style={[s.iconBtn, { backgroundColor: "#e8f5ee", borderColor: C.green + "55" }]}
              hitSlop={10}
            >
              <Ionicons name="help-circle-outline" size={16} color={C.green} />
            </Pressable>
            <Pressable
              onPress={() => {
                setEditId(card.id);
                setForm({ categoryId: card.categoryId, subcategoryId: card.subcategoryId, titleTa: card.titleTa, titleEn: card.titleEn, audioUrl: card.audioUrl, description: card.description });
              }}
              style={s.iconBtn} hitSlop={10}
            >
              <Ionicons name="pencil" size={16} color={C.green} />
            </Pressable>
            <Pressable onPress={() => remove(card.id, card.titleTa || card.titleEn)} style={s.iconBtn} hitSlop={10}>
              <Ionicons name="trash" size={16} color={C.red} />
            </Pressable>
          </View>
        ))
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FirebaseAdminScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("categories");

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "categories",    label: "பிரிவுகள்",    icon: "layers-outline" },
    { id: "subcategories", label: "உப-பிரிவுகள்", icon: "git-branch-outline" },
    { id: "cards",         label: "Cards",         icon: "musical-notes-outline" },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={C.green} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🔥 Firebase CMS</Text>
          <Text style={s.headerSub}>categories → subcategories → cards</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tabItem, tab === t.id && s.tabActive]}>
            <Ionicons name={t.icon as any} size={16} color={tab === t.id ? C.green : C.sub} />
            <Text style={[s.tabTxt, tab === t.id && { color: C.green, fontWeight: "700" }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {tab === "categories"    && <CategoryManager />}
      {tab === "subcategories" && <SubcategoryManager />}
      {tab === "cards"         && <CardManager />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },

  header:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "#fff" },
  backBtn:     { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.txt },
  headerSub:   { fontSize: 11, color: C.sub },

  tabs:        { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: C.border },
  tabItem:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  tabActive:   { borderBottomWidth: 2.5, borderBottomColor: C.green },
  tabTxt:      { fontSize: 11, color: C.sub, fontWeight: "500" },

  mgr:         { padding: 16 },

  formCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  formTitle:   { fontSize: 15, fontWeight: "800", color: C.txt, marginBottom: 14 },
  formBtns:    { flexDirection: "row", gap: 10, marginTop: 6 },

  fieldWrap:   { marginBottom: 12 },
  fieldLabel:  { fontSize: 12, fontWeight: "600", color: C.sub, marginBottom: 6 },
  fieldInput:  { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.txt, backgroundColor: C.bg },

  chipScroll:  { marginBottom: 12 },
  chip:        { borderWidth: 1.5, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: "#fff" },
  chipTxt:     { fontSize: 13, color: C.txt, fontWeight: "500" },

  btn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  btnGreen:    { backgroundColor: C.green },
  btnGray:     { backgroundColor: "#ccc", paddingHorizontal: 20 },
  btnTxt:      { color: "#fff", fontWeight: "700", fontSize: 14 },

  audioRow:    { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginBottom: 12 },
  audioTxt:    { fontSize: 13, color: C.sub, flex: 1 },
  audioIcon:   { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  listTitle:   { fontSize: 14, fontWeight: "700", color: C.sub, marginBottom: 10 },
  emptyTxt:    { textAlign: "center", color: C.sub, marginTop: 20, fontStyle: "italic" },
  listRow:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  rowIcon:     { fontSize: 22, width: 34 },
  rowMain:     { fontSize: 14, fontWeight: "600", color: C.txt },
  rowSub:      { fontSize: 11, color: C.sub, marginTop: 2 },
  colorDot:    { width: 14, height: 14, borderRadius: 7 },
  iconBtn:     { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  quizPill:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  quizPillTxt: { fontSize: 10, color: C.green, fontWeight: "700" },
});
