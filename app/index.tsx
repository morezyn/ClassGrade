import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true); // Initial loading for session check
  const router = useRouter();

  // 1. Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          const userData = JSON.parse(session);
          const targetPath = userData.role === "teacher" ? "/(teacher)/home" : "/(student)/home";
          router.replace({
            pathname: targetPath,
            params: { userId: userData.userId },
          });
        }
      } catch (e) {
        console.error("Session check error", e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (requestedRole: "teacher" | "student") => {
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");

      const q = query(
        usersRef,
        where("username", "==", username.toLowerCase().trim()),
        where("password", "==", password),
        where("role", "==", requestedRole)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert(
          "Access Denied",
          `No ${requestedRole} account found with these credentials.`
        );
      } else {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        // 2. Prepare and Save Session
        const sessionData = {
          userId: userId,
          role: requestedRole,
          fullName: userData.fullName || "",
        };

        await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));

        // 3. Navigate to appropriate group
        const targetPath = requestedRole === "teacher" ? "/(teacher)/home" : "/(student)/home";
        
        router.replace({
          pathname: targetPath,
          params: { userId: userId },
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Connection Error", "Failed to reach server.");
    } finally {
      setLoading(false);
    }
  };

  // Show a blank black screen or splash while checking initial session
  if (loading && !username) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#1d9bf0" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>📊</Text>
          <Text style={styles.brandName}>ClassGrade</Text>
        </View>

        <Text style={styles.headerText}>
          Manage grades and generate reports with ease.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#71767b"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#71767b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => handleLogin("teacher")}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginButtonText}>Log in as Teacher</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, styles.outlineButton]}
            onPress={() => handleLogin("student")}
            disabled={loading}
          >
            <Text style={[styles.loginButtonText, { color: "#fff" }]}>
              Log in as Student
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.footerText}>
              Don't have an account?{" "}
              <Text style={styles.linkText}>Sign up here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  inner: { flex: 1, paddingHorizontal: 30, justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  logoText: { fontSize: 50 },
  brandName: { color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  headerText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 32,
  },
  form: { width: "100%" },
  input: {
    backgroundColor: "#16181c",
    borderWidth: 1,
    borderColor: "#333639",
    borderRadius: 8,
    color: "#fff",
    padding: 16,
    fontSize: 16,
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    height: 56,
    justifyContent: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#536471",
    marginTop: 12,
  },
  loginButtonText: { color: "#000", fontSize: 16, fontWeight: "700" },
  footerText: {
    color: "#71767b",
    fontSize: 14,
    textAlign: "center",
    marginTop: 30,
  },
  linkText: { color: "#1d9bf0", fontWeight: "600" },
});