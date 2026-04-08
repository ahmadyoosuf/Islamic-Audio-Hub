import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface RequestModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  "குர்ஆன் விளக்கம்",
  "ஹதீஸ் விளக்கம்",
  "ஈமான் அடிப்படைகள்",
  "நபி வரலாறு",
  "அன்றாட வழிகாட்டி",
  "பிற",
];

export default function RequestModal({ visible, onClose }: RequestModalProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
  };

  const handleClose = () => {
    setTitle("");
    setDesc("");
    setSelectedCat("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#0a0a0a" : "#f6faf6",
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: "#f0bc42" }]}>
            கோரிக்கை
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {!submitted ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.infoBox,
                { backgroundColor: isDark ? "#141414" : "#e8f5e9", borderColor: "#f0bc4244" },
              ]}
            >
              <Ionicons name="information-circle" size={18} color="#f0bc42" />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                புதிய பாடங்கள் அல்லது தலைப்புகள் கோரலாம். உங்கள் கோரிக்கைகளை
                நாங்கள் ஆய்வு செய்வோம்.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>
              பாடத்தின் தலைப்பு *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="உதாரணம்: சூரா யாஸீன் விளக்கம்"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#141414" : "#ffffff",
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              பிரிவு
            </Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCat(cat === selectedCat ? "" : cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        selectedCat === cat
                          ? "#f0bc42"
                          : isDark
                            ? "#141414"
                            : "#ffffff",
                      borderColor:
                        selectedCat === cat ? "#f0bc42" : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      {
                        color: selectedCat === cat ? "#000" : colors.foreground,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>
              விளக்கம் (விரும்பினால்)
            </Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="இந்த பாடத்தைப் பற்றி கூடுதல் தகவல்..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark ? "#141414" : "#ffffff",
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />

            <Pressable
              onPress={handleSubmit}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: title.trim() ? "#f0bc42" : "#444",
                },
              ]}
            >
              <Ionicons name="send" size={18} color={title.trim() ? "#000" : "#888"} />
              <Text
                style={[
                  styles.submitText,
                  { color: title.trim() ? "#000" : "#888" },
                ]}
              >
                கோரிக்கை அனுப்பு
              </Text>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={styles.successContainer}>
            <View
              style={[
                styles.successCard,
                { backgroundColor: isDark ? "#141414" : "#ffffff" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={72} color="#f0bc42" />
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                கோரிக்கை அனுப்பப்பட்டது!
              </Text>
              <Text
                style={[styles.successDesc, { color: colors.mutedForeground }]}
              >
                உங்கள் கோரிக்கையை பெற்றுக்கொண்டோம். நாங்கள் விரைவில்
                ஆய்வு செய்வோம்.
              </Text>
              <Pressable
                onPress={handleClose}
                style={[styles.doneBtn, { backgroundColor: "#f0bc42" }]}
              >
                <Text style={styles.doneBtnText}>முடித்தது</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
    gap: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  textArea: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "800",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
  },
  successCard: {
    padding: 32,
    alignItems: "center",
    gap: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  successDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
