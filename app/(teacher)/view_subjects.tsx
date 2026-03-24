import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Subject, Grade } from '../types';
import { exportClassGradesToExcel } from '../../utils/classExporter';

export default function ViewSubjects() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to Subjects
    const qSub = query(collection(db, "subjects"), orderBy("courseCode", "asc"));
    const unsubSubs = onSnapshot(qSub, (snap) => {
      const subList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subject[];
      setSubjects(subList);
    });

    // 2. Listen to Grades (to filter per subject during export)
    const qGrades = query(collection(db, "grades"));
    const unsubGrades = onSnapshot(qGrades, (snap) => {
      const gradeList = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          studentName: data.studentName,
          subjectId: data.subjectId,
          subjectTitle: data.subject,
          midterm: data.midtermBreakdown,
          finals: data.finalsBreakdown,
          finalGrade: parseFloat(data.score) || 0,
          isPassing: data.status === "PASSED",
          // Map these for the exporter to find easily
          exam: data.finalsScore, 
        } as unknown as Grade;
      });
      setAllGrades(gradeList);
      setLoading(false);
    });

    return () => {
      unsubSubs();
      unsubGrades();
    };
  }, []);

  const handleExportMasterlist = (subject: Subject) => {
    // Filter grades belonging to this subject
    // We check both ID and Title to be safe
    const classGrades = allGrades.filter(g => 
      g.subjectId === subject.id || g.subjectTitle === subject.courseTitle
    );

    if (classGrades.length === 0) {
      Alert.alert("No Data", "There are no student grades recorded for this subject yet.");
      return;
    }

    Alert.alert(
      "Export Masterlist",
      `Generate Excel for ${classGrades.length} students in ${subject.courseCode}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export", onPress: () => exportClassGradesToExcel(subject, classGrades) }
      ]
    );
  };

  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const studentCount = allGrades.filter(g => 
      g.subjectId === item.id || g.subjectTitle === item.courseTitle
    ).length;

    return (
      <View style={styles.subjectCard}>
        <View style={styles.cardInfo}>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
          <Text style={styles.courseTitle} numberOfLines={2}>{item.courseTitle}</Text>
          
          <View style={styles.badgeContainer}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{studentCount} Students</Text>
            </View>
            <Text style={styles.roomText}>{item.room} • {item.program}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.downloadBtn}
          onPress={() => handleExportMasterlist(item)}
        >
          <Ionicons name="document-text" size={24} color="#00ba7c" />
          <Text style={styles.downloadLabel}>MASTERLIST</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subject Records</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#00ba7c" size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => item.id || item.courseCode}
          renderItem={renderSubjectItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No subjects found. Add some in Subject Management.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  listContent: { padding: 15 },
  subjectCard: {
    backgroundColor: '#080808',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardInfo: { flex: 1, marginRight: 10 },
  courseCode: { color: '#1d9bf0', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  courseTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: { 
    backgroundColor: '#00ba7c20', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00ba7c40'
  },
  countText: { color: '#00ba7c', fontSize: 11, fontWeight: 'bold' },
  roomText: { color: '#555', fontSize: 11 },
  downloadBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 12,
    width: 85,
    borderWidth: 1,
    borderColor: '#222'
  },
  downloadLabel: { color: '#00ba7c', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 100 }
});