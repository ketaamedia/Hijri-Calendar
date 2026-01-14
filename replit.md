# Al-Raznamah (الرزنامة) - Multi-User Calendar Platform

## Overview

Al-Raznamah is a multi-user bilingual calendar platform supporting both Hijri (Islamic) and Gregorian calendars. The application is designed for Arabic-speaking users with full RTL (right-to-left) support, featuring multi-user authentication, role-based access control, event management, PDF/Excel export, and optional Electron desktop packaging. The app allows users to track events across both calendar systems with moon sighting-based Hijri date adjustments.

## Recent Changes

- **2026-01-14**: Transformed from standalone app to multi-user platform with authentication
  - Added Passport.js authentication with session-based login
  - Implemented role-based access control (admin/user roles)
  - Created user management panel for admins
  - Added permission-based UI controls (canCreateEvents, canEditEvents, canDeleteEvents)
  - Migrated from IndexedDB to PostgreSQL database
  - Built Dashboard homepage with today's events and user info

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom build script for production
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand for global calendar state (`use-calendar-store.ts`)
- **Authentication**: AuthProvider context (`use-auth.tsx`) with TanStack Query
- **Data Fetching**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled via tsx for development, esbuild for production)
- **Authentication**: Passport.js with LocalStrategy, connect-pg-simple for sessions
- **API Pattern**: RESTful endpoints under `/api/*` prefix with auth middleware
- **Static Serving**: Express static middleware serves built frontend assets

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Session Store**: PostgreSQL via connect-pg-simple
- **Schema**: Drizzle ORM with Zod validation schemas in `shared/schema.ts`
- **Tables**: users, events, hijriOverrides, settings, session

### Authentication & Authorization
- **Login**: POST /api/login with username/password
- **Logout**: POST /api/logout
- **Current User**: GET /api/user
- **User Roles**: admin (full access) or user (limited by permissions)
- **Permissions**: canCreateEvents, canEditEvents, canDeleteEvents (boolean flags)
- **Password Security**: scrypt hashing with salt
- **Admin Seeding**: Auto-creates admin user on startup using ADMIN_PASSWORD env var

### Key Features Implementation
- **Multi-User Support**: User authentication with role-based permissions
- **Dashboard**: Homepage showing today's date, events, upcoming events, user info
- **User Management**: Admin panel to create/edit/delete user accounts
- **Hijri Calendar**: Uses `moment-hijri` library with manual override support for moon sighting adjustments
- **PDF Export**: jsPDF with Arabic font support (Amiri font embedded as base64)
- **Excel Export/Import**: xlsx library for spreadsheet generation and import
- **CSV/JSON Import**: Support for importing events from various file formats
- **Backup/Restore**: Full backup and restore functionality with JSON export
- **Event Colors**: 8 customizable colors for events (primary, red, orange, yellow, green, blue, purple, pink)
- **Upcoming Events**: Countdown display for events within the next 30 days
- **Notifications**: Browser Notification API for event reminders (checks once per day)
- **Desktop App**: Electron wrapper available for Windows builds

### Project Structure
```
client/           # React frontend application
  src/
    components/   # UI components (calendar views, events, settings)
    hooks/        # Custom React hooks (calendar store, auth, toast, mobile detection)
    lib/          # Utilities (hijri-utils, pdf-export, excel-export, queryClient)
    pages/        # Route pages (dashboard, home, settings, export, backup, users, login)
server/           # Express backend
  auth.ts         # Passport.js authentication setup
  db.ts           # Database connection and Drizzle instance
  routes.ts       # API route definitions with auth middleware
  storage.ts      # Data persistence layer (DatabaseStorage class)
  static.ts       # Static file serving
shared/           # Shared TypeScript types and schemas
electron/         # Electron desktop app wrapper
```

### Design System
- Material Design-inspired with Google Calendar patterns
- Arabic typography: Noto Kufi Arabic (headings) and Noto Sans Arabic (body)
- Consistent spacing using Tailwind's 2, 4, 6, 8, 12, 16, 24 unit scale
- Responsive breakpoints: Mobile (single column), Tablet (sidebar + calendar), Desktop (full three-panel)

## External Dependencies

### Database
- **Drizzle ORM**: Schema definition and database operations
- **PostgreSQL**: Primary database for all data storage
- **connect-pg-simple**: PostgreSQL session store for Express

### Authentication
- **Passport.js**: Authentication middleware
- **passport-local**: Local strategy for username/password auth
- **express-session**: Session management

### Third-Party Libraries
- **moment-hijri**: Hijri calendar date calculations
- **jsPDF + jspdf-autotable**: PDF document generation
- **xlsx**: Excel file import/export
- **date-fns**: Gregorian date utilities

### UI Framework
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms)
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Optional Integrations
- **Electron**: Desktop application packaging (Windows)
- **Browser Notifications API**: Event reminders

## Environment Variables

Required secrets:
- `ADMIN_PASSWORD`: Password for auto-created admin user
- `SESSION_SECRET`: Secret key for session encryption
- `DATABASE_URL`: PostgreSQL connection string (auto-provided by Replit)
