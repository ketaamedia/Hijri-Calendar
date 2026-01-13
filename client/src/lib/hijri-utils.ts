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
  const m = moment(date);
  
  if (overrides && overrides.length > 0) {
    for (const override of overrides) {
      const overrideStart = new Date(override.gregorianStartDate);
      const nextMonth = new Date(overrideStart);
      nextMonth.setDate(nextMonth.getDate() + 30);
      
      if (date >= overrideStart && date < nextMonth) {
        const daysDiff = Math.floor((date.getTime() - overrideStart.getTime()) / (1000 * 60 * 60 * 24));
        return {
          year: override.hijriYear,
          month: override.hijriMonth,
          day: daysDiff + 1,
        };
      }
    }
  }
  
  return {
    year: m.iYear(),
    month: m.iMonth() + 1,
    day: m.iDate(),
  };
}

export function hijriToGregorian(hijri: HijriDate, overrides?: HijriMonthOverride[]): Date {
  if (overrides && overrides.length > 0) {
    const override = overrides.find(
      (o) => o.hijriYear === hijri.year && o.hijriMonth === hijri.month
    );
    if (override) {
      const startDate = new Date(override.gregorianStartDate);
      startDate.setDate(startDate.getDate() + hijri.day - 1);
      return startDate;
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
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
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
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const hindiNumerals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const numerals = system === "arabic" ? arabicNumerals : hindiNumerals;
  return String(num)
    .split("")
    .map((d) => (/\d/.test(d) ? numerals[parseInt(d)] : d))
    .join("");
}

export function getCurrentHijriYear(): number {
  return moment().iYear();
}

export function getCurrentHijriMonth(): number {
  return moment().iMonth() + 1;
}
