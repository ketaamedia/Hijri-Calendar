import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { pool } from "./db";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, "password"> {}
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const [hashedPassword, salt] = hash.split(".");
  if (!hashedPassword || !salt) {
    return false;
  }
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export function setupAuth(app: Express): void {
  const PgStore = connectPgSimple(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "hijri-calendar-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on every response
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Changed from "none" to "lax" - important fix!
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    },
    store: new PgStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: false, // Table already created in index.ts
      pruneSessionInterval: 60 * 15 // Clean up every 15 minutes
    }),
    proxy: true, // Trust the reverse proxy
    name: 'hijri.sid'
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}
```

### Key Changes Made:

1. ✅ **Changed `sameSite` from `"none"` to `"lax"`** - This is critical! `"none"` requires cross-origin requests and strict HTTPS, but since your frontend and backend are on the same domain (hijri-calendar.onrender.com), you should use `"lax"`
2. ✅ **Added `proxy: true`** to trust Render's reverse proxy
3. ✅ **Added `rolling: true`** to refresh session on each request
4. ✅ **Added `name: 'hijri.sid'`** for a custom session cookie name
5. ✅ **Added `path: '/'`** to ensure cookie works across all routes
6. ✅ **Set `trust proxy` in index.ts BEFORE setupAuth**

### Environment Variables in Render:
```
SESSION_SECRET=use-a-very-long-random-string-here-at-least-32-characters
ADMIN_PASSWORD=your-secure-admin-password
DATABASE_URL=your-neon-postgres-connection-string
NODE_ENV=production
