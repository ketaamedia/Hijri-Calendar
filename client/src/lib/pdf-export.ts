import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Event, PDFExportOptions } from "@shared/schema";
import { gregorianToHijri } from "./hijri-utils";
import type { HijriMonthOverride } from "@shared/schema";
import { amiriFontBase64 } from "./amiri-font";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const hijriMonthNamesAr: Record<number, string> = {
  1: "محرم",
  2: "صفر",
  3: "ربيع الأول",
  4: "ربيع الثاني",
  5: "جمادى الأولى",
  6: "جمادى الآخرة",
  7: "رجب",
  8: "شعبان",
  9: "رمضان",
  10: "شوال",
  11: "ذو القعدة",
  12: "ذو الحجة",
};

const gregorianMonthNamesAr: Record<number, string> = {
  0: "كانون الثاني",
  1: "شباط",
  2: "آذار",
  3: "نيسان",
  4: "أيار",
  5: "حزيران",
  6: "تموز",
  7: "آب",
  8: "أيلول",
  9: "تشرين الأول",
  10: "تشرين الثاني",
  11: "كانون الأول",
};

function toArabicNumeral(num: number): string {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num)
    .split("")
    .map((d) => (/\d/.test(d) ? arabicNumerals[parseInt(d)] : d))
    .join("");
}

function formatGregorianDateAr(date: Date): string {
  return `${toArabicNumeral(date.getDate())} ${gregorianMonthNamesAr[date.getMonth()]} ${toArabicNumeral(date.getFullYear())}`;
}

function formatHijriDateAr(hijri: { year: number; month: number; day: number }): string {
  return `${toArabicNumeral(hijri.day)} ${hijriMonthNamesAr[hijri.month]} ${toArabicNumeral(hijri.year)}`;
}

function setupArabicFont(doc: jsPDF): boolean {
  try {
    doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri");
    return true;
  } catch (error) {
    console.error("Failed to add embedded Amiri font:", error);
    return false;
  }
}

export async function exportToPDF(
  events: Event[],
  options: PDFExportOptions,
  hijriOverrides?: HijriMonthOverride[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const useArabicFont = setupArabicFont(doc);

  const startDate = new Date(options.dateRange.start);
  const endDate = new Date(options.dateRange.end);

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.gregorianDate);
    return eventDate >= startDate && eventDate <= endDate;
  });

  filteredEvents.sort((a, b) => 
    new Date(a.gregorianDate).getTime() - new Date(b.gregorianDate).getTime()
  );

  doc.setFontSize(28);
  doc.setTextColor(34, 139, 34);
  
  const title = useArabicFont ? "الرزنامة" : "Al-Raznamah";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (210 - titleWidth) / 2, 22);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  
  let dateRangeText = "";
  if (options.displayType === "gregorian" || options.displayType === "both") {
    if (useArabicFont) {
      dateRangeText = `${formatGregorianDateAr(startDate)} - ${formatGregorianDateAr(endDate)}`;
    } else {
      dateRangeText = `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()} - ${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
    }
  }
  
  if (options.displayType === "hijri" || options.displayType === "both") {
    const startHijri = gregorianToHijri(startDate, hijriOverrides);
    const endHijri = gregorianToHijri(endDate, hijriOverrides);
    let hijriText = "";
    if (useArabicFont) {
      hijriText = `${formatHijriDateAr(startHijri)} - ${formatHijriDateAr(endHijri)}`;
    } else {
      hijriText = `${startHijri.day}/${startHijri.month}/${startHijri.year} H - ${endHijri.day}/${endHijri.month}/${endHijri.year} H`;
    }
    if (options.displayType === "hijri") {
      dateRangeText = hijriText;
    } else if (dateRangeText) {
      dateRangeText += ` | ${hijriText}`;
    }
  }
  
  const rangeWidth = doc.getTextWidth(dateRangeText);
  doc.text(dateRangeText, (210 - rangeWidth) / 2, 32);

  if (filteredEvents.length === 0) {
    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    const noEventsText = useArabicFont ? "لا توجد مناسبات في هذه الفترة" : "No events in this period";
    const noEventsWidth = doc.getTextWidth(noEventsText);
    doc.text(noEventsText, (210 - noEventsWidth) / 2, 60);
  } else {
    const tableData = filteredEvents.map((event) => {
      const date = new Date(event.gregorianDate);
      const hijri = gregorianToHijri(date, hijriOverrides);
      
      let dateStr = "";
      if (useArabicFont) {
        const gregDate = formatGregorianDateAr(date);
        const hijriDate = formatHijriDateAr(hijri);
        if (options.displayType === "gregorian") {
          dateStr = gregDate;
        } else if (options.displayType === "hijri") {
          dateStr = hijriDate;
        } else {
          dateStr = `${gregDate}\n${hijriDate}`;
        }
      } else {
        const gregDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const hijriDate = `${hijri.day}/${hijri.month}/${hijri.year} H`;
        if (options.displayType === "gregorian") {
          dateStr = gregDate;
        } else if (options.displayType === "hijri") {
          dateStr = hijriDate;
        } else {
          dateStr = `${gregDate}\n${hijriDate}`;
        }
      }
      
      return [
        useArabicFont ? (event.isAnnual ? "سنوي" : "-") : (event.isAnnual ? "Annual" : "-"),
        event.description || "-",
        event.title,
        dateStr,
      ];
    });

    const headers = useArabicFont 
      ? [["التكرار", "الوصف", "العنوان", "التاريخ"]]
      : [["Recurrence", "Description", "Title", "Date"]];

    doc.autoTable({
      startY: 42,
      head: headers,
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: 255,
        halign: useArabicFont ? "right" : "left",
        font: useArabicFont ? "Amiri" : "helvetica",
        fontSize: 11,
      },
      bodyStyles: {
        halign: useArabicFont ? "right" : "left",
        font: useArabicFont ? "Amiri" : "helvetica",
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 50 },
        2: { cellWidth: 55 },
        3: { cellWidth: 48 },
      },
      margin: { top: 42, right: 15, bottom: 25, left: 15 },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    
    if (useArabicFont) {
      const footerText = `صفحة ${toArabicNumeral(i)} من ${toArabicNumeral(pageCount)}`;
      doc.text(footerText, 105, 288, { align: "center" });
      doc.text("الرزنامة - التقويم الهجري والميلادي", 105, 283, { align: "center" });
    } else {
      doc.text(`Page ${i} of ${pageCount}`, 105, 288, { align: "center" });
      doc.text("Al-Raznamah - Hijri & Gregorian Calendar", 105, 283, { align: "center" });
    }
  }

  const fileName = `calendar_${options.dateRange.start}_${options.dateRange.end}.pdf`;
  doc.save(fileName);
}
