import type { Event, HijriMonthOverride } from "@shared/schema";
import type { StorageAdapter } from "./types";
import { getCurrentHijriYear } from "./hijri-utils";
import { generateHijriMonthStartEvents, updateHijriMonthStartEvents } from "./auto-events";
import { syncOverrides, hasEventsForYear } from "./event-sync";
import { removeDuplicateEvents } from "./event-cleanup";

export class HijriEventManager {
  private storage: StorageAdapter;
  private syncInterval: number | null = null;
  private isInitialized = false;
  
  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }
  
  /**
   * التهيئة الأولية - تُستدعى مرة واحدة عند بدء التطبيق
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Already initialized");
      return;
    }
    
    try {
      console.log("Initializing HijriEventManager...");
      
      // 1. تنظيف التكرارات أولاً
      await this.cleanupDuplicates();
      
      // 2. مزامنة التعديلات
      const remoteOverrides = await this.storage.fetchRemoteOverrides();
      const localOverrides = await this.storage.getOverrides();
      const mergedOverrides = await syncOverrides(localOverrides, remoteOverrides);
      await this.storage.saveOverrides(mergedOverrides);
      
      // 3. تحديث الأحداث الموجودة
      await this.updateExistingEvents(mergedOverrides);
      
      // 4. توليد أحداث السنة الحالية إذا لم تكن موجودة
      await this.ensureCurrentYearEvents(mergedOverrides);
      
      // 5. بدء المزامنة الدورية
      this.startPeriodicSync();
      
      this.isInitialized = true;
      console.log("HijriEventManager initialized successfully");
    } catch (error) {
      console.error("Failed to initialize HijriEventManager:", error);
      throw error;
    }
  }
  
  /**
   * تنظيف الأحداث المكررة
   */
  async cleanupDuplicates(): Promise<number> {
    const allEvents = await this.storage.getAllEvents();
    const { uniqueEvents, duplicateIds } = removeDuplicateEvents(allEvents);
    
    if (duplicateIds.length > 0) {
      await this.storage.deleteEvents(duplicateIds);
      console.log(`Cleaned up ${duplicateIds.length} duplicate events`);
    }
    
    return duplicateIds.length;
  }
  
  /**
   * تحديث الأحداث الموجودة بناءً على التعديلات
   */
  private async updateExistingEvents(overrides: HijriMonthOverride[]): Promise<void> {
    const existingEvents = await this.storage.getAllEvents();
    const { eventsToUpdate } = updateHijriMonthStartEvents(existingEvents, overrides);
    
    if (eventsToUpdate.length > 0) {
      await this.storage.updateEvents(eventsToUpdate);
      console.log(`Updated ${eventsToUpdate.length} events`);
    }
  }
  
  /**
   * التأكد من وجود أحداث السنة الحالية
   */
  private async ensureCurrentYearEvents(overrides: HijriMonthOverride[]): Promise<void> {
    const currentYear = getCurrentHijriYear();
    const existingEvents = await this.storage.getAllEvents();
    
    if (!hasEventsForYear(existingEvents, currentYear)) {
      const newEvents = generateHijriMonthStartEvents(currentYear, overrides);
      await this.storage.addEvents(newEvents);
      console.log(`Generated events for Hijri year ${currentYear}`);
    }
  }
  
  /**
   * حفظ تعديل جديد ومزامنته
   */
  async saveOverride(year: number, month: number, adjustmentDays: number): Promise<void> {
    const override: HijriMonthOverride = {
      year,
      month,
      adjustmentDays,
      timestamp: Date.now()
    };
    
    // 1. حفظ محلياً
    await this.storage.addOverride(override);
    
    // 2. رفع للسيرفر (shared storage)
    const allOverrides = await this.storage.getOverrides();
    await this.storage.uploadOverrides(allOverrides);
    
    // 3. تحديث الأحداث المتأثرة
    await this.updateExistingEvents(allOverrides);
    
    console.log(`Override saved: ${year}/${month} +${adjustmentDays} days`);
  }
  
  /**
   * مزامنة دورية كل 5 دقائق
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      return; // already running
    }
    
    this.syncInterval = window.setInterval(async () => {
      try {
        const remoteOverrides = await this.storage.fetchRemoteOverrides();
        const localOverrides = await this.storage.getOverrides();
        const merged = await syncOverrides(localOverrides, remoteOverrides);
        
        // تحديث فقط إذا كان هناك تغيير
        if (JSON.stringify(merged) !== JSON.stringify(localOverrides)) {
          await this.storage.saveOverrides(merged);
          await this.updateExistingEvents(merged);
          console.log("Synced overrides from remote");
        }
      } catch (error) {
        console.error("Periodic sync failed:", error);
      }
    }, 5 * 60 * 1000); // 5 دقائق
  }
  
  /**
   * التنظيف عند إغلاق التطبيق
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isInitialized = false;
  }
  
  /**
   * جلب جميع الأحداث
   */
  async getAllEvents(): Promise<Event[]> {
    return this.storage.getAllEvents();
  }
  
  /**
   * جلب جميع التعديلات
   */
  async getAllOverrides(): Promise<HijriMonthOverride[]> {
    return this.storage.getOverrides();
  }
}
