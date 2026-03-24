import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, ScrollView, Alert 
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StudentProfile() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          const { userId } = JSON.parse(session);
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            setUserData({ ...userDoc.data(), id: userDoc.id });
          }
        }
      } catch (e) {
        console.error("Error fetching student profile:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("userSession");
            await signOut(auth);
            router.replace("/");
          } catch (e) {
            console.error("Logout error", e);
          }
        } 
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d9bf0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarCircle, { backgroundColor: '#00ba7c' }]}>
            <Text style={styles.avatarInitial}>
              {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : "S"}
            </Text>
          </View>
          <Text style={styles.name}>{userData?.fullName || "Student"}</Text>
          <View style={styles.roleBadgeContainer}>
            <Text style={styles.roleBadgeText}>STUDENT</Text>
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Info</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="at-outline" size={20} color="#71767b" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>@{userData?.username || 'n/a'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#71767b" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Student ID</Text>
              <Text style={styles.infoValue}>{userData?.id?.substring(0, 8).toUpperCase() || 'n/a'}</Text>
            </View>
          </View>
        </View>

        {/* Settings & Logout */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => router.push("/(student)/grades")}
          >
            <Ionicons name="stats-chart-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>View My Grades</Text>
            <Ionicons name="chevron-forward" size={18} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#f4212e" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 28 },
  backButton: { padding: 5 },
  scrollContent: { paddingBottom: 40 },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarInitial: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  roleBadgeContainer: {
    marginTop: 5,
    backgroundColor: 'rgba(0, 186, 124, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  roleBadgeText: { color: '#00ba7c', fontSize: 12, fontWeight: 'bold' },
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: {
    color: '#71767b',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 15,
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#0A0A0A',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
  },
  infoTextContainer: { marginLeft: 15 },
  infoLabel: { color: '#71767b', fontSize: 12 },
  infoValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16181c',
    padding: 18,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, marginLeft: 15 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginTop: 10,
  },
  logoutText: { color: '#f4212e', fontSize: 16, fontWeight: '700', marginLeft: 10 },
});