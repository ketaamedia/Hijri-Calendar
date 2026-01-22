import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function createAdminUser() {
  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      log("Warning: ADMIN_PASSWORD not set. Admin user not created. Please set ADMIN_PASSWORD environment variable.");
      return;
    }
    const hashedPassword = await hashPassword(adminPassword);
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      displayName: "المدير",
      description: "مدير النظام",
      role: "admin",
      isActive: true,
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: true,
    });
    log("Admin user created with username: admin");
  }
}

(async () => {
  // Setup database tables if they don't exist
  try {
    const { pool } = await import("./db");
    const { storage, log: serverLog } = await import("./storage");
    serverLog("Checking database tables...");
    
    // Explicitly check for users table existence and create if missing
    // This is a safety measure for environments without migrations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        can_create_events BOOLEAN DEFAULT TRUE,
        can_edit_events BOOLEAN DEFAULT TRUE,
        can_delete_events BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Run the internal storage initialization which might create other tables
    if (typeof (storage as any).initialize === 'function') {
      await (storage as any).initialize();
    }
    
    // Create admin user with env password
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    await createAdminUser();
  } catch (err) {
    console.error("Database initialization error:", err);
  }

  setupAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
