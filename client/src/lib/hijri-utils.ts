import moment from "moment-hijri";
import type { HijriMonthOverride } from "@shared/schema";

export type { HijriMonthOverride };

moment.locale("ar-SA");

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export interface DualDate {
  gregorian: Date;
  hijri: HijriDate;
}

export function gregorianToHijri(date: Date, overrides?: HijriMonthOverride[]): HijriDate {
  // Use a copy of the date and set time to midnight for consistent comparison
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  const dTime = d.getTime();

  if (overrides && overrides.length > 0) {
    // Sort overrides chronologically to find the most relevant one
    const sortedOverrides = [...overrides].sort((a, b) => 
      new Date(a.gregorianStartDate).getTime() - new Date(b.gregorianStartDate).getTime()
    );

    // Find the override that covers this date
    for (let i = 0; i < sortedOverrides.length; i++) {
      const current = sortedOverrides[i];
      const start = new Date(current.gregorianStartDate);
      start.setHours(0, 0, 0, 0);
      const startTime = start.getTime();

      // Determine end of this override's influence
      // If there's a next override, it ends there. Otherwise, assume 30 days.
      let endTime: number;
      if (i < sortedOverrides.length - 1) {
        const next = new Date(sortedOverrides[i+1].gregorianStartDate);
        next.setHours(0, 0, 0, 0);
        endTime = next.getTime();
      } else {
        const fallbackEnd = new Date(startTime);
        fallbackEnd.setDate(fallbackEnd.getDate() + 30);
        endTime = fallbackEnd.getTime();
      }

      if (dTime >= startTime && dTime < endTime) {
        const daysDiff = Math.floor((dTime - startTime) / (1000 * 60 * 60 * 24));
        return {
          year: current.hijriYear,
          month: current.hijriMonth,
          day: daysDiff + 1,
        };
      }
    }
  }

  const m = moment(date);
  return {
    year: m.iYear(),
    month: m.iMonth() + 1,
    day: m.iDate(),
  };
}

export function hijriToGregorian(hijri: HijriDate, overrides?: HijriMonthOverride[]): Date {
  if (overrides && overrides.length > 0) {
    const directOverride = overrides.find(
      (o) => o.hijriYear === hijri.year && o.hijriMonth === hijri.month
    );
    if (directOverride) {
      const startDate = new Date(directOverride.gregorianStartDate);
      startDate.setDate(startDate.getDate() + hijri.day - 1);
      return startDate;
    }

    const sortedOverrides = [...overrides].sort((a, b) => {
      if (a.hijriYear !== b.hijriYear) return b.hijriYear - a.hijriYear;
      return b.hijriMonth - a.hijriMonth;
    });

    const precedingOverride = sortedOverrides.find(
      (o) =>
        o.hijriYear < hijri.year ||
        (o.hijriYear === hijri.year && o.hijriMonth < hijri.month)
    );

    if (precedingOverride) {
      const overrideStartDate = new Date(precedingOverride.gregorianStartDate);
      const baseHijriStart = moment(
        `${precedingOverride.hijriYear}/${precedingOverride.hijriMonth}/1`,
        "iYYYY/iM/iD"
      );
      const baseGregorianStart = baseHijriStart.toDate();

      const offsetDays = Math.round(
        (overrideStartDate.getTime() - baseGregorianStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      const targetMoment = moment(`${hijri.year}/${hijri.month}/${hijri.day}`, "iYYYY/iM/iD");
      const result = new Date(targetMoment.toDate());
      result.setDate(result.getDate() + offsetDays);
      return result;
    }
  }

  const m = moment(`${hijri.year}/${hijri.month}/${hijri.day}`, "iYYYY/iM/iD");
  return m.toDate();
}

export function formatHijriDate(hijri: HijriDate): string {
  const months = [
    "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
    "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
  ];
  return `${hijri.day} ${months[hijri.month - 1]} ${hijri.year}`;
}

export function formatGregorianDate(date: Date): string {
  const months = [
    "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
    "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function getMonthDays(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getHijriMonthDays(year: number, month: number): number {
  const m = moment(`${year}/${month}/1`, "iYYYY/iM/iD");
  return m.iDaysInMonth();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const daysInMonth = getMonthDays(year, month);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month - 1, i));
  }
  return days;
}

export function getCalendarDays(year: number, month: number, overrides?: HijriMonthOverride[]): DualDate[] {
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getMonthDays(year, month);
  const daysInPrevMonth = getMonthDays(year, month - 1);
  
  const days: DualDate[] = [];
  
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 2, daysInPrevMonth - i);
    days.push({
      gregorian: date,
      hijri: gregorianToHijri(date, overrides),
    });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month - 1, i);
    days.push({
      gregorian: date,
      hijri: gregorianToHijri(date, overrides),
    });
  }
  
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month, i);
    days.push({
      gregorian: date,
      hijri: gregorianToHijri(date, overrides),
    });
  }
  
  return days;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function toArabicNumerals(num: number | string, system: "arabic" | "hindi" = "arabic"): string {
  if (system === "arabic") {
    return String(num);
  }
  const hindiNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num)
    .split("")
    .map((d) => (/\d/.test(d) ? hindiNumerals[parseInt(d)] : d))
    .join("");
}

export function getCurrentHijriYear(): number {
  return moment().iYear();
}

export function getCurrentHijriMonth(): number {
  return moment().iMonth() + 1;
}
