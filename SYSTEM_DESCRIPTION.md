# Mzuzu Inmate Management System (MIMS) - System Description

## Overview and Purpose

MIMS is a third-year ICT degree project designed as a comprehensive web application for managing prison inmate operations in Malawi. It's built to streamline administrative tasks for prison staff with different roles, including inmate admissions and record management, cell allocation and occupancy tracking, user management with role-based access control, activity tracking and scheduling, document management for warrants and legal records, and audit logging for compliance.

## Architecture

The system follows a modern, layered, full-stack architecture:

```
┌─────────────────────────────────────────────┐
│     Frontend (React 19 + Vite)              │
│     (Port 5173 - Development)               │
└──────────────┬──────────────────────────────┘
               │ JSON/REST + Bearer Tokens
┌──────────────▼──────────────────────────────┐
│  API Layer (Laravel Routes)                 │
│  /api/login, /api/register, /api/admin/... │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Business Logic Layer                       │
│  - Controllers (HTTP handlers)              │
│  - Services (domain logic)                  │
│  - Actions (reusable operations)            │
│  - Repositories (data access)               │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Data Access Layer (Eloquent ORM)           │
│  Models with relationships                  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Database Layer (PostgreSQL / SQLite)       │
│  Migrations define schema                   │
└─────────────────────────────────────────────┘
```

**High-Performance Server:** Laravel Octane with FrankenPHP (recommended), RoadRunner, or Swoole for up to 10x faster request handling.

## Key Components and Modules

### Backend Structure

**Core Controllers:**
- AuthController - Login, logout, registration
- UserController - User profiles, password changes
- AdminUserController - User management, statistics, bulk operations
- AuditLogController - System audit trails
- StatisticsController - Population statistics

**Admissions Module** (`app/Modules/Admissions/`) - Highly modular feature:
- InmateController - Inmate CRUD, duplicate checking, search
- AdmissionController - Admission tracking
- CellController - Cell availability and allocation
- ActivityController - Inmate activities
- DocumentController - Warrant and legal documents

**Additional Modules:**
- Release
- Visitation
- ActivityAllocation

### Frontend Modules

- **admin** - Dashboard, user management, statistics
- **admissions** - Inmate intake with multi-step form
- **auth** - Login/logout flows
- **home** - Main dashboard
- **user** - Profile management

## Database Schema and Relationships

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| users | System staff accounts | id, name, email, password, role_id, is_active, last_login |
| roles | Staff role definitions | id, name (admin, reception_officer, station_officer, officer_on_duty, gatekeeper) |
| inmates | Inmate Records | prison_number, first_name, last_name, date_of_birth, national_id, marital_status, is_young_offender, photo_path |
| admissions | Admission records | inmate_id, admission_date, admission_type, inmate_type, case_number, sentence_years, sentence_months, projected_release_date, is_current |
| cells | Prison cells | cell_number, block, security_classification, capacity, current_occupancy, status |
| cell_allocations | Inmate-to-cell assignments | inmate_id, cell_id, admission_id, allocation_date, de_allocation_date |
| activities | Prison programs | name, activity_type, eligibility_criteria, max_participants, is_active |
| inmate_activities | Program enrollments | inmate_id, activity_id, enrollment_date, completion_date |
| documents | Legal documents | admission_id, document_type, file_path, uploaded_by |
| audit_logs | System audit trail | user_id, action, model, changes |
| personal_access_tokens | API authentication (Sanctum) | user_id, token, abilities, expires_at |

### Key Relationships

```
Inmate
  ├─> hasMany: Admissions (1-to-many)
  ├─> hasOne: CurrentAdmission (latest active)
  ├─> hasMany: CellAllocations
  ├─> hasMany: InmateActivities
  └─> hasMany: Documents

Admission
  ├─> belongsTo: Inmate
  ├─> belongsTo: User (admitted_by)
  ├─> hasMany: CellAllocations
  └─> hasMany: InmateActivities

Cell
  └─> hasMany: CellAllocations

Activity
  └─> hasMany: InmateActivities
```

## API Structure and Endpoints

**Base URL:** `http://localhost:8000/api`

**Authentication:** Token-based (Bearer tokens via Laravel Sanctum)

### Public Endpoints
- `POST /login` - Authentication

### Protected User Endpoints
- `GET /user` or `/user/profile` - Current logged-in user
- `GET /user/{userId}` - User profile by ID (own profile only)
- `PUT /user/profile` - Update profile
- `POST /user/change-password` - Change password
- `POST /logout` - Logout

### Admin Endpoints (role:admin)
- `GET /admin/users` - List users with pagination, search, filtering, sorting
- `GET /admin/users/statistics` - User distribution by role
- `POST /admin/users` - Create user
- `GET /admin/users/{userId}` - Get user details
- `PUT /admin/users/{userId}` - Update user including role
- `DELETE /admin/users/{userId}` - Delete user
- `POST /admin/users/bulk-delete` - Delete multiple users
- `POST /admin/users/bulk-update-role` - Bulk role updates

### Inmate/Admissions Endpoints (reception_officer, station_officer)
- `GET /inmates` - List inmates (with pagination)
- `POST /inmates` - Create new inmate (reception_officer only)
- `GET /inmates/{inmate}` - View inmate details
- `GET /inmates/search` - Search inmates
- `POST /inmates/check-duplicate` - Prevent duplicate entries

