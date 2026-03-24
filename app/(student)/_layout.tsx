import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StudentLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarStyle: { 
        backgroundColor: '#000', 
        borderTopColor: '#222',
        height: 60,
        paddingBottom: 8
      },
      tabBarActiveTintColor: '#00ba7c', // Student Green
      tabBarInactiveTintColor: '#71767b',
    }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          )
        }} 
      />

      <Tabs.Screen 
        name="schedule" 
        options={{ 
          title: "Schedule",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
          )
        }} 
      />

      <Tabs.Screen 
        name="view_attendance" 
        options={{ 
          title: "Attendance",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          )
        }} 
      />

      <Tabs.Screen 
        name="grades" 
        options={{ 
          title: "My Grades",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={24} color={color} />
          )
        }} 
      />

      {/* HIDDEN FROM TAB BAR BUT ACCESSIBLE VIA ROUTER */}
      <Tabs.Screen 
        name="profile" 
        options={{ 
          href: null, // This hides the tab icon
        }} 
      />
    </Tabs>
  );
}