import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AudioPlayer from "@/components/AudioPlayer";
import TrackCard from "@/components/TrackCard";
import { useApp } from "@/context/AppContext";
import { getAllTracks } from "@/data/categories";
import { useColors } from "@/hooks/useColors";

export default function FavoritesScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { favorites } = useApp();
  const allTracks = getAllTracks();
  const favTracks = allTracks.filter((t) => favorites.includes(t.id));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isDark ? "#0f0f0f" : "#f8f9fa" },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: botPad + 80,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          பிடித்தவை
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {favTracks.length} பாடங்கள் சேமிக்கப்பட்டன
        </Text>

        {favTracks.length === 0 ? (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
              ]}
            >
              <Ionicons name="heart-outline" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              பிடித்தவை இல்லை
            </Text>
            <Text
              style={[styles.emptyDesc, { color: colors.mutedForeground }]}
            >
              பாடங்களில் ❤ அழுத்தி உங்கள் பிடித்த பாடங்களை சேர்க்கவும்
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                variant="horizontal"
                playlist={favTracks}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.playerBar,
          { bottom: botPad - (Platform.OS === "web" ? 84 : 60) },
        ]}
      >
        <AudioPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  list: {
    gap: 0,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  playerBar: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
