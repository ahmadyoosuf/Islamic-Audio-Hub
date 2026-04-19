import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { AudioProvider } from "@/context/AudioContext";
import { CoinsProvider } from "@/context/CoinsContext";

// ─── One-time cleanup of legacy seeded AsyncStorage data ─────────────────────
// Removes built-in categories/tracks that were auto-seeded by old code.
// Runs exactly once per device (controlled by the cleanup version key).
const CLEANUP_KEY = "data_cleanup_v2";
async function clearLegacySeedData() {
  try {
    const done = await AsyncStorage.getItem(CLEANUP_KEY);
    if (done === "1") return;
    await AsyncStorage.multiRemove([
      "db_categories_v1",
      "db_tracks_v4",
      "db_initialized_v4",
    ]);
    await AsyncStorage.setItem(CLEANUP_KEY, "1");
    console.log("[Startup] Legacy seeded data cleared from AsyncStorage.");
  } catch (err) {
    console.warn("[Startup] clearLegacySeedData error:", err);
  }
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="category/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="audio/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Clear legacy seeded data from AsyncStorage once on startup
  useEffect(() => { clearLegacySeedData(); }, []);

  // Force-proceed after 4 seconds even if fonts haven't loaded/errored
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const isReady = fontsLoaded || !!fontError || forceReady;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <CoinsProvider>
              <AudioProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </AudioProvider>
            </CoinsProvider>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
