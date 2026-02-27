# replit.md

## Overview

Filhos is a mobile-first web application for parents to track their children's growth, health, vaccinations, and memories. Built with a React frontend and Express backend, it provides a comprehensive parenting companion with features like growth charts, vaccine schedules (aligned with Brazilian SUS standards), health records, milestone tracking, and a digital diary. The app supports multiple children with personalized themes and includes a gamification system to encourage consistent tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for local state (child selection)
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (supports neutral, pink, and blue themes per child)
- **Animations**: Framer Motion for smooth mobile-like transitions
- **Charts**: Recharts for growth visualization
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for request/response validation
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions and relations

### Build System
- **Development**: Vite with HMR for the React frontend, tsx for running the Express server
- **Production**: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Data Model
Core entities include:
- **Users**: Parent/caregiver accounts
- **Children**: Child profiles with birth date, gender, theme preferences
- **Caregivers**: Many-to-many relationship between users and children with roles
- **GrowthRecords**: Weight, height, head circumference tracking over time
- **Vaccines/VaccineRecords**: Custom vaccines and SUS-standard vaccine tracking
- **HealthRecords**: Illness tracking with symptoms and medications
- **Milestones/DiaryEntries**: Memory keeping features
- **Gamification**: Points and levels to encourage engagement

### API Structure
All API routes are prefixed with `/api/` and organized by resource:
- `/api/auth/*` - User authentication and gamification
- `/api/children/*` - CRUD for child profiles
- `/api/children/:childId/growth` - Growth records (list, create)
- `/api/growth/:id` - Update growth record (PATCH)
- `/api/growth/:id/archive` - Archive growth record (POST) - uses notes field prefix "[ARCHIVED]"
- `/api/children/:childId/vaccines` - Vaccine records
- `/api/children/:childId/health` - Health records
- `/api/children/:childId/milestones` - Milestone tracking (full CRUD)
- `/api/children/:childId/diary` - Diary entries
- `/api/sus-vaccines` - Brazilian SUS vaccine reference data

### Authentication
- **Provider**: Replit Auth (OIDC) - supports Google, GitHub, Apple, email/password login
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Auth Routes**:
  - `/api/login` - Initiates login flow
  - `/api/logout` - Logs out user
  - `/api/auth/user` - Returns current authenticated user
- **User Claims**: sub (unique ID), email, firstName, lastName, profileImageUrl
- **Protected Routes**: All `/api/*` routes except `/api/sus-vaccines` require authentication
- **Frontend**: Landing page for unauthenticated users, useAuth hook for auth state
- **Authorization Pattern**: 
  - All child-scoped list/create routes verify `hasChildAccess(userId, childId)` via caregivers table
  - Update/delete routes that receive record IDs fetch record first, then verify child ownership
  - Helper methods: `getGrowthRecordById`, `getVaccineById`, `getHealthRecordById`, `getMilestoneById`, `getVaccineRecordById`
- **Cookie Security**: `secure` flag is conditional on `NODE_ENV === 'production'` for dev compatibility

### Recent Changes (Jan 2026)
- **Replit Auth Integration**: Added real user authentication via Replit OIDC. Users table now uses varchar ID (OIDC sub claim), caregivers table updated to reference string user IDs. Landing page shows when not logged in.
- **Growth Records CRUD**: Added UPDATE (edit existing) and ARCHIVE (soft delete) functionality
- **Gamification Cache**: Points now update dynamically when navigating between pages
- **Archive Pattern**: Uses notes field prefix "[ARCHIVED]" to hide records without adding database fields
- **Child-specific Gamification**: Points and levels are now tracked per child instead of per user
- **Initial Growth Record**: When creating a new child, initial measurements (weight, height, head circumference) are automatically saved as the first growth record with the birth date
- **PhotoView Component**: Instagram-style fullscreen photo viewer using Radix Dialog + Framer Motion with accessibility fixes (DialogTitle via VisuallyHidden)
- **Dynamic Home Page Text**: Daily rotating emotional messages, contextual encouragement based on recent activity (growth + vaccines) and level progress, subtle micro-invites below quick actions
- **Foto do Dia Feature**: Daily photo habit feature allowing one photo per day per child. Includes Home card with status indicator, chronological gallery with swipe navigation, streak counter, and gamification integration (5 points per photo). Database enforces one-photo-per-day constraint with unique index.

### Recent Changes (Feb 2026)
- **Push Notifications for Vaccines**: Web Push API integration for vaccine reminders. Uses VAPID keys (env vars), `push_subscriptions` table, service worker push handler, and a server-side scheduler that checks daily at 9 AM BRT. Sends reminders for due, upcoming (within 1 month), and overdue (up to 2 months) vaccines. Frontend toggle in Settings with test notification button. Hook: `use-push-notifications.ts`. Backend: `server/vaccineNotifications.ts`.
- **TWA Asset Links**: Added `.well-known/assetlinks.json` for Google Play TWA verification.
- **Data Deletion Page**: Server-rendered HTML for Google Play bot crawlers at `/delete-account`.

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema defined in `shared/schema.ts`
- **connect-pg-simple**: Session storage in PostgreSQL for Replit Auth sessions

### UI Libraries
- **Radix UI**: Full suite of accessible, unstyled primitives (dialogs, dropdowns, tabs, etc.)
- **Shadcn/ui**: Pre-styled components using Radix + Tailwind (new-york style variant)
- **Lucide React**: Icon library

### Key NPM Packages
- **date-fns**: Date formatting with Portuguese (Brazil) locale support
- **recharts**: Charting library for growth visualization
- **framer-motion**: Animation library
- **zod**: Schema validation for API contracts
- **drizzle-zod**: Automatic Zod schema generation from Drizzle tables
- **web-push**: Web Push API server-side library for sending push notifications via VAPID

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TypeScript**: Full type coverage across client, server, and shared code

### Fonts (Google Fonts)
- DM Sans: Body text
- Outfit: Headings/display
- Architects Daughter: Playful accents
- Fira Code/Geist Mono: Code display