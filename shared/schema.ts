import { z } from "zod";

export const calendarTypeSchema = z.enum(["gregorian", "hijri"]);
export type CalendarType = z.infer<typeof calendarTypeSchema>;

export const hijriReferenceSchema = z.enum(["khamenei", "manual"]);
export type HijriReference = z.infer<typeof hijriReferenceSchema>;

export const eventColorSchema = z.enum([
  "primary",
  "red",
  "orange", 
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
]);
export type EventColor = z.infer<typeof eventColorSchema>;

export const eventSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  dateType: calendarTypeSchema,
  gregorianDate: z.string(),
  hijriYear: z.number(),
  hijriMonth: z.number(),
  hijriDay: z.number(),
  isAnnual: z.boolean().default(false),
  color: eventColorSchema.default("primary"),
  notifyDaysBefore: z.number().optional(),
});

export type Event = z.infer<typeof eventSchema>;

export const insertEventSchema = eventSchema.omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const hijriMonthOverrideSchema = z.object({
  id: z.string(),
  hijriYear: z.number(),
  hijriMonth: z.number(),
  gregorianStartDate: z.string(),
});

export type HijriMonthOverride = z.infer<typeof hijriMonthOverrideSchema>;

export const insertHijriMonthOverrideSchema = hijriMonthOverrideSchema.omit({ id: true });
export type InsertHijriMonthOverride = z.infer<typeof insertHijriMonthOverrideSchema>;

export const numeralSystemSchema = z.enum(["arabic", "hindi"]);
export type NumeralSystem = z.infer<typeof numeralSystemSchema>;

export const settingsSchema = z.object({
  hijriEnabled: z.boolean().default(true),
  hijriReference: hijriReferenceSchema.default("khamenei"),
  defaultView: z.enum(["monthly", "weekly", "yearly"]).default("monthly"),
  numeralSystem: numeralSystemSchema.default("arabic"),
  notificationsEnabled: z.boolean().default(true),
});

export type Settings = z.infer<typeof settingsSchema>;

export const hijriMonthNames = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الثاني",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

export const gregorianMonthNames = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
] as const;

export const weekDayNames = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

export const eventColorNames: Record<EventColor, string> = {
  primary: "أزرق داكن",
  red: "أحمر",
  orange: "برتقالي",
  yellow: "أصفر",
  green: "أخضر",
  blue: "أزرق",
  purple: "بنفسجي",
  pink: "وردي",
};

export const pdfExportOptionsSchema = z.object({
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  displayType: z.enum(["gregorian", "hijri", "both"]),
});

export type PDFExportOptions = z.infer<typeof pdfExportOptionsSchema>;

export const backupDataSchema = z.object({
  version: z.string(),
  exportDate: z.string(),
  events: z.array(eventSchema),
  hijriOverrides: z.array(hijriMonthOverrideSchema),
  settings: settingsSchema,
});

export type BackupData = z.infer<typeof backupDataSchema>;

export const users = {} as any;
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
