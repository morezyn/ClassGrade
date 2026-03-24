import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";

interface Grade {
  id: string;
  subject: string;
  score: number;
  status: string;
  studentName: string; // Ensure this exists in your 'grades' docs
  studentId: string;
  createdAt: any;
}

interface LeaderboardEntry {
  studentName: string;
  average: number;
  totalSubjects: number;
}

export default function StudentGrades() {
  const params = useLocalSearchParams();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]); // For leaderboard calculation
  const [loading, setLoading] = useState(true);
  const [isLeaderboard, setIsLeaderboard] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState("");

  useEffect(() => {
    const initialize = async () => {
      let studentId = params.userId as string;
      if (!studentId) {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          const userData = JSON.parse(session);
          studentId = userData.userId;
        }
      }
      if (studentId) {
        setCurrentStudentId(studentId);
        fetchMyGrades(studentId);
        fetchAllGradesForLeaderboard();
      }
    };
    initialize();
  }, []);

  // 1. Fetch only the logged-in student's grades
  const fetchMyGrades = (studentId: string) => {
    const q = query(
      collection(db, "grades"),
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setGrades(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Grade[],
      );
      setLoading(false);
    });
  };

  // 2. Fetch all grades to calculate rankings
  const fetchAllGradesForLeaderboard = () => {
    const q = query(collection(db, "grades"));
    return onSnapshot(q, (snap) => {
      setAllGrades(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Grade[],
      );
    });
  };

  // 3. Logic to process the leaderboard
  const leaderboardData = useMemo(() => {
    const studentMap: {
      [key: string]: { total: number; count: number; name: string };
    } = {};

    allGrades.forEach((g) => {
      if (!studentMap[g.studentId]) {
        studentMap[g.studentId] = {
          total: 0,
          count: 0,
          name: g.studentName || "Unknown Student",
        };
      }
      studentMap[g.studentId].total += Number(g.score) || 0;
      studentMap[g.studentId].count += 1;
    });

    return Object.entries(studentMap)
      .map(([id, data]) => ({
        studentId: id,
        studentName: data.name,
        average: Math.round(data.total / data.count),
        totalSubjects: data.count,
      }))
      .sort((a, b) => b.average - a.average);
  }, [allGrades]);

  const calculateAverage = () => {
    if (grades.length === 0) return "0";
    const sum = grades.reduce(
      (acc, curr) => acc + (Number(curr.score) || 0),
      0,
    );
    return Math.round(sum / grades.length);
  };

  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry & { studentId: string };
    index: number;
  }) => {
    const isMe = item.studentId === currentStudentId;
    const medals = ["🥇", "🥈", "🥉"];

    return (
      <View style={[styles.rankCard, isMe && styles.myRankCard]}>
        <Text style={styles.rankNumber}>
          {index < 3 ? medals[index] : `#${index + 1}`}
        </Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.rankName}>
            {item.studentName} {isMe && "(You)"}
          </Text>
          <Text style={styles.rankSubtext}>
            {item.totalSubjects} Subjects Enrolled
          </Text>
        </View>
        <Text style={styles.rankScore}>{item.average}%</Text>
      </View>
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ba7c" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            {isLeaderboard ? "Global Rankings" : "Academic Transcript"}
          </Text>
          <Text style={styles.headerTitle}>
            {isLeaderboard ? "Leaderboard" : "My Grades"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, isLeaderboard && styles.toggleBtnActive]}
          onPress={() => setIsLeaderboard(!isLeaderboard)}
        >
          <Ionicons
            name={isLeaderboard ? "list" : "trophy"}
            size={24}
            color={isLeaderboard ? "#000" : "#ffd700"}
          />
        </TouchableOpacity>
      </View>

      {!isLeaderboard && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>General Average</Text>
            <Text style={styles.averageText}>{calculateAverage()}%</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Rank</Text>
            <Text style={styles.averageText}>
              #
              {leaderboardData.findIndex(
                (s) => s.studentId === currentStudentId,
              ) + 1}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        // Ensure we are passing the correctly formatted array
        data={isLeaderboard ? leaderboardData : grades}
        keyExtractor={(item: any) => item.id || item.studentId}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item, index }: any) => {
          // 1. If we are in Leaderboard Mode, use the Leaderboard UI
          if (isLeaderboard) {
            return renderLeaderboardItem({ item, index });
          }

          // 2. If we are in Grades Mode, use the Grade Card UI
          return (
            <View style={styles.gradeCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectText}>{item.subject}</Text>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
                <Text
                  style={[
                    styles.scoreText,
                    { color: item.score >= 75 ? "#00ba7c" : "#ff4444" },
                  ]}
                >
                  {item.score}%
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  headerSubtitle: { color: "#00ba7c", fontSize: 11, fontWeight: "800" },
  headerTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
  toggleBtn: { backgroundColor: "#111", padding: 10, borderRadius: 12 },
  toggleBtnActive: { backgroundColor: "#ffd700" },
  summaryCard: {
    margin: 20,
    padding: 20,
    backgroundColor: "#080808",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  summaryItem: { alignItems: "center" },
  summaryLabel: { color: "#444", fontSize: 10, fontWeight: "700" },
  averageText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  statsDivider: { width: 1, height: 30, backgroundColor: "#1a1a1a" },
  gradeCard: {
    backgroundColor: "#080808",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#111",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  subjectText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  scoreText: { fontSize: 20, fontWeight: "900" },
  statusText: {
    color: "#00ba7c",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080808",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  myRankCard: {
    borderColor: "#00ba7c",
    borderWidth: 1,
    backgroundColor: "#00ba7c05",
  },
  rankNumber: { fontSize: 18, fontWeight: "900", color: "#444", width: 35 },
  rankName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rankSubtext: { color: "#444", fontSize: 12 },
  rankScore: { color: "#00ba7c", fontSize: 18, fontWeight: "900" },
});
