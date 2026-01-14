import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { insertEventDbSchema, insertHijriOverrideDbSchema, settingsSchema, insertUserSchema, insertFileSchema, insertFileMembershipSchema, type User } from "@shared/schema";
import { z } from "zod";

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

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let userSettings = await storage.getSettings(user.id);
      if (!userSettings) {
        userSettings = await storage.saveSettings({
          userId: user.id,
          hijriEnabled: true,
          hijriReference: "khamenei",
          defaultView: "monthly",
          numeralSystem: "arabic",
          notificationsEnabled: true,
        });
      }
      res.json({
        hijriEnabled: userSettings.hijriEnabled,
        hijriReference: userSettings.hijriReference,
        defaultView: userSettings.defaultView,
        numeralSystem: userSettings.numeralSystem,
        notificationsEnabled: userSettings.notificationsEnabled,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const validatedData = settingsSchema.parse(req.body);
      const userSettings = await storage.saveSettings({
        userId: user.id,
        ...validatedData,
      });
      res.json({
        hijriEnabled: userSettings.hijriEnabled,
        hijriReference: userSettings.hijriReference,
        defaultView: userSettings.defaultView,
        numeralSystem: userSettings.numeralSystem,
        notificationsEnabled: userSettings.notificationsEnabled,
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

  return httpServer;
}
