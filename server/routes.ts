import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { insertEventDbSchema, insertHijriOverrideDbSchema, settingsSchema, insertUserSchema, insertFileSchema, insertFileMembershipSchema, insertTaskSchema, insertAttachmentSchema, insertMessageSchema, insertDocumentSchema, type User } from "@shared/schema";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/routes";
import { createBackupToObjectStorage, getBackupDownloadUrl, deleteBackupFromObjectStorage } from "./backup-service";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = req.user as User;
  if (user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Helper: Check if user is member of a file
async function isFileMember(userId: number, fileId: number): Promise<boolean> {
  const membership = await storage.getFileMembership(fileId, userId);
  return !!membership;
}

// Helper: Check if user has specific role in file
async function hasFileRole(userId: number, fileId: number, roles: string[]): Promise<boolean> {
  const membership = await storage.getFileMembership(fileId, userId);
  return membership ? roles.includes(membership.role) : false;
}

// Helper: Check if user is file manager or deputy
async function isFileManagerOrDeputy(userId: number, fileId: number): Promise<boolean> {
  return hasFileRole(userId, fileId, ['manager', 'deputy']);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== Event Routes ====================

  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      const eventsWithStringId = events.map(e => ({ ...e, id: String(e.id) }));
      res.json(eventsWithStringId);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(parseInt(req.params.id, 10));
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ ...event, id: String(event.id) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "admin" && !user.canCreateEvents) {
        return res.status(403).json({ error: "You don't have permission to create events" });
      }
      
      // Check file membership if fileId is provided
      if (req.body.fileId && user.role !== "admin") {
        const isMember = await isFileMember(user.id, req.body.fileId);
        if (!isMember) {
          return res.status(403).json({ error: "ليس لديك صلاحية إنشاء مناسبات في هذا الملف" });
        }
      }
      
      const validatedData = insertEventDbSchema.parse({
        ...req.body,
        createdBy: user.id,
      });
      const event = await storage.createEvent(validatedData);
      res.status(201).json({ ...event, id: String(event.id) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "admin" && !user.canEditEvents) {
        return res.status(403).json({ error: "You don't have permission to edit events" });
      }
      
      // Check file membership if updating with fileId
      if (req.body.fileId && user.role !== "admin") {
        const isMember = await isFileMember(user.id, req.body.fileId);
        if (!isMember) {
          return res.status(403).json({ error: "ليس لديك صلاحية تعديل مناسبات في هذا الملف" });
        }
      }
      
      // Also check existing event's fileId if it has one
      const existingEvent = await storage.getEvent(parseInt(req.params.id, 10));
      if (existingEvent && existingEvent.fileId && user.role !== "admin") {
        const isMember = await isFileMember(user.id, existingEvent.fileId);
        if (!isMember) {
          return res.status(403).json({ error: "ليس لديك صلاحية تعديل هذه المناسبة" });
        }
      }
      
      const validatedData = insertEventDbSchema.partial().parse(req.body);
      const event = await storage.updateEvent(parseInt(req.params.id, 10), validatedData);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ ...event, id: String(event.id) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "admin" && !user.canDeleteEvents) {
        return res.status(403).json({ error: "You don't have permission to delete events" });
      }
      const deleted = await storage.deleteEvent(parseInt(req.params.id, 10));
      if (!deleted) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // ==================== Hijri Override Routes ====================

  app.get("/api/hijri-overrides", requireAuth, async (req, res) => {
    try {
      const overrides = await storage.getAllHijriOverrides();
      const overridesWithStringId = overrides.map(o => ({ ...o, id: String(o.id) }));
      res.json(overridesWithStringId);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hijri overrides" });
    }
  });

  app.post("/api/hijri-overrides", requireAuth, async (req, res) => {
    try {
      const validatedData = insertHijriOverrideDbSchema.parse(req.body);
      const override = await storage.createHijriOverride(validatedData);
      res.status(201).json({ ...override, id: String(override.id) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create hijri override" });
    }
  });

  app.delete("/api/hijri-overrides/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteHijriOverride(parseInt(req.params.id, 10));
      if (!deleted) {
        return res.status(404).json({ error: "Override not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete hijri override" });
    }
  });

  // ==================== Settings Routes ====================

  app.put("/api/settings", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const validatedData = settingsSchema.parse(req.body);
    
    const userSettings = await storage.saveSettings({
      userId: user.id,
      hijriEnabled: validatedData.hijriEnabled,
      hijriReference: validatedData.hijriReference,
      defaultView: validatedData.defaultView,
      numeralSystem: validatedData.numeralSystem,
      notificationsEnabled: validatedData.notificationsEnabled,
      weatherLat: validatedData.weatherLat ? String(validatedData.weatherLat) : undefined,
      weatherLon: validatedData.weatherLon ? String(validatedData.weatherLon) : undefined,
      weatherLocationName: validatedData.weatherLocationName,
    });
    
    res.json({
      hijriEnabled: userSettings.hijriEnabled,
      hijriReference: userSettings.hijriReference,
      defaultView: userSettings.defaultView,
      numeralSystem: userSettings.numeralSystem,
      notificationsEnabled: userSettings.notificationsEnabled,
      weatherLat: userSettings.weatherLat,
      weatherLon: userSettings.weatherLon,
      weatherLocationName: userSettings.weatherLocationName,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to save settings" });
  }
});

  // ==================== User Management Routes (Admin Only) ====================

  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPassword = allUsers.map(({ password, ...u }) => u);
      res.json(usersWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id, 10));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  const createUserSchema = z.object({
    username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    displayName: z.string().optional(),
    description: z.string().optional(),
    role: z.enum(["admin", "user"]).default("user"),
    isActive: z.boolean().default(true),
    canCreateEvents: z.boolean().default(false),
    canEditEvents: z.boolean().default(false),
    canDeleteEvents: z.boolean().default(false),
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validatedData = createUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  const updateUserSchema = z.object({
    username: z.string().min(3).optional(),
    password: z.string().min(6).optional(),
    displayName: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    role: z.enum(["admin", "user"]).optional(),
    isActive: z.boolean().optional(),
    canCreateEvents: z.boolean().optional(),
    canEditEvents: z.boolean().optional(),
    canDeleteEvents: z.boolean().optional(),
  });

  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const validatedData = updateUserSchema.parse(req.body);
      
      if (validatedData.username) {
        const existingUser = await storage.getUserByUsername(validatedData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
        }
      }

      const updateData: any = { ...validatedData };
      if (validatedData.password) {
        updateData.password = await hashPassword(validatedData.password);
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const currentUser = req.user as User;
      
      if (currentUser.id === userId) {
        return res.status(400).json({ error: "لا يمكنك حذف حسابك الخاص" });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ==================== File Routes (Admin Only) ====================

  app.get("/api/files", requireAuth, async (req, res) => {
    try {
      const allFiles = await storage.getAllFiles();
      res.json(allFiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const file = await storage.getFile(parseInt(req.params.id, 10));
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  const createFileSchema = z.object({
    name: z.string().min(1, "اسم الملف مطلوب"),
    description: z.string().optional(),
  });

  app.post("/api/files", requireAdmin, async (req, res) => {
    try {
      const validatedData = createFileSchema.parse(req.body);
      const user = req.user as User;
      const newFile = await storage.createFile({
        ...validatedData,
        createdBy: user.id,
      });
      res.status(201).json(newFile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create file" });
    }
  });

  app.put("/api/files/:id", requireAdmin, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id, 10);
      const validatedData = createFileSchema.partial().parse(req.body);
      const updatedFile = await storage.updateFile(fileId, validatedData);
      if (!updatedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(updatedFile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", requireAdmin, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id, 10);
      const deleted = await storage.deleteFile(fileId);
      if (!deleted) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ==================== My Files Route (User's Managed Files) ====================

  app.get("/api/my-files", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const managedFiles = await storage.getUserManagedFiles(user.id);
      
      const filesWithCounts = await Promise.all(
        managedFiles.map(async (file) => {
          const members = await storage.getFileMemberships(file.id);
          const events = await storage.getEventsByFileId(file.id);
          return {
            ...file,
            memberCount: members.length,
            eventCount: events.length,
          };
        })
      );
      
      res.json(filesWithCounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch managed files" });
    }
  });

  // ==================== File Events Routes ====================

  app.get("/api/files/:fileId/events", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId, 10);
      const fileEvents = await storage.getEventsByFileId(fileId);
      const eventsWithStringId = fileEvents.map(e => ({ ...e, id: String(e.id) }));
      res.json(eventsWithStringId);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file events" });
    }
  });

  // ==================== File Membership Routes ====================

  app.get("/api/files/:fileId/memberships", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId, 10);
      const memberships = await storage.getFileMembershipsWithUsers(fileId);
      res.json(memberships);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memberships" });
    }
  });

  app.get("/api/users/:userId/memberships", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const memberships = await storage.getUserMemberships(userId);
      res.json(memberships);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user memberships" });
    }
  });

  const createMembershipSchema = z.object({
    userId: z.number(),
    fileId: z.number(),
    role: z.enum(["manager", "deputy", "member"]).default("member"),
  });

  app.post("/api/memberships", requireAdmin, async (req, res) => {
    try {
      const validatedData = createMembershipSchema.parse(req.body);
      
      // Check if membership already exists
      const existing = await storage.getMembership(validatedData.userId, validatedData.fileId);
      if (existing) {
        return res.status(400).json({ error: "المستخدم منضم للملف مسبقاً" });
      }

      const membership = await storage.createMembership(validatedData);
      res.status(201).json(membership);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create membership" });
    }
  });

  app.put("/api/memberships/:id", requireAdmin, async (req, res) => {
    try {
      const membershipId = parseInt(req.params.id, 10);
      const validatedData = z.object({
        role: z.enum(["manager", "deputy", "member"]),
      }).parse(req.body);
      
      const updated = await storage.updateMembership(membershipId, validatedData);
      if (!updated) {
        return res.status(404).json({ error: "Membership not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update membership" });
    }
  });

  app.delete("/api/memberships/:id", requireAdmin, async (req, res) => {
    try {
      const membershipId = parseInt(req.params.id, 10);
      const deleted = await storage.deleteMembership(membershipId);
      if (!deleted) {
        return res.status(404).json({ error: "Membership not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete membership" });
    }
  });

  // ==================== Task Routes ====================

  app.get("/api/events/:eventId/tasks", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId, 10);
      const eventTasks = await storage.getTasksByEventId(eventId);
      res.json(eventTasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  const createTaskSchema = z.object({
    title: z.string().min(1, "عنوان المهمة مطلوب"),
    description: z.string().optional(),
    assignedTo: z.number().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  });

  app.post("/api/events/:eventId/tasks", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const eventId = parseInt(req.params.eventId, 10);
      
      const validatedData = createTaskSchema.parse(req.body);
      
      const task = await storage.createTask({
        ...validatedData,
        eventId,
        createdBy: user.id,
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const updateTaskSchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        assignedTo: z.number().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
      });
      
      const validatedData = updateTaskSchema.parse(req.body);
      const updatedTask = await storage.updateTask(taskId, validatedData);
      
      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const deleted = await storage.deleteTask(taskId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/my-tasks", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const userTasks = await storage.getTasksByUserId(user.id);
      res.json(userTasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user tasks" });
    }
  });

  // ==================== Object Storage Routes ====================
  registerObjectStorageRoutes(app);

  // ==================== Attachment Routes ====================

  app.get("/api/events/:eventId/attachments", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId, 10);
      const eventAttachments = await storage.getAttachmentsByEventId(eventId);
      res.json(eventAttachments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  const createAttachmentSchema = z.object({
    fileName: z.string().min(1, "اسم الملف مطلوب"),
    objectPath: z.string().min(1, "مسار الملف مطلوب"),
    fileSize: z.number().min(0),
    contentType: z.string().min(1),
  });

  app.post("/api/events/:eventId/attachments", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const eventId = parseInt(req.params.eventId, 10);
      
      const validatedData = createAttachmentSchema.parse(req.body);
      
      const attachment = await storage.createAttachment({
        ...validatedData,
        eventId,
        uploadedBy: user.id,
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", requireAuth, async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id, 10);
      const deleted = await storage.deleteAttachment(attachmentId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // ==================== Notification Routes ====================

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const userNotifications = await storage.getNotificationsByUserId(user.id);
      res.json(userNotifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id, 10);
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id, 10);
      const deleted = await storage.deleteNotification(notificationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ==================== User Notification Settings Routes ====================

  app.get("/api/settings/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let userNotificationSettings = await storage.getUserNotificationSettings(user.id);
      
      if (!userNotificationSettings) {
        userNotificationSettings = await storage.createUserNotificationSettings({
          userId: user.id,
          emailNotifications: true,
          inAppNotifications: true,
          eventReminders: true,
          taskNotifications: true,
          reminderDaysBefore: 1,
        });
      }
      
      res.json({
        emailNotifications: userNotificationSettings.emailNotifications,
        inAppNotifications: userNotificationSettings.inAppNotifications,
        eventReminders: userNotificationSettings.eventReminders,
        taskNotifications: userNotificationSettings.taskNotifications,
        email: userNotificationSettings.email,
        reminderDaysBefore: userNotificationSettings.reminderDaysBefore,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  });

  const updateNotificationSettingsSchema = z.object({
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    eventReminders: z.boolean().optional(),
    taskNotifications: z.boolean().optional(),
    email: z.string().email().optional().nullable(),
    reminderDaysBefore: z.number().min(1).max(7).optional(),
  });

  app.patch("/api/settings/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const validatedData = updateNotificationSettingsSchema.parse(req.body);
      
      const updatedSettings = await storage.updateUserNotificationSettings(user.id, validatedData);
      
      if (!updatedSettings) {
        return res.status(500).json({ error: "Failed to update notification settings" });
      }
      
      res.json({
        emailNotifications: updatedSettings.emailNotifications,
        inAppNotifications: updatedSettings.inAppNotifications,
        eventReminders: updatedSettings.eventReminders,
        taskNotifications: updatedSettings.taskNotifications,
        email: updatedSettings.email,
        reminderDaysBefore: updatedSettings.reminderDaysBefore,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // ==================== Attendance Routes ====================

  app.get("/api/events/:eventId/attendance", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const eventId = parseInt(req.params.eventId, 10);
      
      // Check file membership for this event
      if (user.role !== "admin") {
        const event = await storage.getEvent(eventId);
        if (event && event.fileId) {
          const isMember = await isFileMember(user.id, event.fileId);
          if (!isMember) {
            return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى هذه المناسبة" });
          }
        }
      }
      
      const attendanceRecords = await storage.getAttendanceByEventId(eventId);
      res.json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  app.get("/api/events/:eventId/attendance/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const eventId = parseInt(req.params.eventId, 10);
      
      // Check file membership for this event
      if (user.role !== "admin") {
        const event = await storage.getEvent(eventId);
        if (event && event.fileId) {
          const isMember = await isFileMember(user.id, event.fileId);
          if (!isMember) {
            return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى هذه المناسبة" });
          }
        }
      }
      
      const stats = await storage.getAttendanceStats(eventId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance stats" });
    }
  });

  const recordAttendanceSchema = z.object({
    userId: z.number(),
    status: z.enum(["present", "absent", "excused", "late"]).default("present"),
    notes: z.string().optional().nullable(),
  });

  const bulkAttendanceSchema = z.array(recordAttendanceSchema);

  app.post("/api/events/:eventId/attendance", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const eventId = parseInt(req.params.eventId, 10);
      
      // Check file membership for this event
      if (user.role !== "admin") {
        const event = await storage.getEvent(eventId);
        if (event && event.fileId) {
          const isMember = await isFileMember(user.id, event.fileId);
          if (!isMember) {
            return res.status(403).json({ error: "ليس لديك صلاحية تسجيل الحضور لهذه المناسبة" });
          }
        }
      }
      
      const validatedData = bulkAttendanceSchema.parse(req.body);
      
      const results = [];
      for (const record of validatedData) {
        const attendance = await storage.recordAttendance({
          eventId,
          userId: record.userId,
          status: record.status,
          notes: record.notes,
          markedBy: user.id,
        });
        results.push(attendance);
      }
      
      res.status(201).json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to record attendance" });
    }
  });

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const attendanceId = parseInt(req.params.id, 10);
      
      // Check file membership for the attendance's event
      if (user.role !== "admin") {
        const attendanceRecords = await storage.getAttendanceByEventId(attendanceId);
        const attendanceRecord = attendanceRecords.find(a => a.id === attendanceId);
        if (attendanceRecord) {
          const event = await storage.getEvent(attendanceRecord.eventId);
          if (event && event.fileId) {
            const isMember = await isFileMember(user.id, event.fileId);
            if (!isMember) {
              return res.status(403).json({ error: "ليس لديك صلاحية تعديل سجل الحضور" });
            }
          }
        }
      }
      
      const updateAttendanceSchema = z.object({
        status: z.enum(["present", "absent", "excused", "late"]).optional(),
        notes: z.string().optional().nullable(),
      });
      
      const validatedData = updateAttendanceSchema.parse(req.body);
      const updated = await storage.updateAttendance(attendanceId, validatedData);
      
      if (!updated) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  app.get("/api/attendance/user/:userId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const requestedUserId = parseInt(req.params.userId, 10);
      
      // Users can only see their own attendance unless admin
      if (user.role !== "admin" && user.id !== requestedUserId) {
        return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى سجل حضور هذا المستخدم" });
      }
      
      const attendanceRecords = await storage.getAttendanceByUserId(requestedUserId);
      res.json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user attendance history" });
    }
  });

  app.delete("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const attendanceId = parseInt(req.params.id, 10);
      
      // Check file membership for the attendance's event
      if (user.role !== "admin") {
        const attendanceRecords = await storage.getAttendanceByEventId(attendanceId);
        const attendanceRecord = attendanceRecords.find(a => a.id === attendanceId);
        if (attendanceRecord) {
          const event = await storage.getEvent(attendanceRecord.eventId);
          if (event && event.fileId) {
            const isMember = await isFileMember(user.id, event.fileId);
            if (!isMember) {
              return res.status(403).json({ error: "ليس لديك صلاحية حذف سجل الحضور" });
            }
          }
        }
      }
      
      const deleted = await storage.deleteAttendance(attendanceId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attendance record" });
    }
  });

  // ==================== Analytics Routes ====================

  app.get("/api/analytics/summary", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let allEvents = await storage.getAllEvents();
      const allUsers = await storage.getAllUsers();
      let allFiles = await storage.getAllFiles();
      
      // Filter by file memberships unless admin
      if (user.role !== "admin") {
        const userMemberships = await storage.getUserMemberships(user.id);
        const userFileIds = new Set(userMemberships.map(m => m.fileId));
        
        // Filter events: include events with no fileId OR events in user's files
        allEvents = allEvents.filter(e => !e.fileId || userFileIds.has(e.fileId));
        
        // Filter files to only user's files
        allFiles = allFiles.filter(f => userFileIds.has(f.id));
      }
      
      // Get all tasks by fetching events and their tasks
      let allTasks: any[] = [];
      for (const event of allEvents) {
        const eventTasks = await storage.getTasksByEventId(event.id);
        allTasks = allTasks.concat(eventTasks);
      }
      
      const completedTasks = allTasks.filter(t => t.status === "completed");
      const pendingTasks = allTasks.filter(t => t.status === "pending");
      
      // Events this month and last month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const eventsThisMonth = allEvents.filter(e => {
        const eventDate = new Date(e.gregorianDate);
        return eventDate >= thisMonthStart && eventDate <= now;
      });
      
      const eventsLastMonth = allEvents.filter(e => {
        const eventDate = new Date(e.gregorianDate);
        return eventDate >= lastMonthStart && eventDate <= lastMonthEnd;
      });
      
      const taskCompletionRate = allTasks.length > 0 
        ? Math.round((completedTasks.length / allTasks.length) * 100) 
        : 0;
      
      res.json({
        totalEvents: allEvents.length,
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        totalFiles: allFiles.length,
        totalUsers: allUsers.length,
        eventsThisMonth: eventsThisMonth.length,
        eventsLastMonth: eventsLastMonth.length,
        taskCompletionRate,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  });

  app.get("/api/analytics/events-by-month", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let allEvents = await storage.getAllEvents();
      
      // Filter by file memberships unless admin
      if (user.role !== "admin") {
        const userMemberships = await storage.getUserMemberships(user.id);
        const userFileIds = new Set(userMemberships.map(m => m.fileId));
        allEvents = allEvents.filter(e => !e.fileId || userFileIds.has(e.fileId));
      }
      
      const now = new Date();
      const months: { month: string; count: number }[] = [];
      
      const arabicMonths = [
        "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
        "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
      ];
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const count = allEvents.filter(e => {
          const eventDate = new Date(e.gregorianDate);
          return eventDate >= monthDate && eventDate <= monthEnd;
        }).length;
        
        months.push({
          month: arabicMonths[monthDate.getMonth()],
          count,
        });
      }
      
      res.json(months);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events by month" });
    }
  });

  app.get("/api/analytics/tasks-by-status", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let allEvents = await storage.getAllEvents();
      
      // Filter by file memberships unless admin
      if (user.role !== "admin") {
        const userMemberships = await storage.getUserMemberships(user.id);
        const userFileIds = new Set(userMemberships.map(m => m.fileId));
        allEvents = allEvents.filter(e => !e.fileId || userFileIds.has(e.fileId));
      }
      
      let allTasks: any[] = [];
      for (const event of allEvents) {
        const eventTasks = await storage.getTasksByEventId(event.id);
        allTasks = allTasks.concat(eventTasks);
      }
      
      const statusLabels: Record<string, string> = {
        pending: "قيد الانتظار",
        in_progress: "قيد التنفيذ",
        completed: "مكتملة",
        cancelled: "ملغاة",
      };
      
      const statusCounts: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };
      
      allTasks.forEach(task => {
        if (task.status in statusCounts) {
          statusCounts[task.status]++;
        }
      });
      
      const result = Object.entries(statusCounts).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
      }));
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks by status" });
    }
  });

  app.get("/api/analytics/events-by-file", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let allEvents = await storage.getAllEvents();
      let allFiles = await storage.getAllFiles();
      
      // Filter by file memberships unless admin
      if (user.role !== "admin") {
        const userMemberships = await storage.getUserMemberships(user.id);
        const userFileIds = new Set(userMemberships.map(m => m.fileId));
        allEvents = allEvents.filter(e => !e.fileId || userFileIds.has(e.fileId));
        allFiles = allFiles.filter(f => userFileIds.has(f.id));
      }
      
      const fileCounts: Record<number, { fileName: string; count: number }> = {};
      
      allFiles.forEach(file => {
        fileCounts[file.id] = { fileName: file.name, count: 0 };
      });
      
      allEvents.forEach(event => {
        if (event.fileId && fileCounts[event.fileId]) {
          fileCounts[event.fileId].count++;
        }
      });
      
      const result = Object.values(fileCounts)
        .filter(f => f.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events by file" });
    }
  });

  // ==================== Message Routes ====================

  app.get("/api/files/:fileId/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const fileId = parseInt(req.params.fileId, 10);
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const membership = await storage.getMembership(user.id, fileId);
      if (!membership) {
        return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى هذا الملف" });
      }

      const fileMessages = await storage.getMessagesByFileId(fileId, limit, offset);
      res.json(fileMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const createMessageSchema = z.object({
    content: z.string().min(1, "محتوى الرسالة مطلوب"),
  });

  app.post("/api/files/:fileId/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const fileId = parseInt(req.params.fileId, 10);

      const membership = await storage.getMembership(user.id, fileId);
      if (!membership) {
        return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى هذا الملف" });
      }

      const validatedData = createMessageSchema.parse(req.body);
      
      const message = await storage.createMessage({
        fileId,
        userId: user.id,
        content: validatedData.content,
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const messageId = parseInt(req.params.id, 10);

      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }

      const membership = await storage.getMembership(user.id, message.fileId);
      if (!membership) {
        return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى هذا الملف" });
      }

      const isAuthor = message.userId === user.id;
      const isManager = membership.role === "manager";

      if (!isAuthor && !isManager) {
        return res.status(403).json({ error: "ليس لديك صلاحية حذف هذه الرسالة" });
      }

      const deleted = await storage.deleteMessage(messageId);
      if (!deleted) {
        return res.status(404).json({ error: "الرسالة غير موجودة" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // ==================== Document Routes ====================

  app.get("/api/files/:fileId/documents", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const fileId = parseInt(req.params.fileId, 10);

      const membership = await storage.getMembership(user.id, fileId);
      if (!membership && user.role !== "admin") {
        return res.status(403).json({ error: "ليس لديك صلاحية الوصول إلى هذا الملف" });
      }

      const fileDocuments = await storage.getDocumentsByFileId(fileId);
      res.json(fileDocuments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  const createDocumentSchema = z.object({
    name: z.string().min(1, "اسم المستند مطلوب"),
    description: z.string().optional(),
    objectPath: z.string().min(1, "مسار الملف مطلوب"),
    fileSize: z.number().optional(),
    contentType: z.string().optional(),
  });

  app.post("/api/files/:fileId/documents", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const fileId = parseInt(req.params.fileId, 10);

      const membership = await storage.getMembership(user.id, fileId);
      if (!membership || (membership.role !== "manager" && membership.role !== "deputy")) {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "ليس لديك صلاحية رفع مستندات لهذا الملف" });
        }
      }

      const validatedData = createDocumentSchema.parse(req.body);
      
      const document = await storage.createDocument({
        ...validatedData,
        fileId,
        uploadedBy: user.id,
      });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  const updateDocumentSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
  });

  app.patch("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const documentId = parseInt(req.params.id, 10);

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "المستند غير موجود" });
      }

      const membership = await storage.getMembership(user.id, document.fileId);
      if (!membership || (membership.role !== "manager" && membership.role !== "deputy")) {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "ليس لديك صلاحية تعديل هذا المستند" });
        }
      }

      const validatedData = updateDocumentSchema.parse(req.body);
      const updatedDocument = await storage.updateDocument(documentId, validatedData);
      
      if (!updatedDocument) {
        return res.status(404).json({ error: "المستند غير موجود" });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const documentId = parseInt(req.params.id, 10);

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "المستند غير موجود" });
      }

      const membership = await storage.getMembership(user.id, document.fileId);
      if (!membership || (membership.role !== "manager" && membership.role !== "deputy")) {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "ليس لديك صلاحية حذف هذا المستند" });
        }
      }

      const deleted = await storage.deleteDocument(documentId);
      if (!deleted) {
        return res.status(404).json({ error: "المستند غير موجود" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ==================== Backup Routes (Admin Only) ====================

  app.get("/api/backups", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const backupsList = await storage.getBackups(limit);
      res.json(backupsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  app.post("/api/backups/create", requireAdmin, async (req, res) => {
    try {
      const user = req.user as User;
      const isAutomatic = req.body.isAutomatic === true;
      
      const result = await createBackupToObjectStorage(user.id, isAutomatic);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to create backup" });
      }
      
      const backup = await storage.getBackup(result.backupId!);
      res.status(201).json(backup);
    } catch (error) {
      console.error("Backup creation error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/backups/:id/download", requireAdmin, async (req, res) => {
    try {
      const backupId = parseInt(req.params.id, 10);
      const backup = await storage.getBackup(backupId);
      
      if (!backup) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      const downloadUrl = await getBackupDownloadUrl(backup.objectPath);
      res.json({ downloadUrl });
    } catch (error) {
      console.error("Backup download error:", error);
      res.status(500).json({ error: "Failed to get download URL" });
    }
  });

  app.delete("/api/backups/:id", requireAdmin, async (req, res) => {
    try {
      const backupId = parseInt(req.params.id, 10);
      const backup = await storage.getBackup(backupId);
      
      if (!backup) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      await deleteBackupFromObjectStorage(backup.objectPath);
      
      const deleted = await storage.deleteBackup(backupId);
      if (!deleted) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Backup deletion error:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  return httpServer;
}
