import * as XLSX from "xlsx";
import type { Event, BackupData, HijriMonthOverride, Settings } from "@shared/schema";
import { gregorianToHijri, toArabicNumerals } from "./hijri-utils";
import { gregorianMonthNames, hijriMonthNames } from "@shared/schema";

export function exportToExcel(
  events: Event[],
  hijriOverrides: HijriMonthOverride[],
  numeralSystem: "arabic" | "hindi" = "arabic"
): void {
  const data = events.map((event) => {
    const date = new Date(event.gregorianDate);
    const hijri = gregorianToHijri(date, hijriOverrides);

    return {
      "العنوان": event.title,
      "الوصف": event.description || "",
      "التاريخ الميلادي": `${toArabicNumerals(date.getDate(), numeralSystem)}/${toArabicNumerals(date.getMonth() + 1, numeralSystem)}/${toArabicNumerals(date.getFullYear(), numeralSystem)}`,
      "الشهر الميلادي": gregorianMonthNames[date.getMonth()],
      "التاريخ الهجري": `${toArabicNumerals(hijri.day, numeralSystem)}/${toArabicNumerals(hijri.month, numeralSystem)}/${toArabicNumerals(hijri.year, numeralSystem)}`,
      "الشهر الهجري": hijriMonthNames[hijri.month - 1],
      "سنوي": event.isAnnual ? "نعم" : "لا",
      "اللون": event.color || "primary",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { 
    header: ["العنوان", "الوصف", "التاريخ الميلادي", "الشهر الميلادي", "التاريخ الهجري", "الشهر الهجري", "سنوي", "اللون"]
  });

  worksheet["!cols"] = [
    { wch: 30 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 8 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المناسبات");

  const fileName = `مناسبات_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: "xlsx", type: "binary" });
}

export function parseExcelFile(file: File): Promise<Partial<Event>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", codepage: 65001 });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);

        const events: Partial<Event>[] = jsonData.map((row) => {
          let gregorianDate = "";
          
          const dateStr = row["التاريخ الميلادي"] || row["gregorianDate"] || row["date"];
          if (dateStr) {
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
              const day = parseInt(convertToWesternNumerals(parts[0]));
              const month = parseInt(convertToWesternNumerals(parts[1]));
              const year = parseInt(convertToWesternNumerals(parts[2]));
              
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                gregorianDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              }
            }
          }

          const isAnnualStr = row["سنوي"] || row["isAnnual"] || "";
          const isAnnual = isAnnualStr === "نعم" || isAnnualStr === "yes" || isAnnualStr === "true" || isAnnualStr === "1";

          return {
            title: row["العنوان"] || row["title"] || "",
            description: row["الوصف"] || row["description"] || "",
            gregorianDate,
            isAnnual,
            color: (row["اللون"] || row["color"] || "primary") as Event["color"],
            dateType: "gregorian" as const,
          };
        }).filter((e) => e.title && e.gregorianDate);

        resolve(events);
      } catch (error) {
        reject(new Error("فشل في قراءة ملف Excel"));
      }
    };

    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
}

function convertToWesternNumerals(str: string): string {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let result = str;
  arabicNumerals.forEach((numeral, index) => {
    result = result.replace(new RegExp(numeral, "g"), String(index));
  });
  return result;
}

export function exportBackupToJSON(
  events: Event[],
  hijriOverrides: HijriMonthOverride[],
  settings: Settings
): void {
  const backupData: BackupData = {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    events,
    hijriOverrides,
    settings,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `نسخة_احتياطية_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.events || !Array.isArray(data.events)) {
          throw new Error("ملف النسخة الاحتياطية غير صالح");
        }

        resolve(data as BackupData);
      } catch (error) {
        reject(new Error("فشل في قراءة ملف النسخة الاحتياطية"));
      }
    };

    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsText(file, "utf-8");
  });
}

export function parseCSVFile(file: File): Promise<Partial<Event>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error("ملف CSV فارغ أو غير صالح");
        }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const events: Partial<Event>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          let gregorianDate = "";
          const dateStr = row["التاريخ الميلادي"] || row["gregorianDate"] || row["date"] || "";
          
          if (dateStr) {
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
              const day = parseInt(convertToWesternNumerals(parts[0]));
              const month = parseInt(convertToWesternNumerals(parts[1]));
              const year = parseInt(convertToWesternNumerals(parts[2]));
              
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                gregorianDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              }
            }
          }

          const title = row["العنوان"] || row["title"] || "";
          if (title && gregorianDate) {
            const isAnnualStr = row["سنوي"] || row["isAnnual"] || "";
            const isAnnual = isAnnualStr === "نعم" || isAnnualStr === "yes" || isAnnualStr === "true" || isAnnualStr === "1";

            events.push({
              title,
              description: row["الوصف"] || row["description"] || "",
              gregorianDate,
              isAnnual,
              color: (row["اللون"] || row["color"] || "primary") as Event["color"],
              dateType: "gregorian" as const,
            });
          }
        }

        resolve(events);
      } catch (error) {
        reject(new Error("فشل في قراءة ملف CSV"));
      }
    };

    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsText(file, "utf-8");
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
