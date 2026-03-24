import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator, Keyboard, Animated, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../config/firebase'; 
import { 
  collection, addDoc, query, onSnapshot, where, 
  orderBy, serverTimestamp, deleteDoc, doc 
} from 'firebase/firestore';
import { useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';

export default function TeacherHome() {
  const router = useRouter(); 
  const insets = useSafeAreaInsets();
  const [postContent, setPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalStudents: 0, totalGrades: 0, average: 0 });

  // --- NATIVE ANIMATION SETUP ---
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 60 + insets.top; 
  const clampedScroll = Animated.diffClamp(scrollY, 0, HEADER_HEIGHT);

  const headerTranslateY = clampedScroll.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // 1. Listen for total students
    const studentQuery = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStudents = onSnapshot(studentQuery, (snap) => {
      setStats(p => ({ ...p, totalStudents: snap.size }));
    });
    
    // 2. Listen for grades and calculate average
    const gradesQuery = collection(db, "grades");
    const unsubGrades = onSnapshot(gradesQuery, (snap) => {
      const docs = snap.docs.map(d => d.data());
      if (docs.length > 0) {
        const validGrades = docs.filter(d => d.finalGrade !== undefined || d.score !== undefined);
        const sum = validGrades.reduce((acc, curr) => acc + (Number(curr.finalGrade || curr.score) || 0), 0);
        
        setStats(p => ({ 
          ...p, 
          totalGrades: docs.length, 
          average: docs.length > 0 ? Math.round(sum / docs.length) : 0 
        }));
      }
    });

    // 3. Listen for announcements (posts)
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
        unsubStudents();
        unsubGrades();
        unsubPosts();
    };
  }, []);

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, "posts"), {
        content: postContent.trim(),
        author: "Teacher",
        createdAt: serverTimestamp(),
      });
      setPostContent("");
      Keyboard.dismiss();
    } catch (e) {
      if (Platform.OS === 'web') alert("Post failed");
      else Alert.alert("Error", "Post failed");
    } finally {
      setIsPosting(false);
    }
  };

  const deletePost = (id: string) => {
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, "posts", id));
      } catch (e) {
        console.error("Delete error", e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Remove this post?")) performDelete();
    } else {
      Alert.alert("Delete", "Remove this post?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* --- REPLACED LOGOUT WITH PROFILE BUTTON IN HEADER --- */}
      <Animated.View style={[
        styles.header, 
        { 
          height: HEADER_HEIGHT, 
          paddingTop: insets.top, 
          transform: [{ translateY: headerTranslateY }] 
        }
      ]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Teacher Dashboard</Text>
          <TouchableOpacity 
            onPress={() => router.push("/(teacher)/profile")} 
            style={styles.profileBtn}
          >
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView 
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled" 
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT }]}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalGrades}</Text>
            <Text style={styles.statLabel}>Grades</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#00ba7c' }]}>{stats.average}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push("/(teacher)/add_student")}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Add Student</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryActionButton]} 
            onPress={() => router.push("/(teacher)/subjects")}
          >
            <Ionicons name="library" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Subjects</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputArea}>
          <TextInput 
            style={styles.simpleInput} 
            placeholder="Write an announcement..." 
            placeholderTextColor="#555"
            multiline 
            value={postContent} 
            onChangeText={setPostContent}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.postButton, { opacity: postContent.length > 0 ? 1 : 0.4 }]} 
              onPress={handleCreatePost} 
              disabled={isPosting || !postContent.trim()}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.feedHeader}>
          <Text style={styles.feedHeaderText}>Recent Activity</Text>
        </View>

        {posts.map((item) => (
          <View key={item.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.authorBadge}>
                <View style={styles.blueIndicator} />
                <View>
                  <Text style={styles.postAuthor}>{item.author || "Teacher"}</Text>
                  <Text style={styles.postDate}>
                    {item.createdAt?.toDate 
                      ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : 'Now'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => deletePost(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.postText}>{item.content}</Text>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0,
    backgroundColor: '#000', 
    borderBottomWidth: 1, 
    borderBottomColor: "#111",
    zIndex: 100,
    elevation: 10,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  profileBtn: { padding: 5 }, // Styled for the new profile button
  scrollContent: { paddingBottom: 80 }, 
  
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#111' 
  },
  statCard: { 
    flex: 1, 
    marginHorizontal: 4, 
    paddingVertical: 12, 
    backgroundColor: '#0A0A0A', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#222', 
    alignItems: 'center' 
  },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#71767b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

  actionRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#111',
    gap: 10
  },
  actionButton: { 
    flex: 1, 
    flexDirection: 'row',
    backgroundColor: '#1d9bf0', 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  secondaryActionButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333'
  },
  actionButtonText: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 13, 
    marginLeft: 8 
  },

  inputArea: { padding: 20, borderBottomWidth: 8, borderBottomColor: '#0a0a0a' },
  simpleInput: { color: '#fff', fontSize: 17, textAlignVertical: 'top', minHeight: 60 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  postButton: { backgroundColor: '#1d9bf0', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 25 },
  postButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  feedHeader: { paddingHorizontal: 20, paddingVertical: 15 },
  feedHeaderText: { color: '#71767b', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  postCard: { 
    marginHorizontal: 15, 
    marginBottom: 15, 
    padding: 15, 
    backgroundColor: '#000', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#111' 
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  authorBadge: { flexDirection: 'row', alignItems: 'center' },
  blueIndicator: { width: 3, height: 25, backgroundColor: '#1d9bf0', marginRight: 10, borderRadius: 2 },
  postAuthor: { color: '#fff', fontSize: 15, fontWeight: '800' },
  postDate: { color: '#555', fontSize: 11, marginTop: 1 },
  postText: { color: '#fff', fontSize: 16, lineHeight: 24, paddingLeft: 13 },
});