import type { Event, HijriMonthOverride } from "@shared/schema";
import type { StorageAdapter } from "./types";
import { useCalendarStore } from "@/hooks/use-calendar-store";

const EVENTS_KEY = 'hijri_calendar_events';
const OVERRIDES_KEY = 'hijri_month_overrides';

export class PersistentStorageAdapter implements StorageAdapter {
  
  async getAllEvents(): Promise<Event[]> {
    try {
      // استخدم localStorage بدلاً من window.storage
      const data = localStorage.getItem(EVENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('No events found, starting fresh');
      return [];
    }
  }
  
  async addEvents(events: Event[]): Promise<void> {
    const existing = await this.getAllEvents();
    const updated = [...existing, ...events];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  }
  
  async updateEvents(events: Event[]): Promise<void> {
    const existing = await this.getAllEvents();
    const eventMap = new Map(events.map(e => [e.id, e]));
    
    const updated = existing.map(e => eventMap.get(e.id) || e);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  }
  
  async deleteEvents(ids: string[]): Promise<void> {
    const existing = await this.getAllEvents();
    const idsSet = new Set(ids);
    const filtered = existing.filter(e => !idsSet.has(e.id));
    localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  }
  
  async getOverrides(): Promise<HijriMonthOverride[]> {
    try {
      const data = localStorage.getItem(OVERRIDES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }
  
  async saveOverrides(overrides: HijriMonthOverride[]): Promise<void> {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  }
  
  async addOverride(override: HijriMonthOverride): Promise<void> {
    const existing = await this.getOverrides();
    const filtered = existing.filter(
      o => !(o.year === override.year && o.month === override.month)
    );
    await this.saveOverrides([...filtered, override]);
  }
  
  async fetchRemoteOverrides(): Promise<HijriMonthOverride[]> {
    try {
      // استخدم API لجلب التعديلات من السيرفر
      const response = await fetch('/api/hijri-overrides');
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch remote overrides:', error);
      return [];
    }
  }
  
  async uploadOverrides(overrides: HijriMonthOverride[]): Promise<void> {
    try {
      // رفع التعديلات للسيرفر
      await fetch('/api/hijri-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides)
      });
    } catch (error) {
      console.error('Failed to upload overrides:', error);
    }
  }
}
