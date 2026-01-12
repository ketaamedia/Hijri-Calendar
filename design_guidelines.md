# Design Guidelines - تطبيق الرزنامة الهجرية والميلادية

## Design Approach

**Selected Approach:** Design System (Material Design) with Google Calendar Pattern Inspiration

**Justification:** Calendar applications require clarity, data density management, and proven interaction patterns. Material Design provides excellent RTL support and established calendar UI components. Google Calendar serves as the reference for intuitive date navigation and event management.

**Core Principles:**
- Information clarity over visual flair
- Consistent, predictable interactions
- Efficient data density management
- Professional, formal aesthetic suitable for religious/institutional use

## Typography System

### Font Selection
- **Primary Font:** Noto Kufi Arabic (via Google Fonts CDN) - modern, highly legible Arabic sans-serif
- **Secondary Font:** Noto Sans Arabic (for body text) - optimal reading experience

### Hierarchy
- **Page Headers (H1):** 2rem (32px), font-weight: 700
- **Section Headers (H2):** 1.5rem (24px), font-weight: 600
- **Card/Component Headers (H3):** 1.125rem (18px), font-weight: 600
- **Body Text:** 1rem (16px), font-weight: 400
- **Small Text/Captions:** 0.875rem (14px), font-weight: 400
- **Date Numbers (Calendar Cells):** 1.25rem (20px), font-weight: 500
- **Event Titles:** 0.9375rem (15px), font-weight: 500

**Line Height:** 1.6 for body, 1.3 for headings

## Layout System

### Spacing Primitives
**Tailwind units:** 2, 4, 6, 8, 12, 16, 24
- Micro spacing: p-2, gap-2
- Standard spacing: p-4, gap-4, m-6
- Component spacing: p-6, p-8, gap-8
- Section spacing: p-12, py-16, py-24

### Grid Structure
- **Sidebar Navigation:** Fixed width 280px (w-70)
- **Main Calendar Area:** Flexible flex-1
- **Event Panel (optional):** 320px collapsible sidebar

### Responsive Breakpoints
- Mobile: Single column, collapsible navigation drawer
- Tablet (md:): Sidebar + Calendar
- Desktop (lg:): Sidebar + Calendar + Event Panel

## Component Library

### Navigation (Sidebar)
**Structure:**
- Logo/App name at top (p-6)
- Month/Year selector with chevrons
- View switcher (شهري، أسبوعي، سنوي) - vertical button group
- "مناسبة جديدة" primary action button (w-full)
- Mini calendar navigator
- Secondary links (الإعدادات، تصدير PDF) at bottom

**Spacing:** Internal padding p-4, gap-3 between items

### Calendar Grid (Monthly View)
**Structure:**
- Header row: Day names (7 columns)
- 5-6 rows for dates
- Each cell: 
  - Gregorian date (larger, primary)
  - Hijri date (smaller, secondary, below)
  - Event indicators (colored dots, max 3 visible)

**Cell Dimensions:** 
- Desktop: min-h-32, aspect-square
- Tablet: min-h-24
- Mobile: min-h-20

**Grid Gap:** gap-1

### Event Cards
**Structure:**
- Vertical accent bar (right side for RTL)
- Title (font-weight: 600)
- Date display (both calendars)
- Description (truncated, 2 lines max)
- Action buttons (تعديل، حذف) on hover

**Spacing:** p-4, gap-2 internal

### Modal Dialogs (Add/Edit Event)
**Structure:**
- Header with title + close button
- Form fields with proper labels
- Calendar type toggle (ميلادي/هجري)
- Date picker integrated
- Checkbox for annual recurrence
- Action buttons (حفظ، إلغاء) at bottom

**Width:** max-w-2xl, centered

### Settings Panel
**Structure:**
- Section groups with dividers
- Toggle switches for calendar enable/disable
- Dropdown for Hijri calculation method
- Manual month adjustment table:
  - Month name | Current start date | Edit button
  - Grid layout: 3 columns (Month, Date, Action)

**Spacing:** space-y-6 between sections

### PDF Export Modal
**Structure:**
- Date range selector (من - إلى)
- Calendar display options (3 radio buttons)
- Export format settings
- Preview thumbnail (optional)
- Export button (primary, full-width)

### Top Bar (Main View)
**Structure:**
- Current view title (right for RTL)
- Navigation arrows (month/week/year)
- Today button
- View toggle (if not in sidebar)
- Settings icon (left for RTL)

**Height:** h-16, shadow-sm

## Data Display Patterns

### Dual Calendar Display
**Primary Pattern:** Stack vertically within cells
- Gregorian on top (larger)
- Hijri below (smaller, muted)
- 4px gap between

**Alternative (List View):** Side-by-side with separator
- "15 يناير 2025 | 15 جمادى الآخرة 1446"

### Event Density Management
**Calendar Cell:**
- 0 events: Empty cell
- 1-3 events: Show as dots (h-2 w-2, rounded-full)
- 4+ events: Show "+2 أخرى" text

**Event List:**
- Group by date
- Chronological order
- Expandable sections

## Form Components

### Input Fields
- **Text Inputs:** Border-2, rounded-lg, p-3, focus ring
- **Labels:** Above input, text-sm, font-medium, mb-2
- **Error States:** Border-red, helper text below

### Date Pickers
- Integrated calendar popup
- Toggle between Gregorian/Hijri
- Clear visual indication of selected date
- Today button

### Buttons
**Primary:** Full rounded-lg, px-6, py-3, font-medium, shadow-sm
**Secondary:** Border-2, rounded-lg, px-6, py-3
**Icon Buttons:** p-2, rounded-md, hover state

### Toggles & Checkboxes
Material Design style switches
- Labels on right (RTL)
- Clear on/off states

## RTL Considerations

- All layouts mirror horizontally
- Text alignment: right by default
- Icons position: flipped appropriately
- Navigation: right-to-left flow
- Calendars: Week starts Sunday (right side)

## Accessibility

- Minimum touch target: 44px
- Focus indicators on all interactive elements
- ARIA labels in Arabic
- Keyboard navigation support
- Clear contrast ratios (will be ensured with color implementation)

## Images

**No hero images required** - This is a utility application where information clarity takes precedence. Focus remains on the calendar interface and data presentation.