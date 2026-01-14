# منصة بيت شاما (Beit Shama Platform) - Multi-User Management Platform

## Overview

Beit Shama Platform (منصة بيت شاما) is a comprehensive multi-user management platform supporting both Hijri (Islamic) and Gregorian calendars. The application is designed for Arabic-speaking users with full RTL (right-to-left) support, featuring multi-user authentication, file-based organizational structure with role-based access control, event management, recurring events, task assignments, file attachments, in-app notifications, attendance tracking, group chat, document library, reports & analytics, and cloud backups. Users are organized into "Files" (organizational units) with specific roles (Manager, Deputy, Member) determining their permissions within each file.

## Recent Changes

- **2026-01-14**: Major Platform Expansion
  - Added recurring events system (daily, weekly, monthly, yearly patterns)
  - Implemented task/assignment system with status workflow (pending, in_progress, completed, cancelled)
  - Integrated object storage for event attachments (up to 5 files, 50MB each)
  - Built in-app notification system with bell icon and unread count
  - Created notification settings page (email/in-app preferences)
  - Added reports & analytics page with charts (events by month, tasks by status, events by file)
  - Implemented attendance tracking system for events
  - Built group chat system per file with real-time polling
  - Created document library for each file with upload/download functionality
  - Added automatic backup system storing backups to object storage
  - Fixed authorization gaps to ensure file membership enforcement

- **2026-01-14 (earlier)**: Added File-Based Organizational System
  - Renamed platform from "الرزنامة" to "منصة بيت شاما"
  - Created files table for organizational units
  - Created file_memberships table with role system (manager, deputy, member)
  - Built file management page for admins with full CRUD operations
  - Added member management with role assignment to files
  - API endpoints for files and memberships with proper authorization
  - Updated sidebar navigation with files management link

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
- **Charts**: Recharts library for analytics visualizations
- **File Uploads**: Uppy v5 with presigned URL flow to object storage

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled via tsx for development, esbuild for production)
- **Authentication**: Passport.js with LocalStrategy, connect-pg-simple for sessions
- **API Pattern**: RESTful endpoints under `/api/*` prefix with auth middleware
- **Object Storage**: Google Cloud Storage via Replit integration
- **Static Serving**: Express static middleware serves built frontend assets

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Object Storage**: Replit Object Storage for files, attachments, documents, backups
- **Session Store**: PostgreSQL via connect-pg-simple
- **Schema**: Drizzle ORM with Zod validation schemas in `shared/schema.ts`
- **Tables**: users, events, tasks, attachments, notifications, userNotificationSettings, attendance, messages, documents, backups, hijriOverrides, settings, session, files, file_memberships

### Authentication & Authorization
- **Login**: POST /api/login with username/password
- **Logout**: POST /api/logout
- **Current User**: GET /api/user
- **User Roles**: admin (full access) or user (limited by permissions)
- **Permissions**: canCreateEvents, canEditEvents, canDeleteEvents (boolean flags)
- **File Roles**: manager (full file access), deputy (assistant), member (read/participate)
- **Authorization Helpers**: isFileMember, hasFileRole, isFileManagerOrDeputy
- **Password Security**: scrypt hashing with salt
- **Admin Seeding**: Auto-creates admin user on startup using ADMIN_PASSWORD env var

### Key Features Implementation
- **Multi-User Support**: User authentication with role-based permissions
- **Dashboard**: Homepage showing today's date, events, upcoming events, user info
- **User Management**: Admin panel to create/edit/delete user accounts
- **File Management**: Organizational units with member management and role assignment
- **My Files**: Dashboard for file managers/deputies to manage their files
- **Recurring Events**: Daily, weekly, monthly, yearly patterns with intervals and end dates
- **Tasks**: Assignment system with status workflow and due dates
- **Attachments**: File uploads per event using object storage
- **Notifications**: In-app notification system with bell icon and settings
- **Reports**: Analytics with bar/pie charts and PDF export
- **Attendance**: Track attendance for events (present, absent, excused, late)
- **Group Chat**: Real-time messaging per file with 5-second polling
- **Document Library**: File storage per organizational unit
- **Cloud Backups**: Manual and automatic backups to object storage
- **Hijri Calendar**: Uses `moment-hijri` library with manual override support
- **PDF Export**: jsPDF with Arabic font support (Amiri font embedded)
- **Excel Export/Import**: xlsx library for spreadsheet operations
- **Event Colors**: 8 customizable colors for events
- **Desktop App**: Electron wrapper available for Windows builds

### Project Structure
```
client/           # React frontend application
  src/
    components/   # UI components (calendar, events, notifications, sidebar)
    hooks/        # Custom React hooks (auth, calendar, toast, upload)
    lib/          # Utilities (hijri, pdf, excel, recurrence, queryClient)
    pages/        # Route pages (dashboard, home, my-files, tasks, attendance, reports, etc.)
server/           # Express backend
  auth.ts         # Passport.js authentication setup
  db.ts           # Database connection and Drizzle instance
  routes.ts       # API route definitions with auth middleware
  storage.ts      # Data persistence layer (DatabaseStorage class)
  backup-service.ts # Backup creation and object storage operations
  static.ts       # Static file serving
  replit_integrations/ # Object storage integration
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

### Object Storage
- **@google-cloud/storage**: Cloud storage operations
- **Uppy**: Frontend file upload with presigned URLs

### Authentication
- **Passport.js**: Authentication middleware
- **passport-local**: Local strategy for username/password auth
- **express-session**: Session management

### Third-Party Libraries
- **moment-hijri**: Hijri calendar date calculations
- **jsPDF + jspdf-autotable**: PDF document generation
- **xlsx**: Excel file import/export
- **date-fns**: Gregorian date utilities
- **recharts**: Charts and data visualization

### UI Framework
- **Radix UI**: Accessible component primitives
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
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`: Object storage bucket ID
- `PRIVATE_OBJECT_DIR`: Directory for private files in object storage
- `PUBLIC_OBJECT_SEARCH_PATHS`: Paths for public files in object storage
