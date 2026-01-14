import { db } from "./db";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import {
  users,
  events,
  hijriOverrides,
  settings,
  files,
  fileMemberships,
  tasks,
  User,
  InsertUser,
  EventDb,
  InsertEventDb,
  HijriOverrideDb,
  InsertHijriOverrideDb,
  SettingsDb,
  InsertSettingsDb,
  FileDb,
  InsertFile,
  FileMembershipDb,
  InsertFileMembership,
  TaskDb,
  InsertTask,
} from "@shared/schema";

export interface IStorage {
  // Event methods
  getAllEvents(): Promise<EventDb[]>;
  getEvent(id: number): Promise<EventDb | undefined>;
  getEventsByFileId(fileId: number): Promise<EventDb[]>;
  createEvent(event: InsertEventDb): Promise<EventDb>;
  updateEvent(id: number, event: Partial<InsertEventDb>): Promise<EventDb | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // Hijri override methods
  getAllHijriOverrides(): Promise<HijriOverrideDb[]>;
  getHijriOverride(id: number): Promise<HijriOverrideDb | undefined>;
  createHijriOverride(override: InsertHijriOverrideDb): Promise<HijriOverrideDb>;
  deleteHijriOverride(id: number): Promise<boolean>;

  // Settings methods
  getSettings(userId: number): Promise<SettingsDb | undefined>;
  saveSettings(settingsData: InsertSettingsDb): Promise<SettingsDb>;

  // User management methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // File methods
  getAllFiles(): Promise<FileDb[]>;
  getFile(id: number): Promise<FileDb | undefined>;
  createFile(file: InsertFile): Promise<FileDb>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<FileDb | undefined>;
  deleteFile(id: number): Promise<boolean>;

  // File membership methods
  getFileMemberships(fileId: number): Promise<FileMembershipDb[]>;
  getFileMembershipsWithUsers(fileId: number): Promise<(FileMembershipDb & { user: { id: number; username: string; displayName: string | null } })[]>;
  getUserMemberships(userId: number): Promise<FileMembershipDb[]>;
  getMembership(userId: number, fileId: number): Promise<FileMembershipDb | undefined>;
  createMembership(membership: InsertFileMembership): Promise<FileMembershipDb>;
  updateMembership(id: number, data: Partial<InsertFileMembership>): Promise<FileMembershipDb | undefined>;
  deleteMembership(id: number): Promise<boolean>;
  deleteMembershipByUserAndFile(userId: number, fileId: number): Promise<boolean>;

  // User managed files
  getUserManagedFiles(userId: number): Promise<(FileDb & { membership: FileMembershipDb })[]>;

