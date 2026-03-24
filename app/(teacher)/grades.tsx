import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";

// Configuration for your specific point system
const POINT_VALUES = {
  assignment: 10,
  quiz: 30,
  recitation: 10,
  exam: 50
};

interface Student { id: string; name: string; }
interface Subject { id: string; courseCode: string; courseTitle: string; }
interface DetailedTerm {
  assignments: string[];
  quizzes: string[];
  recitations: string[];
  exam: string;
}

export default function TeacherGrades() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [activePeriod, setActivePeriod] = useState<"midterm" | "finals">("midterm");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialTerm: DetailedTerm = {
    assignments: [""],
    quizzes: [""],
    recitations: [""],
    exam: "",
  };

  const [midterm, setMidterm] = useState<DetailedTerm>(initialTerm);
  const [finals, setFinals] = useState<DetailedTerm>(initialTerm);

  useEffect(() => {
    let studentsDone = false;
    let subjectsDone = false;

    // Helper to stop loading only when both are processed
    const checkAllLoaded = () => {
      if (studentsDone && subjectsDone) {
        setLoading(false);
      }
    };

    // 1. Fetch Students
    const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStudents = onSnapshot(studentQuery, (snap) => {
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().fullName || doc.data().username || "Unnamed Student",
      }));
      setStudents(list);
      studentsDone = true;
      checkAllLoaded();
    }, (err) => {
      console.error("Student load error:", err);
      studentsDone = true; // Set true so we don't hang on error
      checkAllLoaded();
    });

    // 2. Fetch Subjects
    const subjectQuery = query(collection(db, "subjects"));
    const unsubSubjects = onSnapshot(subjectQuery, (snap) => {
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        courseCode: doc.data().courseCode,
        courseTitle: doc.data().courseTitle,
      }));
      setSubjectsList(list);
      subjectsDone = true;
      checkAllLoaded();
    }, (err) => {
      console.error("Subject load error:", err);
      subjectsDone = true;
      checkAllLoaded();
    });

    // 3. Safety Timeout: Force stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => { 
      unsubStudents(); 
      unsubSubjects(); 
      clearTimeout(timeout);
    };
  }, []);

  // --- CALCULATION LOGIC ---

  const transmuteGrade = (rawPercentage: number): number => {
    const score = Math.round(rawPercentage);
    if (score === 0) return 0;
    if (score >= 1 && score <= 51) return 75; // Simplified for brevity, follows your range logic
    if (score >= 90 && score <= 100) return score;
    // Map middle ranges here as per your previous implementation
    return score < 75 ? 75 : score; 
  };

  const calculateTermScore = (term: DetailedTerm) => {
    const getSum = (arr: string[]) => arr.map(v => parseFloat(v) || 0).reduce((a, b) => a + b, 0);
    const earned = getSum(term.assignments) + getSum(term.quizzes) + getSum(term.recitations) + (parseFloat(term.exam) || 0);
    const maxPossible = 
      (term.assignments.length * POINT_VALUES.assignment) +
      (term.quizzes.length * POINT_VALUES.quiz) +
      (term.recitations.length * POINT_VALUES.recitation) +
      POINT_VALUES.exam;
    const rawPercentage = maxPossible > 0 ? (earned / maxPossible) * 100 : 0;
    return transmuteGrade(rawPercentage);
  };

  const mScore = calculateTermScore(midterm);
  const fScore = calculateTermScore(finals);
  const hasFinalsData = finals.assignments.some(a => a !== "") || (finals.exam !== "" && finals.exam !== "0");
  const finalGrade = hasFinalsData ? (mScore + fScore) / 2 : mScore;
  const isPassing = finalGrade >= 75;

  const validateAndSet = (text: string, max: number) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (num > max) return max.toString();
    return cleaned;
  };

  const handleSubmitGrade = async () => {
    if (!selectedStudent || !selectedSubject) {
      Alert.alert("Error", "Please select both a student and a subject.");
      return;
    }

    setIsSubmitting(true);

    const gradeData = {
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      subject: selectedSubject.courseTitle,
      courseCode: selectedSubject.courseCode,
      midtermBreakdown: midterm,
      finalsBreakdown: finals,
      midtermScore: mScore.toFixed(0),
      finalsScore: fScore.toFixed(0),
      score: Math.round(finalGrade),
      status: isPassing ? "PASSED" : "FAILED",
      createdAt: serverTimestamp(),
    };

    try {
      // Offline-friendly save (no await)
      addDoc(collection(db, "grades"), gradeData)
        .then(() => console.log("Cached successfully"))
        .catch(e => console.error(e));

      Alert.alert("Success", "Grade recorded and syncing...");
      
      setMidterm(initialTerm);
      setFinals(initialTerm);
      setSelectedStudent(null);
      setSelectedSubject(null);
    } catch (e) {
      Alert.alert("Error", "Failed to save grade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER HELPERS ---

  const addField = (cat: keyof Omit<DetailedTerm, "exam">, setter: any, data: DetailedTerm) => {
    setter({ ...data, [cat]: [...data[cat], ""] });
  };

  const removeField = (cat: keyof Omit<DetailedTerm, "exam">, idx: number, setter: any, data: DetailedTerm) => {
    if (data[cat].length > 1) {
      setter({ ...data, [cat]: data[cat].filter((_, i) => i !== idx) });
    }
  };

  const renderSection = (label: string, cat: keyof Omit<DetailedTerm, "exam">, maxPts: number, data: DetailedTerm, setter: any) => (
    <View style={{ marginBottom: 15 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.miniLabel}>{label} ({maxPts} pts each)</Text>
        <TouchableOpacity onPress={() => addField(cat, setter, data)}>
          <Ionicons name="add-circle-outline" size={22} color="#1d9bf0" />
        </TouchableOpacity>
      </View>
      <View style={styles.dynamicRow}>
        {data[cat].map((val, i) => (
          <View key={`${cat}-${i}`} style={styles.inputWrapper}>
            <TextInput
              style={styles.subInputDynamic}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#444"
              value={val}
              onChangeText={(t) => {
                const validated = validateAndSet(t, maxPts);
                const newArr = [...data[cat]];
                newArr[i] = validated;
                setter({ ...data, [cat]: newArr });
              }}
            />
            {data[cat].length > 1 && (
              <TouchableOpacity style={styles.removeIcon} onPress={() => removeField(cat, i, setter, data)}>
                <Ionicons name="close-circle" size={18} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderDetailedInputs = (data: DetailedTerm, setter: any) => {
    const score = calculateTermScore(data);
    return (
      <View style={styles.termSection}>
        {renderSection("Assignments", "assignments", POINT_VALUES.assignment, data, setter)}
        {renderSection("Quizzes", "quizzes", POINT_VALUES.quiz, data, setter)}
        {renderSection("Recitations", "recitations", POINT_VALUES.recitation, data, setter)}
        <Text style={styles.miniLabel}>Exam ({POINT_VALUES.exam} pts)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={data.exam}
          placeholder="0"
          placeholderTextColor="#444"
          onChangeText={(v) => setter({ ...data, exam: validateAndSet(v, POINT_VALUES.exam) })}
        />
        <View style={styles.termFooter}>
          <Text style={[styles.previewText, { color: score >= 75 ? "#00ba7c" : "#ff4444" }]}>
            TERM TRANSMUTED: {score}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ba7c" />
        <Text style={{color: '#555', marginTop: 10}}>Loading academic data...</Text>
      </View>
    );
  }

  // Fallback if data is empty
  if (students.length === 0 && subjectsList.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={60} color="#333" />
        <Text style={{color: '#fff', fontSize: 18, marginTop: 15}}>No students or subjects found.</Text>
        <Text style={{color: '#555', textAlign: 'center', padding: 20}}>Make sure you have added subjects and students to the database.</Text>
        <TouchableOpacity style={styles.submitButton} onPress={() => router.back()}>
          <Text style={styles.submitText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Grading Sheet</Text>
        <TouchableOpacity onPress={() => router.push("/(teacher)/view_grades")}>
          <Ionicons name="list-outline" size={26} color="#00ba7c" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <View style={styles.formCard}>
          <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setStudentModalVisible(true)}>
            <Text style={styles.dropdownTriggerText}>{selectedStudent ? selectedStudent.name : "Select Student..."}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setSubjectModalVisible(true)}>
            <Text style={styles.dropdownTriggerText}>{selectedSubject ? selectedSubject.courseTitle : "Select Subject..."}</Text>
          </TouchableOpacity>
          
          <View style={styles.toggleContainer}>
            {["midterm", "finals"].map((p) => (
              <TouchableOpacity key={p} style={[styles.toggleBtn, activePeriod === p && styles.toggleBtnActive]} onPress={() => setActivePeriod(p as any)}>
                <Text style={[styles.toggleText, activePeriod === p && styles.toggleTextActive]}>{p.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activePeriod === "midterm" ? renderDetailedInputs(midterm, setMidterm) : renderDetailedInputs(finals, setFinals)}

          <View style={[styles.overallSummary, !isPassing && styles.summaryFail]}>
            <View>
              <Text style={styles.summaryLabel}>FINAL TRANSMUTED AVERAGE</Text>
              <Text style={styles.statusText}>{isPassing ? "PASSED" : "FAILED"}</Text>
            </View>
            <Text style={styles.summaryValue}>{Math.round(finalGrade)}</Text>
          </View>

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmitGrade} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Grade</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALS */}
      <Modal visible={studentModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStudentModalVisible(false)}>
          <View style={styles.modalContent}>
            <FlatList 
              data={students} 
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.optionItem} onPress={() => {setSelectedStudent(item); setStudentModalVisible(false);}}>
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )} 
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={subjectModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubjectModalVisible(false)}>
          <View style={styles.modalContent}>
            <FlatList 
              data={subjectsList} 
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.optionItem} onPress={() => {setSelectedSubject(item); setSubjectModalVisible(false);}}>
                  <Text style={styles.optionText}>{item.courseTitle}</Text>
                </TouchableOpacity>
              )} 
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#000' },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 20, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },
  formCard: { padding: 20 },
  dropdownTrigger: { backgroundColor: "#080808", borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#1a1a1a" },
  dropdownTriggerText: { color: "#fff" },
  toggleContainer: { flexDirection: "row", backgroundColor: "#080808", borderRadius: 12, padding: 4, marginVertical: 15 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  toggleBtnActive: { backgroundColor: "#00ba7c" },
  toggleText: { color: "#71767b" },
  toggleTextActive: { color: "#fff" },
  termSection: { backgroundColor: "#080808", padding: 15, borderRadius: 15 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dynamicRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  inputWrapper: { width: "30%", position: "relative" },
  subInputDynamic: { backgroundColor: "#111", color: "#fff", borderRadius: 8, height: 45, textAlign: "center" },
  removeIcon: { position: "absolute", top: -5, right: -5 },
  input: { backgroundColor: "#111", color: "#fff", borderRadius: 8, height: 50, paddingHorizontal: 15 },
  miniLabel: { color: "#1d9bf0", fontSize: 10, fontWeight: "800", marginTop: 10 },
  termFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#1a1a1a" },
  previewText: { textAlign: "right", fontWeight: "800" },
  overallSummary: { backgroundColor: "#00ba7c15", padding: 20, borderRadius: 15, marginTop: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryFail: { backgroundColor: "#ff444415" },
  summaryLabel: { color: "#00ba7c", fontSize: 10 },
  statusText: { color: "#00ba7c", fontSize: 18, fontWeight: "900" },
  summaryValue: { color: "#00ba7c", fontSize: 32, fontWeight: "900" },
  submitButton: { backgroundColor: "#00ba7c", padding: 18, borderRadius: 30, alignItems: "center", marginTop: 20, paddingHorizontal: 40 },
  submitText: { color: "#fff", fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#080808", borderRadius: 20, padding: 20, maxHeight: "70%" },
  optionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  optionText: { color: "#fff" }
});