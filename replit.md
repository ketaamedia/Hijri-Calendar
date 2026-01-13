# Al-Raznamah (الرزنامة) - Dual Calendar Application

## Overview

Al-Raznamah is a bilingual calendar application supporting both Hijri (Islamic) and Gregorian calendars. The application is designed for Arabic-speaking users with full RTL (right-to-left) support, featuring event management, PDF/Excel export, and optional Electron desktop packaging. The app allows users to track events across both calendar systems with moon sighting-based Hijri date adjustments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom build script for production
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand for global calendar state (`use-calendar-store.ts`)
- **Data Fetching**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled via tsx for development, esbuild for production)
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Static Serving**: Express static middleware serves built frontend assets

### Data Storage
- **Client-side**: IndexedDB via `idb` library for offline-first event storage
- **Server-side**: Memory storage implementation (`MemStorage` class) with interface for future PostgreSQL migration
- **Schema**: Drizzle ORM with Zod validation schemas in `shared/schema.ts`
- **Database Ready**: Drizzle configuration points to PostgreSQL but currently uses in-memory storage

### Key Features Implementation
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
    hooks/        # Custom React hooks (calendar store, toast, mobile detection)
    lib/          # Utilities (hijri-utils, pdf-export, excel-export, db)
    pages/        # Route pages (home, settings, export, backup)
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Data persistence layer
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
- **PostgreSQL**: Configured but not actively required (uses memory storage by default)
- **IndexedDB**: Client-side persistent storage via `idb` library

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