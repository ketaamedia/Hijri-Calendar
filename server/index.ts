import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Trust proxy - MUST be first
app.set('trust proxy', 1);

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
      log("Warning: ADMIN_PASSWORD not set. Using default password 'admin123'. Please change this!");
      const hashedPassword = await hashPassword("admin123");
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
      log("Admin user created with username: admin and default password");
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
    const { log: serverLog } = await import("./storage");
    serverLog("Checking database tables...");
    
    // Create session table using SQL directly (no need for table.sql file)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire)
    `);
    
    // Explicitly check for users table existence and create if missing
    await pool.query(`
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
      )
    `);
    
    // Run the internal storage initialization which might create other tables
    if (typeof (storage as any).initialize === 'function') {
      await (storage as any).initialize();
    }
    
    serverLog("Database tables initialized successfully.");
    
    // Create admin user
    await createAdminUser();
  } catch (err) {
    console.error("Database initialization error:", err);
  }

  // Setup session middleware BEFORE auth and routes
  const PgSession = connectPgSimple(session);
  
  const sessionMiddleware = session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: false, // We already created it above
      pruneSessionInterval: 60 * 15 // Prune expired sessions every 15 minutes
    }),
    secret: process.env.SESSION_SECRET || 'hijri-calendar-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on every response
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax', // Changed from 'none' to 'lax' for same-origin
      path: '/'
    },
    name: 'hijri.sid',
    proxy: true // Trust the reverse proxy
  });

  app.use(sessionMiddleware);
  
  // Add session debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      log(`Session ID: ${req.sessionID}, User: ${(req as any).user?.username || 'none'}`, 'session');
      next();
    });
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
```

### 2. Key Changes Made:

1. ✅ **Added session middleware** with PostgreSQL store
2. ✅ **Set `trust proxy`** to handle Render's reverse proxy
3. ✅ **Created session table** directly with SQL (no need for table.sql file)
4. ✅ **Fixed cookie settings** for same-origin requests
5. ✅ **Added session debugging** in development mode
6. ✅ **Fixed user table schema** to include all fields

### 3. Environment Variables to Set in Render:
```
SESSION_SECRET=your-super-secret-random-string-here-make-it-long
ADMIN_PASSWORD=your-secure-admin-password
DATABASE_URL=your-neon-postgres-url
NODE_ENV=production
PORT=10000
