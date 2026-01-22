import { db } from "./db";
import { eq, and, desc, or, inArray, sql } from "drizzle-orm";
import {
  users,
  events,
  hijriOverrides,
  settings,
  files,
  fileMemberships,
  tasks,
  attachments,
  notifications,
  userNotificationSettings,
  attendance,
  messages,
  documents,
  backups,
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
  AttachmentDb,
  InsertAttachment,
  NotificationDb,
  InsertNotification,
  UserNotificationSettingsDb,
  InsertUserNotificationSettings,
  AttendanceDb,
  InsertAttendance,
  MessageDb,
  InsertMessage,
  DocumentDb,
  InsertDocument,
  BackupDb,
  InsertBackup,
} from "@shared/schema";

export function log(message: string) {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
  console.log(`${timestamp} [express] ${message}`);
}

export interface IStorage {
  getAllEvents(): Promise<EventDb[]>;
  getEvent(id: number): Promise<EventDb | undefined>;
  getEventsByFileId(fileId: number): Promise<EventDb[]>;
  createEvent(event: InsertEventDb): Promise<EventDb>;
  updateEvent(id: number, event: Partial<InsertEventDb>): Promise<EventDb | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  getAllHijriOverrides(): Promise<HijriOverrideDb[]>;
  getHijriOverride(id: number): Promise<HijriOverrideDb | undefined>;
  createHijriOverride(override: InsertHijriOverrideDb): Promise<HijriOverrideDb>;
  deleteHijriOverride(id: number): Promise<boolean>;
  getSettings(userId: number): Promise<SettingsDb | undefined>;
  saveSettings(settingsData: InsertSettingsDb): Promise<SettingsDb>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getAllFiles(): Promise<FileDb[]>;
  getFile(id: number): Promise<FileDb | undefined>;
  createFile(file: InsertFile): Promise<FileDb>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<FileDb | undefined>;
  deleteFile(id: number): Promise<boolean>;
  getFileMemberships(fileId: number): Promise<FileMembershipDb[]>;
  getFileMembershipsWithUsers(fileId: number): Promise<(FileMembershipDb & { user: { id: number; username: string; displayName: string | null } })[]>;
  getUserMemberships(userId: number): Promise<FileMembershipDb[]>;
  getMembership(userId: number, fileId: number): Promise<FileMembershipDb | undefined>;
  getFileMembership(fileId: number, userId: number): Promise<FileMembershipDb | null>;
  createMembership(membership: InsertFileMembership): Promise<FileMembershipDb>;
  updateMembership(id: number, data: Partial<InsertFileMembership>): Promise<FileMembershipDb | undefined>;
  deleteMembership(id: number): Promise<boolean>;
  deleteMembershipByUserAndFile(userId: number, fileId: number): Promise<boolean>;
  getUserManagedFiles(userId: number): Promise<(FileDb & { membership: FileMembershipDb })[]>;
  createTask(task: InsertTask): Promise<TaskDb>;
  getTask(id: number): Promise<TaskDb | undefined>;
  getTasksByEventId(eventId: number): Promise<TaskDb[]>;
  getTasksByUserId(userId: number): Promise<(TaskDb & { event: { id: number; title: string } })[]>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<TaskDb | undefined>;
  deleteTask(id: number): Promise<boolean>;
  createAttachment(attachment: InsertAttachment): Promise<AttachmentDb>;
  getAttachmentsByEventId(eventId: number): Promise<AttachmentDb[]>;
  getAttachment(id: number): Promise<AttachmentDb | undefined>;
  deleteAttachment(id: number): Promise<boolean>;
  createNotification(notification: InsertNotification): Promise<NotificationDb>;
  getNotificationsByUserId(userId: number): Promise<NotificationDb[]>;
  markNotificationAsRead(id: number): Promise<NotificationDb | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  deleteNotification(id: number): Promise<boolean>;
  getUserNotificationSettings(userId: number): Promise<UserNotificationSettingsDb | undefined>;
  createUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettingsDb>;
  updateUserNotificationSettings(userId: number, settings: Partial<InsertUserNotificationSettings>): Promise<UserNotificationSettingsDb | undefined>;
  getAttendanceByEventId(eventId: number): Promise<(AttendanceDb & { user: { id: number; username: string; displayName: string | null } })[]>;
  getAttendanceByUserId(userId: number): Promise<(AttendanceDb & { event: { id: number; title: string } })[]>;
  recordAttendance(attendanceData: InsertAttendance): Promise<AttendanceDb>;
  updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<AttendanceDb | undefined>;
  deleteAttendance(id: number): Promise<boolean>;
  getAttendanceStats(eventId: number): Promise<{ present: number; absent: number; excused: number; late: number }>;
  getMessagesByFileId(fileId: number, limit?: number, offset?: number): Promise<(MessageDb & { user: { id: number; username: string; displayName: string | null } })[]>;
  getMessage(id: number): Promise<MessageDb | undefined>;
  createMessage(message: InsertMessage): Promise<MessageDb>;
  deleteMessage(id: number): Promise<boolean>;
  getDocumentsByFileId(fileId: number): Promise<(DocumentDb & { uploader: { id: number; username: string; displayName: string | null } | null })[]>;
  getDocument(id: number): Promise<DocumentDb | undefined>;
  createDocument(document: InsertDocument): Promise<DocumentDb>;
  updateDocument(id: number, data: Partial<InsertDocument>): Promise<DocumentDb | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getBackups(limit?: number): Promise<BackupDb[]>;
  getBackup(id: number): Promise<BackupDb | undefined>;
  createBackup(backup: InsertBackup): Promise<BackupDb>;
  deleteBackup(id: number): Promise<boolean>;
  createFullBackupData(): Promise<object>;
  initialize(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async initialize(): Promise<void> {
    log("Initializing database tables...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          display_name TEXT,
          description TEXT,
          role TEXT DEFAULT 'user',
          is_active BOOLEAN DEFAULT TRUE,
          can_create_events BOOLEAN DEFAULT TRUE,
          can_edit_events BOOLEAN DEFAULT TRUE,
          can_delete_events BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS files (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS file_memberships (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          all_day BOOLEAN DEFAULT FALSE,
          color TEXT,
          file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          is_recurring BOOLEAN DEFAULT FALSE,
          recurrence_pattern TEXT,
          recurrence_interval INTEGER,
          recurrence_end_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          due_date TIMESTAMP,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS attachments (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          file_type TEXT,
          file_size INTEGER,
          uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          link TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'absent',
          notes TEXT,
          marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS hijri_month_overrides (
          id SERIAL PRIMARY KEY,
          gregorian_start_date DATE NOT NULL,
          hijri_year INTEGER NOT NULL,
          hijri_month INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          theme TEXT DEFAULT 'light',
          language TEXT DEFAULT 'ar',
          calendar_view TEXT DEFAULT 'month',
          first_day_of_week INTEGER DEFAULT 6,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_notification_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          email_notifications BOOLEAN DEFAULT TRUE,
          in_app_notifications BOOLEAN DEFAULT TRUE,
          event_reminders BOOLEAN DEFAULT TRUE,
          task_notifications BOOLEAN DEFAULT TRUE,
          reminder_days_before INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS documents (
          id SERIAL PRIMARY KEY,
          file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          object_path TEXT NOT NULL,
          file_size INTEGER,
          content_type TEXT,
          uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS backups (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          url TEXT NOT NULL,
          size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      log("Database tables initialized successfully.");
    } catch (error) {
      log("Error initializing database tables: " + error);
    }
  }

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
    await db.delete(fileMemberships).where(eq(fileMemberships.fileId, id));
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result.length > 0;
  }

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

  async getFileMembership(fileId: number, userId: number): Promise<FileMembershipDb | null> {
    const [membership] = await db.select()
      .from(fileMemberships)
      .where(and(
        eq(fileMemberships.fileId, fileId),
        eq(fileMemberships.userId, userId)
      ));
    return membership || null;
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

  async createAttachment(attachment: InsertAttachment): Promise<AttachmentDb> {
    const result = await db.insert(attachments).values(attachment).returning();
    return result[0];
  }

  async getAttachmentsByEventId(eventId: number): Promise<AttachmentDb[]> {
    const result = await db.select().from(attachments).where(eq(attachments.eventId, eventId)).orderBy(desc(attachments.createdAt));
    return result;
  }

  async getAttachment(id: number): Promise<AttachmentDb | undefined> {
    const result = await db.select().from(attachments).where(eq(attachments.id, id));
    return result[0] ?? undefined;
  }

  async deleteAttachment(id: number): Promise<boolean> {
    const result = await db.delete(attachments).where(eq(attachments.id, id)).returning();
    return result.length > 0;
  }

  async createNotification(notification: InsertNotification): Promise<NotificationDb> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getNotificationsByUserId(userId: number): Promise<NotificationDb[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return result;
  }

  async markNotificationAsRead(id: number): Promise<NotificationDb | undefined> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning();
    return result.length >= 0;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count ?? 0);
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async getUserNotificationSettings(userId: number): Promise<UserNotificationSettingsDb | undefined> {
    const result = await db.select().from(userNotificationSettings).where(eq(userNotificationSettings.userId, userId));
    return result[0] ?? undefined;
  }

  async createUserNotificationSettings(settingsData: InsertUserNotificationSettings): Promise<UserNotificationSettingsDb> {
    const result = await db.insert(userNotificationSettings).values(settingsData).returning();
    return result[0];
  }

  async updateUserNotificationSettings(userId: number, settingsData: Partial<InsertUserNotificationSettings>): Promise<UserNotificationSettingsDb | undefined> {
    const existing = await this.getUserNotificationSettings(userId);
    
    if (existing) {
      const result = await db
        .update(userNotificationSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(userNotificationSettings.userId, userId))
        .returning();
      return result[0] ?? undefined;
    } else {
      return await this.createUserNotificationSettings({
        userId,
        emailNotifications: true,
        inAppNotifications: true,
        eventReminders: true,
        taskNotifications: true,
        reminderDaysBefore: 1,
        ...settingsData,
      });
    }
  }

  async getAttendanceByEventId(eventId: number): Promise<(AttendanceDb & { user: { id: number; username: string; displayName: string | null } })[]> {
    const result = await db
      .select({
        id: attendance.id,
        eventId: attendance.eventId,
        userId: attendance.userId,
        status: attendance.status,
        notes: attendance.notes,
        markedAt: attendance.markedAt,
        markedBy: attendance.markedBy,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .where(eq(attendance.eventId, eventId))
      .orderBy(desc(attendance.markedAt));
    return result;
  }

  async getAttendanceByUserId(userId: number): Promise<(AttendanceDb & { event: { id: number; title: string } })[]> {
    const result = await db
      .select({
        id: attendance.id,
        eventId: attendance.eventId,
        userId: attendance.userId,
        status: attendance.status,
        notes: attendance.notes,
        markedAt: attendance.markedAt,
        markedBy: attendance.markedBy,
        event: {
          id: events.id,
          title: events.title,
        },
      })
      .from(attendance)
      .innerJoin(events, eq(attendance.eventId, events.id))
      .where(eq(attendance.userId, userId))
      .orderBy(desc(attendance.markedAt));
    return result;
  }

  async initialize(): Promise<void> {
  log("Initializing database tables...");
  try {
    // Create all tables in order of dependency
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        // ... your existing users table
      );

      CREATE TABLE IF NOT EXISTS files (
        // ... your existing files table
      );

      // ... other existing tables ...
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'ar',
        calendar_view TEXT DEFAULT 'month',
        first_day_of_week INTEGER DEFAULT 6,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    log("Database tables initialized successfully.");
  } catch (error) {
    log("Error initializing database tables: " + error);
  }
}
