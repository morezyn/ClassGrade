import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function StudentSchedule() {
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to the entire "subjects" collection
    const q = query(collection(db, "subjects"), orderBy("courseCode", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllSubjects(subjects);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderSubject = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.room || "No Room"}</Text>
          </View>
        </View>

        <Text style={styles.courseTitle}>{item.courseTitle}</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#00ba7c" />
          <Text style={styles.infoText}>{item.time || "TBA"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#555" />
          <Text style={styles.instructorText}>{item.instructor || "Staff"}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Subjects</Text>
        <Text style={styles.subtitle}>Full Academic Schedule</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#00ba7c" size="large" />
        </View>
      ) : (
        <FlatList
          data={allSubjects}
          keyExtractor={(item) => item.id}
          renderItem={renderSubject}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No subjects available in the database.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, paddingBottom: 15 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#00ba7c', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  listPadding: { padding: 20, paddingTop: 0 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#080808', 
    marginBottom: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#1a1a1a',
    overflow: 'hidden'
  },
  accentBar: { width: 4, backgroundColor: '#00ba7c' },
  cardContent: { flex: 1, padding: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseCode: { color: '#00ba7c', fontWeight: 'bold', fontSize: 13 },
  badge: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#666', fontSize: 10, fontWeight: '800' },
  courseTitle: { color: '#fff', fontSize: 19, fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { color: '#ccc', fontSize: 14, marginLeft: 8, fontWeight: '500' },
  instructorText: { color: '#555', fontSize: 13, marginLeft: 8 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 }
});