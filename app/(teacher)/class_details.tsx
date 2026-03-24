import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, ActivityIndicator, Alert, Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { 
  doc, onSnapshot, updateDoc, collection, 
  getDocs, arrayUnion, arrayRemove 
} from 'firebase/firestore';

// --- HELPER: TIME CONFLICT ENGINE ---
const checkConflict = (timeStr1: string, timeStr2: string) => {
  if (!timeStr1 || !timeStr2) return false;

  const parseTime = (str: string) => {
    // Regex to separate Days (TTH, MWF, etc) from the Time Range
    const match = str.match(/^([A-Z]+)\s+(.+)$/);
    if (!match) return null;
    
    const days = match[1];
    const range = match[2];
    const [start, end] = range.split('-').map(t => t.trim());
    
    const toMinutes = (time: string) => {
      let [h, m_part] = time.split(':');
      let [m, period] = m_part.split(' ');
      let hours = parseInt(h);
      let mins = parseInt(m);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + mins;
    };

    return { days, start: toMinutes(start), end: toMinutes(end) };
  };

  try {
    const t1 = parseTime(timeStr1);
    const t2 = parseTime(timeStr2);
    if (!t1 || !t2) return false;

    // Check if they share any common day letters
    const commonDay = [...t1.days].some(d => t2.days.includes(d));
    if (!commonDay) return false;

    // Standard overlap formula: (StartA < EndB) and (StartB < EndA)
    return t1.start < t2.end && t2.start < t1.end;
  } catch (e) {
    return false;
  }
};

export default function ClassDetails() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  
  const [linkedSubjects, setLinkedSubjects] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [tempSelection, setTempSelection] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const unsubClass = onSnapshot(doc(db, "classes", id), (snap) => {
      if (snap.exists()) {
        setLinkedSubjects(snap.data()?.subjects || []);
      }
    });

    const fetchSubjects = async () => {
      try {
        const snap = await getDocs(collection(db, "subjects"));
        setAllSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
    return () => unsubClass();
  }, [id]);

  const handleToggleSelection = (subject: any) => {
    const isSelected = tempSelection.find(s => s.id === subject.id);
    if (isSelected) {
      setTempSelection(tempSelection.filter(s => s.id !== subject.id));
    } else {
      // Check against already linked AND current temp selection
      const hasConflict = [...linkedSubjects, ...tempSelection].some(s => 
        checkConflict(s.time, subject.time)
      );
      if (hasConflict) return; // Logic block: button should be disabled anyway
      setTempSelection([...tempSelection, subject]);
    }
  };

  const handleBulkLink = async () => {
    if (tempSelection.length === 0) return;
    const linksToAdd = tempSelection.map(s => ({
      subjectId: s.id,
      courseCode: s.courseCode,
      courseTitle: s.courseTitle,
      time: s.time,
      room: s.room,
      instructor: s.instructor
    }));

    try {
      await updateDoc(doc(db, "classes", id as string), {
        subjects: arrayUnion(...linksToAdd)
      });
      setTempSelection([]);
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Failed to link subjects.");
    }
  };

  const removeSubject = async (item: any) => {
    await updateDoc(doc(db, "classes", id as string), {
      subjects: arrayRemove(item)
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>Class Schedule</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Link Subjects</Text>
        </TouchableOpacity>
      </View>

      {/* Main Schedule List */}
      <FlatList
        data={linkedSubjects}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.scheduleCard}>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.courseCode}>{item.courseCode}</Text>
                <Text style={styles.roomText}>{item.room}</Text>
              </View>
              <Text style={styles.courseTitle}>{item.courseTitle}</Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={14} color="#00ba7c" />
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeSubject(item)}>
              <Ionicons name="close-circle" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No subjects scheduled.</Text>}
      />

      {/* Multi-Select Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Subjects</Text>
            
            <FlatList
              data={allSubjects}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => {
                const isSelected = tempSelection.find(s => s.id === item.id);
                const isAlreadyLinked = linkedSubjects.some(s => s.subjectId === item.id);
                const hasConflict = !isSelected && !isAlreadyLinked && (
                  [...linkedSubjects, ...tempSelection].some(s => checkConflict(s.time, item.time))
                );

                return (
                  <TouchableOpacity 
                    disabled={isAlreadyLinked || hasConflict}
                    style={[
                      styles.subjectItem, 
                      isSelected && styles.selectedItem,
                      isAlreadyLinked && styles.disabledItem,
                      hasConflict && styles.conflictItem
                    ]}
                    onPress={() => handleToggleSelection(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemCode, hasConflict && { color: '#ff4444' }]}>
                        {item.courseCode} {hasConflict && "(Conflict)"}
                      </Text>
                      <Text style={styles.itemTitle}>{item.courseTitle}</Text>
                      <Text style={styles.itemTime}>{item.time}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color="#00ba7c" />}
                    {hasConflict && <Ionicons name="warning" size={24} color="#ff4444" />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: Dimensions.get('window').height * 0.6 }}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setTempSelection([]); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, tempSelection.length === 0 && { opacity: 0.5 }]} 
                onPress={handleBulkLink}
                disabled={tempSelection.length === 0}
              >
                <Text style={styles.saveText}>Link {tempSelection.length} Subjects</Text>
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
  backBtn: { marginRight: 15 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#00ba7c', fontSize: 12, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#00ba7c', flexDirection: 'row', padding: 10, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
  scheduleCard: { 
    flexDirection: 'row', backgroundColor: '#080808', marginHorizontal: 20, marginBottom: 15, 
    borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' 
  },
  infoBox: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  courseCode: { color: '#00ba7c', fontWeight: 'bold', fontSize: 14 },
  roomText: { color: '#666', fontSize: 12 },
  courseTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#888', fontSize: 13, marginLeft: 5 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#111', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  subjectItem: { padding: 15, borderRadius: 16, marginBottom: 12, backgroundColor: '#000', borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center' },
  selectedItem: { borderColor: '#00ba7c', backgroundColor: '#00ba7c10' },
  conflictItem: { borderColor: '#ff4444', backgroundColor: '#ff444410', shadowColor: '#ff4444', shadowRadius: 10, shadowOpacity: 0.3, elevation: 5 },
  disabledItem: { opacity: 0.2 },
  itemCode: { color: '#00ba7c', fontSize: 11, fontWeight: 'bold' },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemTime: { color: '#555', fontSize: 11, marginTop: 2 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center' },
  cancelText: { color: '#666', marginRight: 25, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#00ba7c', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  saveText: { color: '#fff', fontWeight: 'bold' }
});