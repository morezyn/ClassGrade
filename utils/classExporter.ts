import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import * as XLSX from "xlsx";
import { Subject, Grade } from "../app/types";

export const exportClassGradesToExcel = async (subject: Subject, allGrades: any[]) => {
  if (Platform.OS === "web") {
    Alert.alert("Unsupported", "Excel export is available on mobile devices.");
    return;
  }

  try {
    // 1. CALCULATE MAX COLUMNS
    const getSafeMax = (term: 'midterm' | 'finals', cat: 'assignments' | 'quizzes' | 'recitations') => {
      const counts = allGrades.map(g => {
        const section = g[term];
        const field = section ? section[cat] : [];
        return Array.isArray(field) ? field.length : 0;
      });
      return Math.max(...counts, 1);
    };

    const config = {
      m_ass: getSafeMax('midterm', 'assignments'),
      m_qiz: getSafeMax('midterm', 'quizzes'),
      m_rec: getSafeMax('midterm', 'recitations'),
      f_ass: getSafeMax('finals', 'assignments'),
      f_qiz: getSafeMax('finals', 'quizzes'),
      f_rec: getSafeMax('finals', 'recitations'),
    };

    // 2. HEADERS
    const h2 = ["NO", "STUDENT NAME", "COURSE"];
    const h3 = ["", "", ""];

    // MODIFIED: Only pushes the label for the first index of a group
    const addHeaders = (count: number, label: string, code: string) => {
      for (let i = 1; i <= count; i++) {
        h2.push(i === 1 ? label : ""); // Title on first column only
        h3.push(`${code}${i}`);        // A1, A2, etc. still show on every column
      }
    };

    // Midterm Period
    addHeaders(config.m_ass, "ASSIGNMENT", "A");
    addHeaders(config.m_qiz, "QUIZ", "Q");
    addHeaders(config.m_rec, "RECITA", "R");
    h2.push("EXAM"); h3.push("E1");

    // Final Period
    addHeaders(config.f_ass, "ASSIGNMENT", "A");
    addHeaders(config.f_qiz, "QUIZ", "Q");
    addHeaders(config.f_rec, "RECITA", "R");
    h2.push("EXAM"); h3.push("E2");

    h2.push("TOTAL", "STATUS");
    h3.push("AVG", "");

    const data = [
      ["COURSE:", subject.courseTitle || allGrades[0].subjectTitle],
      ["INSTRUCTOR:", subject.instructor || "N/A"],
      [], h2, h3
    ];

    // 3. DATA EXTRACTION
    allGrades.forEach((record, index) => {
      const row: any[] = [
        (index + 1).toString(),
        record.studentName || "N/A",
        subject.courseCode || "N/A"
      ];

      const pushScores = (section: any, category: string, max: number) => {
        const scores = section && section[category] ? section[category] : [];
        for (let i = 0; i < max; i++) {
          const val = scores[i];
          row.push(val !== undefined && val !== null && val !== "" ? String(val) : "0");
        }
      };

      pushScores(record.midterm, 'assignments', config.m_ass);
      pushScores(record.midterm, 'quizzes', config.m_qiz);
      pushScores(record.midterm, 'recitations', config.m_rec);
      row.push(record.midterm?.exam ? String(record.midterm.exam) : "0");

      pushScores(record.finals, 'assignments', config.f_ass);
      pushScores(record.finals, 'quizzes', config.f_qiz);
      pushScores(record.finals, 'recitations', config.f_rec);
      row.push(record.finals?.exam ? String(record.finals.exam) : "0");

      row.push(record.finalGrade ? String(record.finalGrade) : "0");
      row.push(record.isPassing ? "PASSED" : "FAILED");

      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ClassRecord");

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const fileUri = `${FileSystem.cacheDirectory}GradeReport_${allGrades[0].studentName.replace(/\s/g, '_')}.xlsx`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: "base64" as any });
    await Sharing.shareAsync(fileUri);

  } catch (error) {
    console.error("Export Error:", error);
    Alert.alert("Error", "Could not export data.");
  }
};