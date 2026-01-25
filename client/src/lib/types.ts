import type { Event, HijriMonthOverride } from "@shared/schema";

export interface StorageAdapter {
  // Events
  getAllEvents(): Promise<Event[]>;
  addEvents(events: Event[]): Promise<void>;
  updateEvents(events: Event[]): Promise<void>;
  deleteEvents(ids: string[]): Promise<void>;
  
  // Overrides
  getOverrides(): Promise<HijriMonthOverride[]>;
  saveOverrides(overrides: HijriMonthOverride[]): Promise<void>;
  addOverride(override: HijriMonthOverride): Promise<void>;
  
  // Remote sync
  fetchRemoteOverrides(): Promise<HijriMonthOverride[]>;
  uploadOverrides(overrides: HijriMonthOverride[]): Promise<void>;
}
