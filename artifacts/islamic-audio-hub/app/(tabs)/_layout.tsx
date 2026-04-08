import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import RequestModal from "@/components/RequestModal";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const [showRequest, setShowRequest] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#f0bc42",
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : isDark ? "#0a0a0a" : "#ffffff",
            borderTopWidth: 1,
            borderTopColor: isDark ? "#242424" : "#d4e8d4",
            elevation: 0,
            ...(isWeb ? { height: 84 } : { height: 60 }),
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: "600",
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: isDark ? "#0a0a0a" : "#ffffff" },
                ]}
              />
            ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "முகப்பு",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: "பிடித்தவை",
            tabBarIcon: ({ color }) => (
              <Ionicons name="heart" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "சுயவிவரம்",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: "பற்றி",
            tabBarIcon: ({ color }) => (
              <Ionicons name="information-circle" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="request"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowRequest(true);
            },
          }}
          options={{
            title: "கோரிக்கை",
            tabBarIcon: ({ color }) => (
              <Ionicons name="sparkles" size={22} color={color} />
            ),
          }}
        />
      </Tabs>
      <RequestModal visible={showRequest} onClose={() => setShowRequest(false)} />
    </>
  );
}
