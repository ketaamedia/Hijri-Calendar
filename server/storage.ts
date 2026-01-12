import type { Event, InsertEvent, HijriMonthOverride, InsertHijriMonthOverride, Settings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: InsertEvent): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  getAllHijriOverrides(): Promise<HijriMonthOverride[]>;
  getHijriOverride(id: string): Promise<HijriMonthOverride | undefined>;
  createHijriOverride(override: InsertHijriMonthOverride): Promise<HijriMonthOverride>;
  deleteHijriOverride(id: string): Promise<boolean>;
  
  getSettings(): Promise<Settings | undefined>;
  saveSettings(settings: Settings): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private events: Map<string, Event>;
  private hijriOverrides: Map<string, HijriMonthOverride>;
  private settings: Settings | undefined;

  constructor() {
    this.events = new Map();
    this.hijriOverrides = new Map();
    this.settings = undefined;
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, insertEvent: InsertEvent): Promise<Event | undefined> {
    if (!this.events.has(id)) {
      return undefined;
    }
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  async getAllHijriOverrides(): Promise<HijriMonthOverride[]> {
    return Array.from(this.hijriOverrides.values());
  }

  async getHijriOverride(id: string): Promise<HijriMonthOverride | undefined> {
    return this.hijriOverrides.get(id);
  }

  async createHijriOverride(insertOverride: InsertHijriMonthOverride): Promise<HijriMonthOverride> {
    const id = randomUUID();
    const override: HijriMonthOverride = { ...insertOverride, id };
    this.hijriOverrides.set(id, override);
    return override;
  }

  async deleteHijriOverride(id: string): Promise<boolean> {
    return this.hijriOverrides.delete(id);
  }

  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    this.settings = settings;
    return settings;
  }
}

export const storage = new MemStorage();
