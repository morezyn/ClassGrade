export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
}

export type Post = {
  id: string;
  title: string;
  content: string;
  timestamp: any;
  likes: number;
  userId: string;
  userRole: UserRole;
  userName: string;
  comments?: Comment[];
};

export type Comment = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: any;
};

// Structure of midterm/finals maps in Firestore
export type GradeSection = {
  assignments: string[];
  quizzes: string[];
  recitations: string[];
  exam: string;
};

export type Grade = {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;         
  subjectId: string;      
  courseCode: string;
  midtermBreakdown: GradeSection; 
  finalsBreakdown: GradeSection;
  midtermScore: string; 
  finalsScore: string; 
  score: number;           
  finalGrade?: string;     
  status: string;          
  isPassing?: boolean;     
  createdAt: any; 
  updatedAt?: any;        // Added to match Firestore "updatedAt" field
  isSynced?: boolean;      
};

export type Subject = {
  id: string;              
  courseCode: string;
  courseTitle: string;
  semester: string;
  schoolYear: string;
  creditUnits: string;
  time: string;
  room: string;
  program: string;
  instructor: string;
  teacherId: string;
};

// MATCHED TO YOUR FIRESTORE EXAMPLE:
export interface AttendanceRecord {
  id: string;             // Document ID
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;    // Added: Based on your Firestore example
  date: string;           // String format: "2026-02-25"
  time: string;           // String format: "2:15 PM"
  status: 'present' | 'absent' | 'late'; // Lowercase to match your DB
  updatedAt: any;         // The Firebase Timestamp
  createdAt?: any;
  isSynced?: boolean;     
}

export type ActivityData = {
  value: number;
  label: string;
};