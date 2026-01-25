import { useEffect, useState, useRef } from 'react';
import { HijriEventManager } from '@/lib/event-manager';
import { PersistentStorageAdapter } from '@/lib/storage-adapter';
import type { Event, HijriMonthOverride } from '@shared/schema';

export function useHijriEventManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [overrides, setOverrides] = useState<HijriMonthOverride[]>([]);
  const managerRef = useRef<HijriEventManager | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const storage = new PersistentStorageAdapter();
        const manager = new HijriEventManager(storage);
        
        await manager.initialize();
        
        if (mounted) {
          managerRef.current = manager;
          const allEvents = await manager.getAllEvents();
          const allOverrides = await manager.getAllOverrides();
          setEvents(allEvents);
          setOverrides(allOverrides);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed');
          setIsLoading(false);
        }
      }
    }
    
    init();
    
    return () => {
      mounted = false;
      managerRef.current?.cleanup();
    };
  }, []);
  
  const saveOverride = async (year: number, month: number, adjustmentDays: number) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.saveOverride(year, month, adjustmentDays);
      const updated = await managerRef.current.getAllOverrides();
      const updatedEvents = await managerRef.current.getAllEvents();
      setOverrides(updated);
      setEvents(updatedEvents);
    } catch (err) {
      console.error('Failed to save override:', err);
      throw err;
    }
  };
  
  const cleanupDuplicates = async () => {
    if (!managerRef.current) return 0;
    
    const count = await managerRef.current.cleanupDuplicates();
    const updatedEvents = await managerRef.current.getAllEvents();
    setEvents(updatedEvents);
    return count;
  };
  
  return {
    isLoading,
    error,
    events,
    overrides,
    saveOverride,
    cleanupDuplicates
  };
}
