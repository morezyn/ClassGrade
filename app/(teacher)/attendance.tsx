import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import your centralized types
import { User, Subject } from "../types";

const CACHE_KEYS = {
  STUDENTS: "offline_students",
  SUBJECTS: "offline_subjects",
  PENDING_ATTENDANCE: "pending_attendance_sync",
};

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [attendance, setAttendance] = useState<
    Record<string, "present" | "absent" | "late">
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  // --- CACHING LOGIC ---
  const saveToCache = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`[Cache Success] ${key} updated locally.`);
    } catch (e) {
      console.error(`[Cache Error] Failed to save ${key}:`, e);
    }
  };

  const loadFromCache = async () => {
    try {
      const cachedSubs = await AsyncStorage.getItem(CACHE_KEYS.SUBJECTS);
      const cachedStuds = await AsyncStorage.getItem(CACHE_KEYS.STUDENTS);

      if (cachedSubs) {
        const parsedSubs = JSON.parse(cachedSubs);
        setSubjects(parsedSubs);
        if (!selectedSubject) setSelectedSubject(parsedSubs[0]);
      }

      if (cachedStuds) {
        const parsedStuds = JSON.parse(cachedStuds);
        setStudents(parsedStuds);
        initializeAttendance(parsedStuds);
      }
    } catch (e) {
      console.error("[Cache Error] Failed to load offline data:", e);
    }
  };

  const initializeAttendance = (studentList: User[]) => {
    setAttendance((prev) => {
      const updated = { ...prev };
      studentList.forEach((s) => {
        if (!updated[s.id]) updated[s.id] = "present";
      });
      return updated;
    });
  };

  // --- DATA SYNC ---
  useEffect(() => {
    loadFromCache().finally(() => setLoading(false));

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const subjectList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Subject[];
      setSubjects(subjectList);
      if (subjectList.length > 0 && !selectedSubject)
        setSelectedSubject(subjectList[0]);
      saveToCache(CACHE_KEYS.SUBJECTS, subjectList);
    });

    const studentQuery = query(
      collection(db, "users"),
      where("role", "==", "student"),
    );
    const unsubStudents = onSnapshot(studentQuery, (snapshot) => {
      const studentList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as User[];
      const sorted = studentList.sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || ""),
      );
      setStudents(sorted);
      initializeAttendance(sorted);
      saveToCache(CACHE_KEYS.STUDENTS, sorted);
    });

    return () => {
      unsubSubjects();
      unsubStudents();
    };
  }, []);

  const getSubjectDisplayName = (item: Subject | null) => {
    if (!item) return "Select Subject";
    return item.courseTitle || "Unnamed Subject";
  };

  const toggleStatus = (studentId: string) => {
    setAttendance((prev) => {
      const current = prev[studentId];
      const cycle: ("present" | "absent" | "late")[] = [
        "present",
        "absent",
        "late",
      ];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      return { ...prev, [studentId]: next };
    });
  };

  // --- UPDATED SUBMIT LOGIC (Like grades.tsx) ---
  const saveAttendance = async () => {
    if (!selectedSubject) {
      Alert.alert("Error", "Please select a subject.");
      return;
    }

    setSaving(true);
    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const batchData = students.map((student) => {
        const recordId = `${today}_${selectedSubject.id}_${student.id}`;
        return {
          id: recordId,
          payload: {
            studentId: student.id,
            studentName: student.fullName,
            subjectId: selectedSubject.id,
            subjectName: getSubjectDisplayName(selectedSubject),
            date: today,
            time: currentTime,
            status: attendance[student.id],
            createdAt: serverTimestamp(),
          },
        };
      });

      // 1. Save to manual AsyncStorage queue immediately
      const existingQueue = await AsyncStorage.getItem(
        CACHE_KEYS.PENDING_ATTENDANCE,
      );
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      await AsyncStorage.setItem(
        CACHE_KEYS.PENDING_ATTENDANCE,
        JSON.stringify([...queue, ...batchData]),
      );
      console.log("[Cache Success] Attendance stored in pending queue.");

      // 2. Perform Firestore Writes (Non-blocking .then() just like grades.tsx)
      batchData.forEach((item) => {
        setDoc(doc(db, "attendance", item.id), item.payload, { merge: true })
          .then(() =>
            console.log(
              `[Offline Sync] ${item.payload.studentName} cached successfully`,
            ),
          )
          .catch((e) => console.error("Firestore Save Error:", e));
      });

      // 3. STOP LOADING AND ALERT IMMEDIATELY
      setSaving(false);
      Alert.alert(
        "Success",
        `Attendance for ${getSubjectDisplayName(selectedSubject)} recorded and syncing in the background.`,
        [{ text: "OK", onPress: () => initializeAttendance(students) }], // Optional: resets UI
      );
    } catch (error) {
      setSaving(false);
      console.error("Save Error:", error);
      Alert.alert("Error", "Failed to save attendance locally.");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "present":
        return {
          color: "#00ba7c",
          icon: "checkmark-circle" as const,
          bg: "#00ba7c15",
        };
      case "absent":
        return {
          color: "#f4212e",
          icon: "close-circle" as const,
          bg: "#f4212e15",
        };
      case "late":
        return { color: "#ffd700", icon: "time" as const, bg: "#ffd70015" };
      default:
        return { color: "#71767b", icon: "remove-circle" as const, bg: "#111" };
    }
  };

  if (loading && students.length === 0)
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#00ba7c" size="large" />
      </View>
    );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.dateText}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.logsButton}
          onPress={() => router.push("/(teacher)/view_attendance")}
        >
          <Ionicons name="list" size={18} color="#00ba7c" />
          <Text style={styles.logsButtonText}>Logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>SUBJECT</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.pickerButtonText}>
            {getSubjectDisplayName(selectedSubject)}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#71767b" />
        </TouchableOpacity>
        {selectedSubject && (
          <Text style={styles.subLabel}>
            {selectedSubject.courseCode} • {selectedSubject.time}
          </Text>
        )}
      </View>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={28} color="#71767b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={subjects}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.subjectItem}
                  onPress={() => {
                    setSelectedSubject(item);
                    setShowPicker(false);
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.subjectItemText,
                        selectedSubject?.id === item.id && { color: "#00ba7c" },
                      ]}
                    >
                      {getSubjectDisplayName(item)}
                    </Text>
                    <Text style={styles.subjectSubText}>
                      {item.courseCode} | {item.time}
                    </Text>
                  </View>
                  {selectedSubject?.id === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#00ba7c"
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const statusInfo = getStatusStyle(attendance[item.id] || "present");
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.studentRow, { backgroundColor: statusInfo.bg }]}
              onPress={() => toggleStatus(item.id)}
            >
              <View>
                <Text style={styles.studentName}>{item.fullName}</Text>
                <Text style={styles.studentUser}>@{item.username}</Text>
              </View>
              <View style={styles.statusBox}>
                <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                  {(attendance[item.id] || "present").toUpperCase()}
                </Text>
                <Ionicons
                  name={statusInfo.icon}
                  size={24}
                  color={statusInfo.color}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.saveButton, !selectedSubject && { opacity: 0.5 }]}
        onPress={saveAttendance}
        disabled={saving || !selectedSubject}
      >
        {saving ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.saveButtonText}>Confirm Attendance</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
    paddingBottom: 10,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  dateText: { color: "#71767b", fontSize: 14 },
  logsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00ba7c15",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00ba7c30",
  },
  logsButtonText: {
    color: "#00ba7c",
    fontWeight: "800",
    fontSize: 13,
    marginLeft: 6,
  },
  pickerContainer: { paddingHorizontal: 25, marginVertical: 15 },
  pickerLabel: {
    color: "#71767b",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 1,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  pickerButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  subLabel: { color: "#444", fontSize: 12, marginTop: 8, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0D0D0D",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  subjectItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  subjectItemText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  subjectSubText: { color: "#71767b", fontSize: 13, marginTop: 4 },
  list: { padding: 20, paddingBottom: 120 },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  studentName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  studentUser: { color: "#71767b", fontSize: 12 },
  statusBox: { flexDirection: "row", alignItems: "center" },
  statusLabel: { marginRight: 10, fontSize: 11, fontWeight: "900" },
  saveButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#00ba7c",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
  },
  saveButtonText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
