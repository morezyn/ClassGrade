import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddStudent() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAddStudent = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      // This matches your Teacher format EXACTLY
      await addDoc(collection(db, 'users'), {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        password: password, 
        role: "student", 
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Student registered successfully.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      {/* Header aligned with Home.tsx */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Student</Text>
        <TouchableOpacity onPress={handleAddStudent} disabled={loading}>
            <Text style={[styles.saveBtnText, loading && { opacity: 0.5 }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={fullName} 
              onChangeText={setFullName} 
              placeholder="e.g. Sam August"
              placeholderTextColor="#555"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput 
              style={styles.input} 
              value={username} 
              onChangeText={setUsername} 
              placeholder="e.g. sam"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input} 
              value={password} 
              onChangeText={setPassword} 
              placeholder="Assign password"
              placeholderTextColor="#555"
              secureTextEntry
            />
          </View>

          {loading && <ActivityIndicator color="#1d9bf0" style={{ marginTop: 20 }} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 90,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  saveBtnText: { color: '#1d9bf0', fontSize: 16, fontWeight: '700' },
  backBtn: { padding: 5 },
  scrollContent: { padding: 20 },
  form: { marginTop: 10 },
  inputGroup: { marginBottom: 25 },
  label: { color: '#71767b', fontSize: 14, marginBottom: 8 },
  input: { 
    fontSize: 18, 
    color: '#fff', 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#333', 
    paddingVertical: 10 
  },
});