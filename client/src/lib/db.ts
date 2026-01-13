import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Event, HijriMonthOverride, Settings } from "@shared/schema";

interface CalendarDB extends DBSchema {
  events: {
    key: string;
    value: Event;
    indexes: { "by-date": string };
  };
  hijriOverrides: {
    key: string;
    value: HijriMonthOverride;
    indexes: { "by-year-month": [number, number] };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbInstance: IDBPDatabase<CalendarDB> | null = null;

async function getDB(): Promise<IDBPDatabase<CalendarDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<CalendarDB>("calendar-db", 1, {
    upgrade(db) {
      const eventsStore = db.createObjectStore("events", { keyPath: "id" });
      eventsStore.createIndex("by-date", "gregorianDate");
      
      const overridesStore = db.createObjectStore("hijriOverrides", { keyPath: "id" });
      overridesStore.createIndex("by-year-month", ["hijriYear", "hijriMonth"]);
      
      db.createObjectStore("settings", { keyPath: "id" });
    },
  });
  
  return dbInstance;
}

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDB();
  return db.getAll("events");
}

export async function getEvent(id: string): Promise<Event | undefined> {
  const db = await getDB();
  return db.get("events", id);
}

export async function addEvent(event: Event): Promise<void> {
  const db = await getDB();
  await db.put("events", event);
}

export async function updateEvent(event: Event): Promise<void> {
  const db = await getDB();
  await db.put("events", event);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("events", id);
}

export async function getEventsByDate(date: string): Promise<Event[]> {
  const db = await getDB();
  return db.getAllFromIndex("events", "by-date", date);
}

export async function getAllHijriOverrides(): Promise<HijriMonthOverride[]> {
  const db = await getDB();
  return db.getAll("hijriOverrides");
}

export async function addHijriOverride(override: HijriMonthOverride): Promise<void> {
  const db = await getDB();
  await db.put("hijriOverrides", override);
}

export async function deleteHijriOverride(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("hijriOverrides", id);
}

export async function getSettings(): Promise<Settings | undefined> {
  const db = await getDB();
  return db.get("settings", "main");
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put("settings", { ...settings, id: "main" } as any);
}

export async function initializeSettings(): Promise<Settings> {
  const existing = await getSettings();
  if (existing) return existing;
  
  const defaultSettings: Settings = {
    hijriEnabled: true,
    hijriReference: "khamenei",
    defaultView: "monthly",
    numeralSystem: "arabic",
    notificationsEnabled: true,
  };
  
  await saveSettings(defaultSettings);
  return defaultSettings;
}

export async function clearAllEvents(): Promise<void> {
  const db = await getDB();
  await db.clear("events");
}

export async function clearAllHijriOverrides(): Promise<void> {
  const db = await getDB();
  await db.clear("hijriOverrides");
}
