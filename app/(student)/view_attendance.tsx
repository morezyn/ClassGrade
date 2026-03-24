import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { db } from '../../config/firebase';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StudentAttendance() {
  const insets = useSafeAreaInsets();
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    loadSessionAndData();
  }, []);

  const loadSessionAndData = async () => {
    try {
      setLoading(true);
      // 1. Get the session you saved in LoginScreen.tsx
      const session = await AsyncStorage.getItem("userSession");
      
      if (!session) {
        console.log("DEBUG: No session found in AsyncStorage");
        setLoading(false);
        return;
      }

      const userData = JSON.parse(session);
      const userId = userData.userId; // This is the Document ID from Firestore
      console.log("DEBUG: Logged in with UserId:", userId);

      // 2. Fetch the student's full name from Firestore
      const userSnap = await getDoc(doc(db, "users", userId));
      
      let nameToMatch = "";
      if (userSnap.exists()) {
        nameToMatch = userSnap.data().fullName;
        setStudentName(nameToMatch);
        console.log("DEBUG: Target Name for Attendance:", nameToMatch);
      } else {
        console.log("DEBUG: Could not find user document for ID:", userId);
      }

      // 3. Fetch Attendance and Filter manually
      await fetchAttendanceData(nameToMatch);

    } catch (error) {
      console.error("DEBUG: Session Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAttendanceData = async (nameToMatch: string) => {
    try {
      const snap = await getDocs(collection(db, "attendance"));
      const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Clean match logic
      const filtered = allDocs.filter((rec: any) => {
        const rName = rec.studentName?.trim().toLowerCase() || "";
        const sName = nameToMatch?.trim().toLowerCase() || "";
        return rName === sName && sName !== "";
      });

      console.log(`DEBUG: Matched ${filtered.length} records.`);

      // Sort newest first
      filtered.sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

      // Stats
      const counts = filtered.reduce((acc, curr: any) => {
        const s = curr.status?.toLowerCase();
        if (acc.hasOwnProperty(s)) acc[s]++;
        return acc;
      }, { present: 0, absent: 0, late: 0 } as any);

      setStats(counts);
      setRecords(filtered);
    } catch (err) {
      console.error("DEBUG: Attendance Fetch Error:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessionAndData();
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color="#00ba7c" size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Attendance</Text>
          <Text style={styles.nameSub}>{studentName || "Loading..."}</Text>
        </View>
        <Ionicons name="calendar" size={30} color="#00ba7c" />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, {color: '#00ba7c'}]}>{stats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, {color: '#f4212e'}]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, {color: '#ffd700'}]}>{stats.late}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ba7c" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No records found</Text>
            <Text style={styles.emptySub}>We couldn't find any attendance for "{studentName}"</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subjectText}>{item.subjectName || "Multimedia"}</Text>
              <Text style={styles.dateText}>{item.date} • {item.time}</Text>
            </View>
            <View style={styles.statusBadge}>
               <Text style={[styles.statusText, { color: item.status === 'present' ? '#00ba7c' : '#fa8c93' }]}>
                 {item.status?.toUpperCase()}
               </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  nameSub: { color: '#00ba7c', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#0A0A0A', padding: 15, borderRadius: 15, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#1A1A1A' },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#71767b', fontSize: 10, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: '#0A0A0A', padding: 20, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1A1A1A' },
  subjectText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dateText: { color: '#71767b', fontSize: 12, marginTop: 4 },
  statusBadge: { padding: 8 },
  statusText: { fontWeight: '900', fontSize: 11 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  emptySub: { color: '#71767b', textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }
});