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
  getFileMembership(fileId: number, userId: number): Promise<FileMembershipDb | null>;
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

  // Attachment methods
  createAttachment(attachment: InsertAttachment): Promise<AttachmentDb>;
  getAttachmentsByEventId(eventId: number): Promise<AttachmentDb[]>;
  getAttachment(id: number): Promise<AttachmentDb | undefined>;
  deleteAttachment(id: number): Promise<boolean>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<NotificationDb>;
  getNotificationsByUserId(userId: number): Promise<NotificationDb[]>;
  markNotificationAsRead(id: number): Promise<NotificationDb | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  deleteNotification(id: number): Promise<boolean>;

  // User Notification Settings methods
  getUserNotificationSettings(userId: number): Promise<UserNotificationSettingsDb | undefined>;
  createUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettingsDb>;
  updateUserNotificationSettings(userId: number, settings: Partial<InsertUserNotificationSettings>): Promise<UserNotificationSettingsDb | undefined>;

  // Attendance methods
  getAttendanceByEventId(eventId: number): Promise<(AttendanceDb & { user: { id: number; username: string; displayName: string | null } })[]>;
  getAttendanceByUserId(userId: number): Promise<(AttendanceDb & { event: { id: number; title: string } })[]>;
  recordAttendance(attendanceData: InsertAttendance): Promise<AttendanceDb>;
  updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<AttendanceDb | undefined>;
  deleteAttendance(id: number): Promise<boolean>;
  getAttendanceStats(eventId: number): Promise<{ present: number; absent: number; excused: number; late: number }>;

  // Message methods
  getMessagesByFileId(fileId: number, limit?: number, offset?: number): Promise<(MessageDb & { user: { id: number; username: string; displayName: string | null } })[]>;
  getMessage(id: number): Promise<MessageDb | undefined>;
  createMessage(message: InsertMessage): Promise<MessageDb>;
  deleteMessage(id: number): Promise<boolean>;

  // Document methods
  getDocumentsByFileId(fileId: number): Promise<(DocumentDb & { uploader: { id: number; username: string; displayName: string | null } | null })[]>;
  getDocument(id: number): Promise<DocumentDb | undefined>;
  createDocument(document: InsertDocument): Promise<DocumentDb>;
  updateDocument(id: number, data: Partial<InsertDocument>): Promise<DocumentDb | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Backup methods
  getBackups(limit?: number): Promise<BackupDb[]>;
  getBackup(id: number): Promise<BackupDb | undefined>;
  createBackup(backup: InsertBackup): Promise<BackupDb>;
  deleteBackup(id: number): Promise<boolean>;
  createFullBackupData(): Promise<object>;
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

  // ==================== Attachment Methods ====================

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

  // ==================== Notification Methods ====================

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

  // ==================== User Notification Settings Methods ====================

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

  // ==================== Attendance Methods ====================

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

  async recordAttendance(attendanceData: InsertAttendance): Promise<AttendanceDb> {
    const existing = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.eventId, attendanceData.eventId), eq(attendance.userId, attendanceData.userId)));
    
    if (existing.length > 0) {
      const result = await db
        .update(attendance)
        .set({ ...attendanceData, markedAt: new Date() })
        .where(eq(attendance.id, existing[0].id))
        .returning();
      return result[0];
    }
    
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<AttendanceDb | undefined> {
    const result = await db
      .update(attendance)
      .set({ ...data, markedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    const result = await db.delete(attendance).where(eq(attendance.id, id)).returning();
    return result.length > 0;
  }

  async getAttendanceStats(eventId: number): Promise<{ present: number; absent: number; excused: number; late: number }> {
    const result = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)`,
      })
      .from(attendance)
      .where(eq(attendance.eventId, eventId))
      .groupBy(attendance.status);
    
    const stats = { present: 0, absent: 0, excused: 0, late: 0 };
    for (const row of result) {
      if (row.status === "present") stats.present = Number(row.count);
      else if (row.status === "absent") stats.absent = Number(row.count);
      else if (row.status === "excused") stats.excused = Number(row.count);
      else if (row.status === "late") stats.late = Number(row.count);
    }
    return stats;
  }

  // ==================== Message Methods ====================

  async getMessagesByFileId(fileId: number, limit: number = 50, offset: number = 0): Promise<(MessageDb & { user: { id: number; username: string; displayName: string | null } })[]> {
    const result = await db
      .select({
        id: messages.id,
        fileId: messages.fileId,
        userId: messages.userId,
        content: messages.content,
        createdAt: messages.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.fileId, fileId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
    return result;
  }

  async getMessage(id: number): Promise<MessageDb | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id));
    return result[0] ?? undefined;
  }

  async createMessage(message: InsertMessage): Promise<MessageDb> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id)).returning();
    return result.length > 0;
  }

  // ==================== Document Methods ====================

  async getDocumentsByFileId(fileId: number): Promise<(DocumentDb & { uploader: { id: number; username: string; displayName: string | null } | null })[]> {
    const result = await db
      .select({
        id: documents.id,
        fileId: documents.fileId,
        name: documents.name,
        description: documents.description,
        objectPath: documents.objectPath,
        fileSize: documents.fileSize,
        contentType: documents.contentType,
        uploadedBy: documents.uploadedBy,
        createdAt: documents.createdAt,
        uploader: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.fileId, fileId))
      .orderBy(desc(documents.createdAt));
    return result;
  }

  async getDocument(id: number): Promise<DocumentDb | undefined> {
    const result = await db.select().from(documents).where(eq(documents.id, id));
    return result[0] ?? undefined;
  }

  async createDocument(document: InsertDocument): Promise<DocumentDb> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(id: number, data: Partial<InsertDocument>): Promise<DocumentDb | undefined> {
    const result = await db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return result[0] ?? undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  // ==================== Backup Methods ====================

  async getBackups(limit: number = 50): Promise<BackupDb[]> {
    const result = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(limit);
    return result;
  }

  async getBackup(id: number): Promise<BackupDb | undefined> {
    const result = await db.select().from(backups).where(eq(backups.id, id));
    return result[0] ?? undefined;
  }

  async createBackup(backup: InsertBackup): Promise<BackupDb> {
    const result = await db.insert(backups).values(backup).returning();
    return result[0];
  }

  async deleteBackup(id: number): Promise<boolean> {
    const result = await db.delete(backups).where(eq(backups.id, id)).returning();
    return result.length > 0;
  }

  async createFullBackupData(): Promise<object> {
    const allEvents = await this.getAllEvents();
    const allHijriOverrides = await this.getAllHijriOverrides();
    const allUsers = await this.getAllUsers();
    const allFiles = await this.getAllFiles();
    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    const allAttachments = await db.select().from(attachments).orderBy(desc(attachments.createdAt));
    const allNotifications = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    const allAttendance = await db.select().from(attendance).orderBy(desc(attendance.markedAt));
    const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));
    const allDocuments = await db.select().from(documents).orderBy(desc(documents.createdAt));
    const allFileMemberships = await db.select().from(fileMemberships);
    const allSettings = await db.select().from(settings);

    const usersWithoutPassword = allUsers.map(({ password, ...u }) => u);

    return {
      version: "1.0",
      exportDate: new Date().toISOString(),
      events: allEvents,
      hijriOverrides: allHijriOverrides,
      users: usersWithoutPassword,
      files: allFiles,
      fileMemberships: allFileMemberships,
      tasks: allTasks,
      attachments: allAttachments,
      notifications: allNotifications,
      attendance: allAttendance,
      messages: allMessages,
      documents: allDocuments,
      settings: allSettings,
    };
  }
}

export const storage = new DatabaseStorage();
