import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  Animated, Platform, TouchableOpacity, Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../../config/firebase';
import { collection, query, onSnapshot, orderBy, where, doc, getDoc } from 'firebase/firestore'; 
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FeedItem {
  id: string;
  type: 'grade' | 'post';
  subject?: string;
  courseCode?: string;
  score?: number; 
  fullName?: string; 
  content?: string;
  author?: string;
  createdAt: any;
}

export default function StudentHome() {
  const router = useRouter();
  const { userId: paramId } = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();
  
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState({ totalSubjects: 0, overallAvg: 0 });
  const [currentStudent, setCurrentStudent] = useState<any>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 60 + insets.top;
  const clampedScroll = Animated.diffClamp(scrollY, 0, HEADER_HEIGHT);

  const headerTranslateY = clampedScroll.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    let unsubGrades: () => void;
    let unsubPosts: () => void;

    const initializeDashboard = async () => {
      try {
        let activeId = paramId;
        if (!activeId) {
          const session = await AsyncStorage.getItem("userSession");
          if (session) { activeId = JSON.parse(session).userId; }
        }

        if (!activeId) {
          setLoading(false);
          return;
        }

        const studentDoc = await getDoc(doc(db, "users", activeId as string));
        if (!studentDoc.exists()) {
          setLoading(false);
          return;
        }

        const studentData = studentDoc.data();
        setCurrentStudent(studentData);

        const gradesQuery = query(
          collection(db, "grades"), 
          where("studentId", "==", activeId),
          orderBy("createdAt", "desc")
        );

        const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

        let gradesList: FeedItem[] = [];
        let postsList: FeedItem[] = [];

        const mergeAndSort = () => {
          const combined = [...gradesList, ...postsList].sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
          setFeed(combined);

          if (gradesList.length > 0) {
            const uniqueSubjects = new Set(gradesList.map(g => g.subject)).size;
            const totalScore = gradesList.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
            const avg = Math.round(totalScore / gradesList.length);
            
            setStudentStats({
              totalSubjects: uniqueSubjects,
              overallAvg: avg
            });
          } else {
            setStudentStats({ totalSubjects: 0, overallAvg: 0 });
          }
          setLoading(false);
        };

        unsubGrades = onSnapshot(gradesQuery, (snapshot) => {
          gradesList = snapshot.docs.map(doc => ({ id: doc.id, type: 'grade', ...doc.data() })) as FeedItem[];
          mergeAndSort();
        });

        unsubPosts = onSnapshot(postsQuery, (snapshot) => {
          postsList = snapshot.docs.map(doc => ({ id: doc.id, type: 'post', ...doc.data() })) as FeedItem[];
          mergeAndSort();
        });

      } catch (error) {
        console.error("Dashboard error:", error);
        setLoading(false);
      }
    };

    initializeDashboard();
    return () => {
      if (unsubGrades) unsubGrades();
      if (unsubPosts) unsubPosts();
    };
  }, [paramId]);

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'post') {
      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.authorBadge}>
              <View style={styles.blueIndicator} />
              <View>
                <Text style={styles.postAuthor}>{item.author || "Faculty Announcement"}</Text>
                <Text style={styles.postDate}>
                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.postText}>{item.content}</Text>
        </View>
      );
    }

    const isPassing = (item.score || 0) >= 75;

    return (
      <TouchableOpacity 
        style={[styles.postCard, styles.gradeCardBorder, !isPassing && styles.gradeCardFailBorder]}
        onPress={() => router.push({
          pathname: "/(student)/grades",
          params: { gradeId: item.id }
        })}
      >
        <View style={styles.postHeader}>
          <View style={styles.authorBadge}>
            <View style={[styles.blueIndicator, { backgroundColor: isPassing ? '#00ba7c' : '#f4212e' }]} />
            <View>
              <Text style={styles.postAuthor}>{item.subject}</Text>
              <Text style={styles.postDate}>{item.courseCode || "Final Transmuted Grade"}</Text>
            </View>
          </View>
          <View style={[styles.scoreBadge, !isPassing && styles.scoreBadgeFail]}>
            <Text style={[styles.scoreText, !isPassing && styles.scoreTextFail]}>
              {item.score}%
            </Text>
          </View>
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.studentInfo}>Tap to view breakdown</Text>
          <Ionicons name="chevron-forward" size={14} color="#333" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER WITH PROFILE BUTTON REPLACING LOGOUT */}
      <Animated.View style={[
        styles.header, 
        { height: HEADER_HEIGHT, paddingTop: insets.top, transform: [{ translateY: headerTranslateY }] }
      ]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Student Portal</Text>
            {currentStudent && <Text style={styles.userName}>{currentStudent.fullName}</Text>}
          </View>
          <TouchableOpacity onPress={() => router.push("/(student)/profile")} style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00ba7c" size="large" />
        </View>
      ) : (
        <Animated.FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + 10 }]}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{studentStats.totalSubjects}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: studentStats.overallAvg >= 75 ? '#00ba7c' : '#f4212e' }]}>
                  {studentStats.overallAvg}%
                </Text>
                <Text style={styles.statLabel}>GPA (AVG)</Text>
              </View>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No academic updates yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    position: 'absolute', top: 0, left: 0, right: 0, 
    backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: "#111", 
    zIndex: 100 
  },
  headerContent: { 
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', paddingHorizontal: 15 
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  userName: { color: '#00ba7c', fontSize: 12, fontWeight: 'bold' },
  profileBtn: { padding: 5 }, // Styled for the profile icon
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scrollContent: { paddingBottom: 100 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 20, paddingTop: 10 },
  statCard: { 
    flex: 1, marginHorizontal: 4, paddingVertical: 15, 
    backgroundColor: '#0A0A0A', borderRadius: 12, borderWidth: 1, 
    borderColor: '#222', alignItems: 'center' 
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#71767b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

  postCard: { 
    marginHorizontal: 15, marginBottom: 12, padding: 15, 
    backgroundColor: '#080808', borderRadius: 12, borderWidth: 1, borderColor: '#1a1a1a' 
  },
  gradeCardBorder: { borderLeftWidth: 4, borderLeftColor: '#00ba7c' },
  gradeCardFailBorder: { borderLeftColor: '#f4212e' },
  
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  authorBadge: { flexDirection: 'row', alignItems: 'center' },
  blueIndicator: { width: 3, height: 25, backgroundColor: '#1d9bf0', marginRight: 10, borderRadius: 2 },
  
  postAuthor: { color: '#fff', fontSize: 15, fontWeight: '800' },
  postDate: { color: '#555', fontSize: 11 },
  postText: { color: '#ccc', fontSize: 15, lineHeight: 22, paddingLeft: 13 },

  scoreBadge: { backgroundColor: '#00ba7c22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  scoreBadgeFail: { backgroundColor: '#f4212e22' },
  scoreText: { color: '#00ba7c', fontWeight: '900', fontSize: 14 },
  scoreTextFail: { color: '#f4212e' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingLeft: 13 },
  studentInfo: { color: '#444', fontSize: 12, fontStyle: 'italic' },
  emptyText: { color: '#71767b', textAlign: 'center', marginTop: 100, fontSize: 16 }
});