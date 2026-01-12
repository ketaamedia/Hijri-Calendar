import { create } from "zustand";
import type { Event, HijriMonthOverride, Settings } from "@shared/schema";
import * as db from "@/lib/db";

interface CalendarState {
  events: Event[];
  hijriOverrides: HijriMonthOverride[];
  settings: Settings;
  currentDate: Date;
  selectedDate: Date | null;
  view: "monthly" | "weekly" | "yearly";
  isLoading: boolean;
  
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setView: (view: "monthly" | "weekly" | "yearly") => void;
  
  loadData: () => Promise<void>;
  
  addEvent: (event: Event) => Promise<void>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  addHijriOverride: (override: HijriMonthOverride) => Promise<void>;
  deleteHijriOverride: (id: string) => Promise<void>;
  
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  hijriOverrides: [],
  settings: {
    hijriEnabled: true,
    hijriReference: "khamenei",
    defaultView: "monthly",
  },
  currentDate: new Date(),
  selectedDate: null,
  view: "monthly",
  isLoading: true,

  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setView: (view) => set({ view }),

  loadData: async () => {
    set({ isLoading: true });
    try {
      const [events, hijriOverrides, settings] = await Promise.all([
        db.getAllEvents(),
        db.getAllHijriOverrides(),
        db.initializeSettings(),
      ]);
      set({
        events,
        hijriOverrides,
        settings,
        view: settings.defaultView,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load data:", error);
      set({ isLoading: false });
    }
  },

  addEvent: async (event) => {
    await db.addEvent(event);
    set((state) => ({ events: [...state.events, event] }));
  },

  updateEvent: async (event) => {
    await db.updateEvent(event);
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }));
  },

  deleteEvent: async (id) => {
    await db.deleteEvent(id);
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },

  addHijriOverride: async (override) => {
    await db.addHijriOverride(override);
    set((state) => ({ hijriOverrides: [...state.hijriOverrides, override] }));
  },

  deleteHijriOverride: async (id) => {
    await db.deleteHijriOverride(id);
    set((state) => ({
      hijriOverrides: state.hijriOverrides.filter((o) => o.id !== id),
    }));
  },

  updateSettings: async (newSettings) => {
    const { settings } = get();
    const updated = { ...settings, ...newSettings };
    await db.saveSettings(updated);
    set({ settings: updated });
  },
}));
