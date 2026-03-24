import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { Grade, Subject } from "../types";

interface StudentGroup {
  studentName: string;
  records: (Grade & { isSyncing?: boolean })[];
  averageScore: number; // Added for leaderboard sorting
}

export default function ViewGrades() {
  const router = useRouter();
  const [groupedGrades, setGroupedGrades] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLeaderboardMode, setIsLeaderboardMode] = useState(false);

  useEffect(() => {
    const qGrades = query(collection(db, "grades"), orderBy("createdAt", "desc"));

    const unsubGrades = onSnapshot(qGrades, { includeMetadataChanges: true }, (snap) => {
      const rawList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isSyncing: doc.metadata.hasPendingWrites,
      })) as (Grade & { isSyncing: boolean })[];

      const groups = rawList.reduce((acc: StudentGroup[], current) => {
        const existingGroup = acc.find((g) => g.studentName === current.studentName);
        if (existingGroup) {
          existingGroup.records.push(current);
        } else {
          acc.push({ studentName: current.studentName, records: [current], averageScore: 0 });
        }
        return acc;
      }, []);

      // Calculate averages for each group
      groups.forEach(group => {
        const total = group.records.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
        group.averageScore = total / group.records.length;
      });

      setGroupedGrades(groups);
      setLoading(false);
    });

    return () => unsubGrades();
  }, []);

  // Filter and Sort Logic
  const displayData = useMemo(() => {
    let filtered = groupedGrades.filter(
      (group) =>
        group.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.records.some((r) => r.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLeaderboardMode) {
      return [...filtered].sort((a, b) => b.averageScore - a.averageScore);
    }
    return filtered;
  }, [groupedGrades, searchQuery, isLeaderboardMode]);

  const renderLeaderboardItem = (item: StudentGroup, index: number) => {
    const isTopThree = index < 3 && !searchQuery;
    const medals = ["🥇", "🥈", "🥉"];

    return (
      <View style={[styles.leaderboardCard, isTopThree && styles.topThreeCard]}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{isTopThree ? medals[index] : `#${index + 1}`}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentHeader}>{item.studentName}</Text>
          <Text style={styles.avgText}>GPA: {item.averageScore.toFixed(1)}%</Text>
        </View>
        <Ionicons name="stats-chart" size={20} color="#00ba7c" />
      </View>
    );
  };

  const renderStudentBlock = ({ item, index }: { item: StudentGroup; index: number }) => {
    if (isLeaderboardMode) return renderLeaderboardItem(item, index);

    return (
      <View style={styles.studentBlock}>
        <Text style={styles.studentHeader}>{item.studentName}</Text>
        {item.records.map((record) => (
          <View key={record.id} style={styles.gradeCard}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.subjectText}>{record.subject}</Text>
                {record.isSyncing ? (
                  <ActivityIndicator size="small" color="#1d9bf0" style={{ marginLeft: 8, transform: [{ scale: 0.6 }] }} />
                ) : (
                  <Ionicons name="cloud-done" size={14} color="#00ba7c" style={{ marginLeft: 6 }} />
                )}
              </View>
              <Text style={[styles.statusBadge, record.status === "FAILED" && { color: "#ff4444" }]}>
                {record.status}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}><Text style={styles.scoreLabel}>MID</Text><Text style={styles.scoreValue}>{record.midtermScore || "0"}</Text></View>
              <View style={styles.scoreBox}><Text style={styles.scoreLabel}>FIN</Text><Text style={styles.scoreValue}>{record.finalsScore || "0"}</Text></View>
              <View style={styles.scoreBox}><Text style={[styles.scoreLabel, { color: "#00ba7c" }]}>TOTAL</Text><Text style={[styles.scoreValue, { color: "#00ba7c" }]}>{record.score || "0"}</Text></View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Academic Records</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsLeaderboardMode(!isLeaderboardMode)}
          style={[styles.toggleBtn, isLeaderboardMode && styles.toggleBtnActive]}
        >
          <Ionicons name="trophy" size={20} color={isLeaderboardMode ? "#000" : "#ffd700"} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search student or subject..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#00ba7c" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.studentName}
          renderItem={renderStudentBlock}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}><Text style={styles.emptyText}>No records found.</Text></View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  toggleBtn: { padding: 8, borderRadius: 8, backgroundColor: "#111" },
  toggleBtnActive: { backgroundColor: "#ffd700" },
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#111",
    marginHorizontal: 15, paddingHorizontal: 15, borderRadius: 12, height: 45,
    borderWidth: 1, borderColor: "#222", marginBottom: 10,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  studentBlock: { marginBottom: 25 },
  studentHeader: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  avgText: { color: "#00ba7c", fontSize: 14, fontWeight: "600" },
  gradeCard: {
    backgroundColor: "#080808", padding: 12, borderRadius: 12, marginTop: 10,
    borderWidth: 1, borderColor: "#1a1a1a",
  },
  leaderboardCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#080808',
    padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a1a'
  },
  topThreeCard: { borderColor: '#ffd70033', backgroundColor: '#ffd70005' },
  rankBadge: { width: 40, alignItems: 'center' },
  rankText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  subjectText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingTop: 10 },
  scoreBox: { alignItems: "center" },
  scoreLabel: { color: "#444", fontSize: 9, fontWeight: "bold" },
  scoreValue: { color: "#fff", fontSize: 14, fontWeight: "700" },
  statusBadge: { color: "#00ba7c", fontWeight: "bold", fontSize: 10, textTransform: "uppercase" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#555", textAlign: "center" },
});