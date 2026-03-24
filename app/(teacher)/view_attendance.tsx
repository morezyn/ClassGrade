import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { db } from "../../config/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  doc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { AttendanceRecord, Subject } from "../types";

export default function ViewAttendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const STATUS_CONFIG: any = {
    present: { label: "Present", color: "#00ba7c", bg: "#00ba7c20" }, // Green
    late:    { label: "Late",    color: "#ffa500", bg: "#ffa50020" }, // Orange
    absent:  { label: "Absent",  color: "#ff4444", bg: "#ff444420" }, // Red
  };

  // 1. Fetch Subjects
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), (snap) => {
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      setSubjects(subs);
      if (subs.length > 0 && !selectedSubject) setSelectedSubject(subs[0]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Fetch Attendance
  useEffect(() => {
    if (!selectedSubject) return;
    setLoading(true);

    let q = query(collection(db, "attendance"), where("subjectId", "==", selectedSubject.id));
    if (filterDate) q = query(q, where("date", "==", filterDate));

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(docs.sort((a, b) => b.time.localeCompare(a.time)));
      setLoading(false);
    });
    return () => unsub();
  }, [selectedSubject, filterDate]);

  const handleEditStatus = (id: string) => {
    Alert.alert("Edit Status", "Update student status to:", [
      { text: "Present", onPress: () => updateDoc(doc(db, "attendance", id), { status: 'present' }) },
      { text: "Late", onPress: () => updateDoc(doc(db, "attendance", id), { status: 'late' }) },
      { text: "Absent", onPress: () => updateDoc(doc(db, "attendance", id), { status: 'absent' }) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => deleteDoc(doc(db, "attendance", id))}>
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        
        {/* HEADER & DROPDOWN */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Logs</Text>
          
          <TouchableOpacity 
            style={styles.dropdownTrigger} 
            onPress={() => setDropdownVisible(true)}
          >
            <View>
              <Text style={styles.dropdownLabel}>SELECT SUBJECT</Text>
              <Text style={styles.dropdownValue}>
                {selectedSubject ? `${selectedSubject.courseCode} - ${selectedSubject.courseTitle}` : "Select a Subject"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#00ba7c" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dateFilter, filterDate && styles.dateFilterActive]}
            onPress={() => setFilterDate(filterDate ? null : new Date().toISOString().split('T')[0])}
          >
            <Ionicons name="calendar" size={14} color={filterDate ? "#000" : "#555"} />
            <Text style={[styles.dateFilterText, { color: filterDate ? "#000" : "#555" }]}>
              {filterDate ? `Date: ${filterDate}` : "Filter by Today"}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00ba7c" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={attendance}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const config = STATUS_CONFIG[item.status?.toLowerCase()] || STATUS_CONFIG.absent;
              return (
                <Swipeable renderRightActions={() => renderRightActions(item.id!)}>
                  <TouchableOpacity 
                    style={styles.card} 
                    onLongPress={() => handleEditStatus(item.id!)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.studentName}</Text>
                      <Text style={styles.time}>{item.date} • {item.time}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: config.bg }]}>
                      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No logs found for this selection.</Text>}
          />
        )}

        {/* SUBJECT SELECTION MODAL */}
        <Modal visible={dropdownVisible} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Switch Subject</Text>
              <FlatList
                data={subjects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalOption}
                    onPress={() => {
                      setSelectedSubject(item);
                      setDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{item.courseCode} - {item.courseTitle}</Text>
                    {selectedSubject?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#00ba7c" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: "#111" },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 20 },
  dropdownTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#080808', 
    padding: 15, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a'
  },
  dropdownLabel: { color: '#555', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  dropdownValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dateFilter: { flexDirection: 'row', alignItems: 'center', marginTop: 15, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#111' },
  dateFilterActive: { backgroundColor: '#00ba7c' },
  dateFilterText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  card: { backgroundColor: "#000", padding: 20, borderBottomWidth: 1, borderBottomColor: "#111", flexDirection: "row", alignItems: "center" },
  name: { color: "#fff", fontSize: 17, fontWeight: "700" },
  time: { color: "#444", fontSize: 13, marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, minWidth: 80, alignItems: "center" },
  badgeText: { fontSize: 10, fontWeight: "900" },
  deleteAction: { backgroundColor: '#ff4444', justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteActionText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#080808', borderRadius: 20, padding: 20, maxHeight: '70%', borderWidth: 1, borderColor: '#222' },
  modalHeader: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#111' },
  modalOptionText: { color: '#eee', fontSize: 14, fontWeight: '600' },
  empty: { color: "#333", textAlign: "center", marginTop: 50 },
});