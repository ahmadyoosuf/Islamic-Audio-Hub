import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,

} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AudioPlayer from "@/components/AudioPlayer";
import { useApp } from "@/context/AppContext";

import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, recentTracks, isDarkMode, toggleDarkMode, playbackProgress } = useApp();
  const isDark = isDarkMode;

  const totalListened = Object.values(playbackProgress).reduce(
    (sum, p) => sum + p.progressSeconds,
    0,
  );
  const hoursListened = Math.floor(totalListened / 3600);

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
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={["#c8a84b22", "transparent"]}
            style={styles.profileGrad}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: "#c8a84b22", borderColor: "#c8a84b" },
              ]}
            >
              <Ionicons name="person" size={40} color="#c8a84b" />
            </View>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              நண்பரே, வணக்கம்!
            </Text>
            <Text style={[styles.userSub, { color: colors.mutedForeground }]}>
              Islamic Audio Hub கேட்பாளர்
            </Text>
            <View style={styles.freeBadge}>
              <Ionicons name="person-circle" size={14} color="#c8a84b" />
              <Text style={[styles.freeBadgeText, { color: "#c8a84b" }]}>
                இலவச உறுப்பினர்
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            value={favorites.length.toString()}
            label="பிடித்தவை"
            icon="heart"
            color="#ef4444"
            isDark={isDark}
            colors={colors}
          />
          <StatCard
            value={hoursListened.toString()}
            label="மணிகள்"
            icon="headset"
            color="#c8a84b"
            isDark={isDark}
            colors={colors}
          />
          <StatCard
            value={recentTracks.length.toString()}
            label="கேட்டவை"
            icon="musical-notes"
            color="#60a5fa"
            isDark={isDark}
            colors={colors}
          />
        </View>

        <View style={styles.subscribeCard}>
          <LinearGradient
            colors={["#c8a84b", "#a08030"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeGrad}
          >
            <View>
              <Text style={styles.subscribeTitle}>Gold உறுப்பினரா?</Text>
              <Text style={styles.subscribeSub}>
                அனைத்து பாடங்களும் கேட்கலாம்
              </Text>
            </View>
            <View style={styles.subscribePrice}>
              <Text style={styles.subscribeAmount}>₹99</Text>
              <Text style={styles.subscribeMonth}>/மாதம்</Text>
            </View>
          </LinearGradient>
          <View
            style={[
              styles.subscribeBenefits,
              { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
            ]}
          >
            {[
              "106+ தமிழ் இஸ்லாமிய பாடங்கள்",
              "கேள்வி-பதில் விளையாட்டு",
              "தரவிறக்கம் செய்யலாம்",
              "அறிவிப்புகள் பெறலாம்",
            ].map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#c8a84b" />
                <Text style={[styles.benefitText, { color: colors.foreground }]}>
                  {b}
                </Text>
              </View>
            ))}
            <Pressable style={styles.upgradeBtn}>
              <LinearGradient
                colors={["#c8a84b", "#a08030"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeBtnGrad}
              >
                <Text style={styles.upgradeBtnText}>Gold உறுப்பினராக சேர</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            அமைப்புகள்
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
            ]}
          >
            <SettingRow
              icon="moon"
              label="இருண்ட வடிவம்"
              colors={colors}
              isDark={isDark}
              right={
                <Pressable
                  onPress={toggleDarkMode}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: isDark ? "#c8a84b" : "#e2e8f0",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      {
                        backgroundColor: "#fff",
                        transform: [{ translateX: isDark ? 20 : 2 }],
                      },
                    ]}
                  />
                </Pressable>
              }
            />
            <SettingRow
              icon="notifications"
              label="அறிவிப்புகள்"
              colors={colors}
              isDark={isDark}
            />
            <SettingRow
              icon="share-social"
              label="பகிர்வு"
              colors={colors}
              isDark={isDark}
              last
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <TouchableOpacity
            style={[
              styles.adminButton,
              { backgroundColor: isDark ? "#1a1510" : "#fef9ec" },
            ]}
            onPress={() => router.push('/admin/login')}
            activeOpacity={0.8}
          >
            <View style={styles.adminButtonLeft}>
              <View style={styles.adminIconBox}>
                <Ionicons name="shield-checkmark" size={20} color="#f0bc42" />
              </View>
              <View>
                <Text style={[styles.adminBtnTitle, { color: isDark ? "#f0bc42" : "#b8860b" }]}>
                  Admin Panel
                </Text>
                <Text style={[styles.adminBtnSub, { color: isDark ? "#888" : "#aaa" }]}>
                  Audio & Quiz நிர்வாகம்
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#f0bc42" />
          </TouchableOpacity>
        </View>

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

function StatCard({
  value,
  label,
  icon,
  color,
  isDark,
  colors,
}: {
  value: string;
  label: string;
  icon: string;
  color: string;
  isDark: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" },
      ]}
    >
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  colors,
  isDark,
  right,
  last,
}: {
  icon: string;
  label: string;
  colors: any;
  isDark: boolean;
  right?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.settingRow,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#2a2a2a" : "#e2e8f0",
        },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: "#c8a84b22" }]}>
        <Ionicons name={icon as any} size={18} color="#c8a84b" />
      </View>
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      {right ?? (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  profileHeader: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#c8a84b44",
  },
  profileGrad: {
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
  },
  userSub: {
    fontSize: 13,
  },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#c8a84b22",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c8a84b55",
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
  },
  subscribeCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  subscribeGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  subscribeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  subscribeSub: {
    fontSize: 12,
    color: "#00000088",
    marginTop: 2,
  },
  subscribePrice: {
    alignItems: "flex-end",
  },
  subscribeAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
  },
  subscribeMonth: {
    fontSize: 11,
    color: "#00000088",
  },
  subscribeBenefits: {
    padding: 16,
    gap: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
  },
  upgradeBtn: {
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  upgradeBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  settingsSection: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  settingsCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0bc4244",
  },
  adminButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  adminIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0bc4222",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  adminBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  playerBar: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
