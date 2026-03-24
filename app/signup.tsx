import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!fullName || !username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if username is already taken
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert("Error", "This username is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      // 2. Save the new user to Firestore
      await addDoc(collection(db, "users"), {
        fullName: fullName.trim(),
        username: username.toLowerCase().trim(),
        password: password, // Stored as plain text for this simple Firestore-only setup
        role: role,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Account created!", [
        { text: "Log In", onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not create account. Check your database rules.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <Text style={styles.headerText}>Create account</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#71767b"
            value={fullName}
            onChangeText={setFullName}
          />

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

          <Text style={styles.label}>I am a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleButton, role === 'student' && styles.roleButtonActive]}
              onPress={() => setRole('student')}
            >
              <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.roleButton, role === 'teacher' && styles.roleButtonActive]}
              onPress={() => setRole('teacher')}
            >
              <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>Teacher</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.signupButtonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  headerText: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 30 },
  input: {
    borderWidth: 1, borderColor: '#333639', borderRadius: 4,
    color: '#fff', padding: 16, fontSize: 18, marginBottom: 15
  },
  label: { color: '#71767b', marginBottom: 10, fontSize: 16 },
  roleContainer: { flexDirection: 'row', marginBottom: 30, gap: 10 },
  roleButton: { 
    flex: 1, padding: 12, borderRadius: 25, borderWidth: 1, borderColor: '#333639', alignItems: 'center' 
  },
  roleButtonActive: { backgroundColor: '#1d9bf0', borderColor: '#1d9bf0' },
  roleText: { color: '#fff', fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  signupButton: { backgroundColor: '#fff', borderRadius: 25, paddingVertical: 15, alignItems: 'center' },
  signupButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  footerLink: { color: '#1d9bf0', textAlign: 'center', marginTop: 20, fontSize: 14 }
});