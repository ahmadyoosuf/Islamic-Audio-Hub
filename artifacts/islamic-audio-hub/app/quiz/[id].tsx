import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import QuizModal from "@/components/QuizModal";
import { TRACKS, QUIZ_QUESTIONS } from "@/data/categories";

export default function QuizPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const track = TRACKS.find((t) => t.id === id);

  const handleClose = () => {
    setVisible(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  if (!id || !track) return <View style={styles.bg} />;

  return (
    <View style={styles.bg}>
      <QuizModal
        visible={visible}
        onClose={handleClose}
        trackId={id}
        trackTitle={track.title}
        prizeEnabled={track.prizeEnabled ?? false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
});