### Admission Endpoints (reception_officer)
- `POST /admissions` - Create admission record
- `GET /admissions/{admission}` - View admission details

### Cell Management
- `GET /cells/available` - Get available cells

### Activities
- `GET /activities` - List prison activities

### Documents
- `POST /documents` - Upload legal documents

### Statistics
- `GET /statistics/population` - Population statistics

### Audit Logs
- `GET /audit-logs` - System audit trail (admin only)

## Frontend Structure and Key Features

**Technology Stack:**
- React 19.2.0 with Vite 7.3.1
- Redux Toolkit for state management
- React Router DOM v7 for client-side routing
- React Hook Form + Zod for form validation
- Axios for HTTP requests with custom interceptors
- Tailwind CSS 3.4.19 with Malawi national colors
- React Icons (Material Design)
- Storybook for component documentation
- Vitest + Playwright for testing

**UI Design System:**
- **Malawi National Colors:** Black (#000000), Red (#D71920), Gold (#FFD700), Green (#00843D)
- **Components:** Sidebar navigation, ProtectedRoute wrapper, Toast notifications, reusable UI components
- **Architecture:** Module-based with services, schemas, components per feature

**Key Pages:**
- **Admin Dashboard** - User management, statistics, audit logs
- **Admissions Form** - Multi-step inmate intake with form validation
- **Inmate List** - Search, filter, view inmate records
- **User Profile** - View/edit personal information
- **Authentication** - Login with persistent token in localStorage

## Authentication and Security

**Authentication Method:** Token-based API authentication with Laravel Sanctum

**User Roles & Permissions:**
1. **Admin** - Full system access: user management, statistics, audit logs
2. **Reception Officer** - Inmate admissions, cell management, document uploads
3. **Station Officer** - View inmates, limited management
4. **Officer on Duty** - Basic operational access
5. **Gatekeeper** - Entry/exit logging

**Middleware & Protection:**
- `auth:sanctum` - Protects all authenticated routes
- `role:admin|reception_officer` - Restricts endpoints by role
- Rate limiting per endpoint with throttle middleware
- Custom `RoleMiddleware` for authorization

**Rate Limiting Configuration:**
- Login: 5 requests/minute
- Registration: 3 requests/minute
- Password change: 3 requests/5 minutes
- User profile: 30 requests/minute
- Admin operations: 100 requests/minute
- Lockout after 10 failed attempts for 15 minutes

**Security Features:**
- Password hashing (Laravel's built-in)
- Email uniqueness validation
- CORS protection
- Request validation with form requests
- Audit logging for compliance

## Deployment and Setup Instructions

**Quick Setup (One Command):**
```bash
cd mims-backend
composer setup
```

**Key Environment Variables:**
```env
APP_ENV=local
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_DATABASE=mims_db
OCTANE_SERVER=frankenphp
OCTANE_PORT=8000
```

**Database:**
- **Production/Development:** PostgreSQL 12+
- **Testing:** SQLite (in-memory for speed)

**Running Application:**
```bash
# Terminal 1 - Backend
cd mims-backend
php artisan serve  # or: php artisan octane:start

# Terminal 2 - Frontend
cd MIMS-FRONTEND
npm run dev
```

**Access:** `http://localhost:5173`

**Testing:**
```bash
# Backend tests
cd mims-backend
composer test

# Frontend tests
cd MIMS-FRONTEND
npm run test
npm run storybook  # Component documentation
```

## Notable Patterns and Technologies

**Backend Patterns:**
- **Modular Architecture** - Admissions module as self-contained feature with own controllers, models, services, repositories
- **Repository Pattern** - Abstraction for data access
- **Action Pattern** - Reusable domain operations
- **Data Transfer Objects (DTOs)** - Type-safe data passing
- **Service Layer** - Business logic encapsulation
- **Eloquent ORM** - Active Record pattern for database access
- **Sanctum Authentication** - Secure API token management
- **Rate Limiting** - IP and user-based throttling with customizable windows
- **Comprehensive Migrations** - Database versioning and rollback capability

**Frontend Patterns:**
- **Component-Driven Development** - Reusable UI components in Storybook
- **Context API + Redux** - Hybrid state management (AuthContext + Redux Toolkit)
- **Protected Routes** - Role-based route guards
- **Service Layer** - Centralized API client with Axios interceptors
- **Zod Validation** - End-to-end type-safe form validation
- **Custom Hooks** - `useAuth()` for authentication logic
- **Module Structure** - Feature-based folder organization

**Cross-Cutting Concerns:**
- Error handling with normalized API error utilities
- Toast notifications for user feedback
- Audit logging on backend
- Comprehensive documentation (API, setup guides, rate limiting)

**Performance Optimizations:**
- Laravel Octane for high-concurrency request handling
- Database query optimization with eager loading
- Frontend code splitting via Vite
- Tailwind CSS purging for minimal CSS
- Rate limiting to prevent abuse

**Development Experience:**
- Concurrent development with `composer dev` command
- Storybook for component documentation and testing
- PHPUnit for backend testing
- Vitest/Playwright for frontend testing
- ESLint for code quality
- Laravel Pint for PHP code style

---

This system represents a production-ready inmate management platform with modern architecture, comprehensive security, and scalable design suitable for educational purposes and real-world deployment in correctional facilities.