  // Task methods
  createTask(task: InsertTask): Promise<TaskDb>;
  getTask(id: number): Promise<TaskDb | undefined>;
  getTasksByEventId(eventId: number): Promise<TaskDb[]>;
  getTasksByUserId(userId: number): Promise<(TaskDb & { event: { id: number; title: string } })[]>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<TaskDb | undefined>;
  deleteTask(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ==================== Event Methods ====================

  async getAllEvents(): Promise<EventDb[]> {
    const result = await db.select().from(events).orderBy(desc(events.createdAt));
    return result;
  }

  async getEvent(id: number): Promise<EventDb | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0] ?? undefined;
  }

  async getEventsByFileId(fileId: number): Promise<EventDb[]> {
    const result = await db.select().from(events).where(eq(events.fileId, fileId)).orderBy(desc(events.createdAt));
    return result;
  }

  async createEvent(event: InsertEventDb): Promise<EventDb> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async updateEvent(id: number, event: Partial<InsertEventDb>): Promise<EventDb | undefined> {
    const result = await db
      .update(events)
      .set(event)
      .where(eq(events.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  // ==================== Hijri Override Methods ====================

  async getAllHijriOverrides(): Promise<HijriOverrideDb[]> {
    const result = await db.select().from(hijriOverrides).orderBy(desc(hijriOverrides.createdAt));
    return result;
  }

  async getHijriOverride(id: number): Promise<HijriOverrideDb | undefined> {
    const result = await db.select().from(hijriOverrides).where(eq(hijriOverrides.id, id));
    return result[0] ?? undefined;
  }

  async createHijriOverride(override: InsertHijriOverrideDb): Promise<HijriOverrideDb> {
    const result = await db.insert(hijriOverrides).values(override).returning();
    return result[0];
  }

  async deleteHijriOverride(id: number): Promise<boolean> {
    const result = await db.delete(hijriOverrides).where(eq(hijriOverrides.id, id)).returning();
    return result.length > 0;
  }

  // ==================== Settings Methods ====================

  async getSettings(userId: number): Promise<SettingsDb | undefined> {
    const result = await db.select().from(settings).where(eq(settings.userId, userId));
    return result[0] ?? undefined;
  }

  async saveSettings(settingsData: InsertSettingsDb): Promise<SettingsDb> {
    const existing = await this.getSettings(settingsData.userId);
    
    if (existing) {
      const result = await db
        .update(settings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(settings.userId, settingsData.userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(settings).values(settingsData).returning();
      return result[0];
    }
  }

  // ==================== User Management Methods ====================

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ?? undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0] ?? undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(desc(users.createdAt));
    return result;
  }

  // ==================== File Methods ====================

  async getAllFiles(): Promise<FileDb[]> {
    const result = await db.select().from(files).orderBy(desc(files.createdAt));
    return result;
  }

  async getFile(id: number): Promise<FileDb | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id));
    return result[0] ?? undefined;
  }

  async createFile(file: InsertFile): Promise<FileDb> {
    const result = await db.insert(files).values(file).returning();
    return result[0];
  }

  async updateFile(id: number, file: Partial<InsertFile>): Promise<FileDb | undefined> {
    const result = await db
      .update(files)
      .set({ ...file, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteFile(id: number): Promise<boolean> {
    // Delete all memberships first
    await db.delete(fileMemberships).where(eq(fileMemberships.fileId, id));
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result.length > 0;
  }

  // ==================== File Membership Methods ====================

  async getFileMemberships(fileId: number): Promise<FileMembershipDb[]> {
    const result = await db.select().from(fileMemberships).where(eq(fileMemberships.fileId, fileId));
    return result;
  }

  async getFileMembershipsWithUsers(fileId: number): Promise<(FileMembershipDb & { user: { id: number; username: string; displayName: string | null } })[]> {
    const result = await db
      .select({
        id: fileMemberships.id,
        userId: fileMemberships.userId,
        fileId: fileMemberships.fileId,
        role: fileMemberships.role,
        createdAt: fileMemberships.createdAt,
        updatedAt: fileMemberships.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(fileMemberships)
      .innerJoin(users, eq(fileMemberships.userId, users.id))
      .where(eq(fileMemberships.fileId, fileId));
    return result;
  }

  async getUserMemberships(userId: number): Promise<FileMembershipDb[]> {
    const result = await db.select().from(fileMemberships).where(eq(fileMemberships.userId, userId));
    return result;
  }

  async getMembership(userId: number, fileId: number): Promise<FileMembershipDb | undefined> {
    const result = await db
      .select()
      .from(fileMemberships)
      .where(and(eq(fileMemberships.userId, userId), eq(fileMemberships.fileId, fileId)));
    return result[0] ?? undefined;
  }

  async createMembership(membership: InsertFileMembership): Promise<FileMembershipDb> {
    const result = await db.insert(fileMemberships).values(membership).returning();
    return result[0];
  }

  async updateMembership(id: number, data: Partial<InsertFileMembership>): Promise<FileMembershipDb | undefined> {
    const result = await db
      .update(fileMemberships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fileMemberships.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteMembership(id: number): Promise<boolean> {
    const result = await db.delete(fileMemberships).where(eq(fileMemberships.id, id)).returning();
    return result.length > 0;
  }

  async deleteMembershipByUserAndFile(userId: number, fileId: number): Promise<boolean> {
    const result = await db
      .delete(fileMemberships)
      .where(and(eq(fileMemberships.userId, userId), eq(fileMemberships.fileId, fileId)))
      .returning();
    return result.length > 0;
  }

  async getUserManagedFiles(userId: number): Promise<(FileDb & { membership: FileMembershipDb })[]> {
    const memberships = await db
      .select()
      .from(fileMemberships)
      .where(
        and(
          eq(fileMemberships.userId, userId),
          or(
            eq(fileMemberships.role, "manager"),
            eq(fileMemberships.role, "deputy")
          )
        )
      );

    if (memberships.length === 0) {
      return [];
    }

    const fileIds = memberships.map(m => m.fileId);
    const userFiles = await db
      .select()
      .from(files)
      .where(inArray(files.id, fileIds))
      .orderBy(desc(files.createdAt));

    return userFiles.map(file => {
      const membership = memberships.find(m => m.fileId === file.id)!;
      return { ...file, membership };
    });
  }

  // ==================== Task Methods ====================

  async createTask(task: InsertTask): Promise<TaskDb> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async getTask(id: number): Promise<TaskDb | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0] ?? undefined;
  }

  async getTasksByEventId(eventId: number): Promise<TaskDb[]> {
    const result = await db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(desc(tasks.createdAt));
    return result;
  }

  async getTasksByUserId(userId: number): Promise<(TaskDb & { event: { id: number; title: string } })[]> {
    const result = await db
      .select({
        id: tasks.id,
        eventId: tasks.eventId,
        title: tasks.title,
        description: tasks.description,
        assignedTo: tasks.assignedTo,
        status: tasks.status,
        dueDate: tasks.dueDate,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        event: {
          id: events.id,
          title: events.title,
        },
      })
      .from(tasks)
      .innerJoin(events, eq(tasks.eventId, events.id))
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));
    return result;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<TaskDb | undefined> {
    const result = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
