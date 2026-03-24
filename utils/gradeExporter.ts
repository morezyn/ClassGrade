import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import * as XLSX from "xlsx";

export const exportStudentToExcel = async (details: any) => {
  if (Platform.OS === "web") {
    Alert.alert("Unsupported", "Excel export is available on mobile devices.");
    return;
  }

  try {
    // 1. EXTRACT DATA (Using the working logic from classExporter)
    const studentName = details.studentName || "N/A";
    const subjectDetails = details.subjectDetails || {};

    // Based on your Firestore log, these are the keys that actually hold the data
    const mid = details.midtermBreakdown || {};
    const fin = details.finalsBreakdown || {};

    // 2. CALCULATE MAX COLUMNS
    const getCount = (section: any, cat: string) => {
      const field = section ? section[cat] : [];
      return Array.isArray(field) ? Math.max(field.length, 1) : 1;
    };

    const config = {
      m_ass: getCount(mid, "assignments"),
      m_qiz: getCount(mid, "quizzes"),
      m_rec: getCount(mid, "recitations"),
      f_ass: getCount(fin, "assignments"),
      f_qiz: getCount(fin, "quizzes"),
      f_rec: getCount(fin, "recitations"),
    };

    // 3. HEADERS (Matching the look of classExporter)
    const h2 = ["STUDENT NAME"];
    const h3 = [""];

    const addHeaders = (count: number, label: string, code: string) => {
      for (let i = 1; i <= count; i++) {
        h2.push(i === 1 ? label : "");
        h3.push(`${code}${i}`);
      }
    };

    addHeaders(config.m_ass, "ASSIGNMENT", "A");
    addHeaders(config.m_qiz, "QUIZ", "Q");
    addHeaders(config.m_rec, "RECITA", "R");
    h2.push("EXAM", "MID AVG");
    h3.push("E1", "");

    addHeaders(config.f_ass, "ASSIGNMENT", "A");
    addHeaders(config.f_qiz, "QUIZ", "Q");
    addHeaders(config.f_rec, "RECITA", "R");
    h2.push("EXAM", "FIN AVG", "TOTAL", "STATUS");
    h3.push("E2", "", "AVG", "");

    // 4. DATA EXTRACTION (Exactly like classExporter's pushScores)
    const row: any[] = [studentName];

    const pushScores = (section: any, category: string, max: number) => {
      const scores = section && section[category] ? section[category] : [];
      for (let i = 0; i < max; i++) {
        const val = scores[i];
        row.push(
          val !== undefined && val !== null && val !== "" ? String(val) : "0",
        );
      }
    };

    // Midterm Block
    pushScores(mid, "assignments", config.m_ass);
    pushScores(mid, "quizzes", config.m_qiz);
    pushScores(mid, "recitations", config.m_rec);
    row.push(mid.exam ? String(mid.exam) : "0");
    row.push(details.midtermScore ? String(details.midtermScore) : "0");

    // Finals Block
    pushScores(fin, "assignments", config.f_ass);
    pushScores(fin, "quizzes", config.f_qiz);
    pushScores(fin, "recitations", config.f_rec);
    row.push(fin.exam ? String(fin.exam) : "0");
    row.push(details.finalsScore ? String(details.finalsScore) : "0");

    // Summary
    row.push(details.score ? String(details.score) : "0");
    row.push(details.status || "N/A");

    // 5. ASSEMBLE
    const data = [
      ["SCHOOL YEAR:", subjectDetails.schoolYear || "N/A"],
      ["COURSE:", details.subject || "N/A"],
      ["INSTRUCTOR:", subjectDetails.instructor || "N/A"],
      [],
      h2,
      h3,
      row,
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ProgressReport");

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const fileUri = `${FileSystem.cacheDirectory}Progress_${studentName.replace(/\s/g, "_")}.xlsx`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: "base64" as any,
    });
    await Sharing.shareAsync(fileUri);
  } catch (error) {
    console.error("Export Error:", error);
    Alert.alert("Error", "Could not export data.");
  }
};
