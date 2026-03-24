import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  
  const router = useRouter();
  const segments = useSegments();

  // 1. Sync session with AsyncStorage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          setUserSession(JSON.parse(session));
        } else {
          setUserSession(null);
        }
      } catch (e) {
        console.error("Session Load Error:", e);
      } finally {
        setIsInitializing(false);
      }
    };
    loadSession();
  }, [segments]); // Re-check session whenever navigation segments change

  // 2. Navigation Guard
  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === "(student)" || segments[0] === "(teacher)";
    const isLoggedIn = !!userSession;

    if (!isLoggedIn && inAuthGroup) {
      // If NOT logged in but trying to access protected folders -> Force Login
      router.replace("/");
    } else if (isLoggedIn) {
      const isTeacher = userSession.role === "teacher";
      const correctGroup = isTeacher ? "(teacher)" : "(student)";

      // Only redirect if the user is at the login screen or in the WRONG group
      if (!inAuthGroup || segments[0] !== correctGroup) {
        const targetPath = isTeacher ? "/(teacher)/home" : "/(student)/home";
        router.replace(targetPath as any);
      }
    }
  }, [userSession, segments, isInitializing]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1d9bf0" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(student)" />
    </Stack>
  );
}