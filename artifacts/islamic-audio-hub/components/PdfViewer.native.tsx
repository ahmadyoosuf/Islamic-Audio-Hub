// Native inline PDF viewer (Android/iOS).
// Renders ALL pages, one by one, vertically scrollable — no external browser.
// react-native-pdf is require()'d lazily and guarded so a missing native module
// (e.g. Expo Go) shows an in-app message instead of hard-crashing the screen.

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

let Pdf: any = null;
let pdfUnavailable = false;
try {
  Pdf = require("react-native-pdf").default;
} catch {
  pdfUnavailable = true;
}

interface Props {
  url: string;
  isDark: boolean;
}

function Notice({ icon, text, isDark }: { icon: any; text: string; isDark: boolean }) {
  return (
    <View style={styles.notice}>
      <Ionicons name={icon} size={48} color="#888" />
      <Text style={[styles.noticeTxt, { color: isDark ? "#aaa" : "#5a7a64" }]}>{text}</Text>
    </View>
  );
}

export default function PdfViewer({ url, isDark }: Props) {
  const [pages, setPages]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const bg = isDark ? "#0a0a0a" : "#e9eef0";

  if (!Pdf || pdfUnavailable) {
    return <Notice icon="document-text-outline" text="PDF viewer requires the installed app build." isDark={isDark} />;
  }
  if (!url) {
    return <Notice icon="easel-outline" text="Slide இன்னும் சேர்க்கப்படவில்லை" isDark={isDark} />;
  }
  if (error) {
    return <Notice icon="alert-circle-outline" text="PDF-ஐ ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்." isDark={isDark} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Pdf
        source={{ uri: url, cache: true }}
        trustAllCerts={false}
        horizontal={false}
        enablePaging={false}
        fitPolicy={0}
        spacing={8}
        style={[styles.pdf, { backgroundColor: bg }]}
        onLoadComplete={(numberOfPages: number) => { setPages(numberOfPages); setLoading(false); }}
        onPageChanged={(p: number) => setPage(p)}
        onError={() => { setError(true); setLoading(false); }}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#1a7a4a" />
        </View>
      )}

      {pages > 0 && (
        <View style={styles.badge}>
          <Ionicons name="document-text" size={13} color="#fff" />
          <Text style={styles.badgeTxt}>{page} / {pages}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  pdf:     { flex: 1, width: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", bottom: 14, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#000000aa", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  badgeTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  notice:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  noticeTxt: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
