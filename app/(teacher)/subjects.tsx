import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { 
  collection, addDoc, onSnapshot, deleteDoc, 
  doc, updateDoc, query, serverTimestamp 
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Added
import { Subject } from '../types';

export default function SubjectsManagement() {
  const router = useRouter(); // Added
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Subject>({
    courseCode: '', courseTitle: '', semester: 'FIRST SEMESTER',
    schoolYear: '2022-2023', creditUnits: '3', time: '',
    room: '', program: 'BSIT', instructor: '', teacherId: 'teacher_01'
  });

  useEffect(() => {
    const q = query(collection(db, 'subjects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subList = snapshot.docs.map(doc => ({ 
        id: doc.id, ...doc.data() 
      })) as Subject[];
      setSubjects(subList);
    });
    return unsubscribe;
  }, []);

  const handleSave = async () => {
    if (!form.courseCode || !form.courseTitle || !form.program) {
      Alert.alert("Required", "Please fill in Code, Title, and Program");
      return;
    }

    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (editingId) {
        await updateDoc(doc(db, 'subjects', editingId), payload);
      } else {
        await addDoc(collection(db, 'subjects'), payload);
      }
      closeModal();
    } catch (error) {
      Alert.alert("Error", "Failed to save subject.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Subject", "This will remove this subject from your list. Continue?", [
      { text: "Cancel", style: 'cancel' },
      { text: "Delete", style: 'destructive', onPress: () => deleteDoc(doc(db, 'subjects', id)) }
    ]);
  };

  const openEdit = (subject: Subject) => {
    setForm(subject);
    setEditingId(subject.id!);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setForm({
      courseCode: '', courseTitle: '', semester: 'FIRST SEMESTER',
      schoolYear: '2022-2023', creditUnits: '3', time : '',
      room: '', program: 'BSIT', instructor: '', teacherId: 'teacher_01'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Manage Subjects</Text>
          <Text style={styles.subtitle}>Course administration & records</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* NEW: Button to link to Subject Records/Export View */}
          <TouchableOpacity 
            style={styles.recordsButton} 
            onPress={() => router.push('/(teacher)/view_subjects')}
          >
            <Ionicons name="document-text" size={22} color="#00ba7c" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={28} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.badgeRow}>
                <Text style={styles.subjectCode}>{item.courseCode}</Text>
                <View style={styles.semesterBadge}>
                   <Text style={styles.semesterBadgeText}>{item.semester === 'FIRST SEMESTER' ? '1ST SEM' : '2ND SEM'}</Text>
                </View>
                <View style={[styles.semesterBadge, { borderColor: '#00ba7c', backgroundColor: '#00ba7c15', marginLeft: 5 }]}>
                   <Text style={[styles.semesterBadgeText, { color: '#00ba7c' }]}>{item.program}</Text>
                </View>
              </View>
              <Text style={styles.subjectTitle}>{item.courseTitle}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={14} color="#71767b" />
                <Text style={styles.subjectInfo}> {item.time} • {item.room} • {item.creditUnits} Units</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionIcon}>
                <Ionicons name="pencil" size={18} color="#1d9bf0" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.actionIcon}>
                <Ionicons name="trash-outline" size={18} color="#f4212e" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalBg}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'New Subject'}</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>SEMESTER</Text>
              <View style={styles.semesterToggleRow}>
                <TouchableOpacity 
                  style={[styles.semesterBtn, form.semester === 'FIRST SEMESTER' && styles.semesterBtnActive]}
                  onPress={() => setForm({...form, semester: 'FIRST SEMESTER'})}
                >
                  <Text style={[styles.semesterBtnText, form.semester === 'FIRST SEMESTER' && styles.semesterBtnTextActive]}>1st Sem</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.semesterBtn, form.semester === 'SECOND SEMESTER' && styles.semesterBtnActive]}
                  onPress={() => setForm({...form, semester: 'SECOND SEMESTER'})}
                >
                  <Text style={[styles.semesterBtnText, form.semester === 'SECOND SEMESTER' && styles.semesterBtnTextActive]}>2nd Sem</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>COURSE DETAILS</Text>
              <TextInput style={styles.input} placeholder="Course Code (e.g. ELEC 4)" placeholderTextColor="#555" value={form.courseCode} onChangeText={t => setForm({...form, courseCode: t})} />
              <TextInput style={styles.input} placeholder="Course Title" placeholderTextColor="#555" value={form.courseTitle} onChangeText={t => setForm({...form, courseTitle: t})} />
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.label}>PROGRAM</Text>
                   <TextInput style={styles.input} placeholder="e.g. BSIT" placeholderTextColor="#555" value={form.program} onChangeText={t => setForm({...form, program: t})} />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.label}>CREDIT UNITS</Text>
                   <TextInput style={styles.input} placeholder="e.g. 3" placeholderTextColor="#555" keyboardType="numeric" value={form.creditUnits} onChangeText={t => setForm({...form, creditUnits: t})} />
                </View>
              </View>

              <Text style={styles.label}>SCHEDULE & VENUE</Text>
              <TextInput style={styles.input} placeholder="Instructor" placeholderTextColor="#555" value={form.instructor} onChangeText={t => setForm({...form, instructor: t})} />
              <TextInput style={styles.input} placeholder="Time (e.g. TTH 10:30AM)" placeholderTextColor="#555" value={form.time} onChangeText={t => setForm({...form, time: t})} />
              <TextInput style={styles.input} placeholder="Room" placeholderTextColor="#555" value={form.room} onChangeText={t => setForm({...form, room: t})} />
              
              <Text style={styles.label}>ACADEMIC YEAR</Text>
              <TextInput style={styles.input} placeholder="School Year" placeholderTextColor="#555" value={form.schoolYear} onChangeText={t => setForm({...form, schoolYear: t})} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, // Added
  title: { fontSize: 24, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 12, color: '#71767b', marginTop: -2 }, // Added
  
  // New Records Button Style
  recordsButton: { 
    backgroundColor: '#00ba7c15', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ba7c40'
  },
  
  addButton: { backgroundColor: '#fff', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#080808', borderRadius: 15, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  cardContent: { flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  subjectCode: { fontWeight: '800', fontSize: 18, color: '#fff', marginRight: 10 },
  semesterBadge: { backgroundColor: '#1d9bf020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#1d9bf0' },
  semesterBadgeText: { color: '#1d9bf0', fontSize: 10, fontWeight: '900' },
  subjectTitle: { color: '#fff', fontSize: 14, opacity: 0.8, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  subjectInfo: { fontSize: 12, color: '#71767b', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10 },
  actionIcon: { padding: 8, backgroundColor: '#16181c', borderRadius: 10, borderWidth: 1, borderColor: '#333639' },
  modalBg: { flex: 1, backgroundColor: '#000' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  label: { color: '#1d9bf0', fontSize: 12, fontWeight: '800', marginBottom: 10, marginTop: 15 },
  input: { backgroundColor: '#16181c', color: '#fff', padding: 16, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#333639', fontSize: 16 },
  semesterToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  semesterBtn: { flex: 1, backgroundColor: '#16181c', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333639' },
  semesterBtnActive: { backgroundColor: '#1d9bf0', borderColor: '#1d9bf0' },
  semesterBtnText: { color: '#71767b', fontWeight: 'bold' },
  semesterBtnTextActive: { color: '#fff' },
  cancelText: { color: '#fff', fontSize: 16 },
  saveText: { color: '#1d9bf0', fontSize: 16, fontWeight: 'bold' },
});