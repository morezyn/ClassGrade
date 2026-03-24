import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager 
} from "firebase/firestore";
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence // Use the main export
} from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCB-n8WPYf6I90QviLhMIJ0v-BJ7wDzK7k",
  authDomain: "classgrading.firebaseapp.com",
  projectId: "classgrading",
  storageBucket: "classgrading.firebasestorage.app",
  messagingSenderId: "419603837043",
  appId: "1:419603837043:web:ee8a11f3fe455454703a06",
  measurementId: "G-BFZ3DM0EYB"
};

// 1. App Instance Singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Firestore Persistence (Safe Singleton)
export const db = (() => {
  try {
    const existingDb = getFirestore(app);
    // If it's already initialized, return it
    return existingDb;
  } catch (e) {
    // If not, initialize with persistent cache
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager() 
      }),
    });
  }
})();

// 3. Auth Persistence (Safe Singleton)
export const auth = (() => {
  try {
    const existingAuth = getAuth(app);
    return existingAuth;
  } catch (e) {
    if (Platform.OS === 'web') {
      return getAuth(app);
    } else {
      // Direct use of getReactNativePersistence from firebase/auth
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  }
})();