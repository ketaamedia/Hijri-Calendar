import type { Event, HijriMonthOverride } from "@shared/schema";
import type { StorageAdapter } from "./types";

const EVENTS_KEY = 'hijri_calendar_events';
const OVERRIDES_KEY = 'hijri_month_overrides';
const REMOTE_OVERRIDES_KEY = 'global_hijri_overrides';

export class PersistentStorageAdapter implements StorageAdapter {
  
  async getAllEvents(): Promise<Event[]> {
    try {
      const result = await window.storage.get(EVENTS_KEY);
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      console.log('No events found, starting fresh');
      return [];
    }
  }
  
  async addEvents(events: Event[]): Promise<void> {
    const existing = await this.getAllEvents();
    const updated = [...existing, ...events];
    await window.storage.set(EVENTS_KEY, JSON.stringify(updated));
  }
  
  async updateEvents(events: Event[]): Promise<void> {
    const existing = await this.getAllEvents();
    const eventMap = new Map(events.map(e => [e.id, e]));
    
    const updated = existing.map(e => eventMap.get(e.id) || e);
    await window.storage.set(EVENTS_KEY, JSON.stringify(updated));
  }
  
  async deleteEvents(ids: string[]): Promise<void> {
    const existing = await this.getAllEvents();
    const idsSet = new Set(ids);
    const filtered = existing.filter(e => !idsSet.has(e.id));
    await window.storage.set(EVENTS_KEY, JSON.stringify(filtered));
  }
  
  async getOverrides(): Promise<HijriMonthOverride[]> {
    try {
      const result = await window.storage.get(OVERRIDES_KEY);
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      return [];
    }
  }
  
  async saveOverrides(overrides: HijriMonthOverride[]): Promise<void> {
    await window.storage.set(OVERRIDES_KEY, JSON.stringify(overrides));
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
      const result = await window.storage.get(REMOTE_OVERRIDES_KEY, true);
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      return [];
    }
  }
  
  async uploadOverrides(overrides: HijriMonthOverride[]): Promise<void> {
    await window.storage.set(
      REMOTE_OVERRIDES_KEY,
      JSON.stringify(overrides),
      true // shared = true
    );
  }
}
