import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, Modal, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../../config/firebase';
import { 
  collection, addDoc, onSnapshot, query, 
  serverTimestamp, doc, deleteDoc, updateDoc 
} from 'firebase/firestore';

interface Classroom {
  id: string;
  className: string;
  studentCount: number;
}

export default function ClassManagement() {
  const router = useRouter();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);

  useEffect(() => {
    const q = query(collection(db, "classes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classList = snapshot.docs.map(doc => ({
        id: doc.id,
        className: doc.data().className,
        studentCount: doc.data().studentIds?.length || 0,
      }));
      setClasses(classList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveClass = async () => {
    if (newClassName.trim() === '') return;
    
    try {
      if (editingClass) {
        await updateDoc(doc(db, "classes", editingClass.id), {
          className: newClassName,
        });
      } else {
        await addDoc(collection(db, "classes"), {
          className: newClassName,
          studentIds: [],
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      console.error("Firebase Error:", error);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Class", "Are you sure? This will remove the classroom record.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, "classes", id)) }
    ]);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingClass(null);
    setNewClassName('');
  };

  const renderClassItem = ({ item }: { item: Classroom }) => (
    <View style={styles.classCardContainer}>
      <TouchableOpacity 
        style={styles.classCard}
        onPress={() => router.push({
          pathname: "/(teacher)/class_details",
          params: { id: item.id, name: item.className }
        })}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="school" size={24} color="#00ba7c" />
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.classNameText}>{item.className}</Text>
          <Text style={styles.studentCountText}>{item.studentCount} Students Enrolled</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => {
          setEditingClass(item);
          setNewClassName(item.className);
          setModalVisible(true);
        }}>
          <Ionicons name="pencil" size={20} color="#00ba7c" style={{ marginRight: 15 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item.id)}>
          <Ionicons name="trash" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
            <Text style={styles.title}>Classrooms</Text>
            <Text style={styles.subtitle}>Manage your student groups</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#00ba7c" size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderClassItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No classes found.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingClass ? "Edit Class" : "New Class"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Class Name (e.g. Grade 10 - Rizal)"
              placeholderTextColor="#555"
              value={newClassName}
              onChangeText={setNewClassName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveClass} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{editingClass ? "Update" : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 25 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#00ba7c', fontSize: 12, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#00ba7c', borderRadius: 12, padding: 8 },
  classCardContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808', 
    borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#1a1a1a', paddingRight: 20 
  },
  classCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 18 },
  iconContainer: { backgroundColor: '#00ba7c15', padding: 10, borderRadius: 12, marginRight: 15 },
  classInfo: { flex: 1 },
  classNameText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  studentCountText: { color: '#444', fontSize: 13, marginTop: 4 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#000', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  cancelBtn: { marginRight: 25 },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#00ba7c', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});