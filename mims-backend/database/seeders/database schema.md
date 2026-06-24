# 8.3 Database Schema

## Overview

The Mzuzu Inmate Management System (MIMS) database contains 32 project tables organized into seven functional domains. The following section presents each table in SQL-style documentation format, matching the requested structure. Laravel's internal `migrations` table is intentionally excluded.

---

## 3.3 Authentication and Authorization Tables

### 3.3.1 Users Table

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    role_id BIGINT UNSIGNED NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    is_eligible_for_duty BOOLEAN NOT NULL DEFAULT FALSE,
    duty_preferences JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.3.2 Roles Table

```sql
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.3.3 Personal Access Tokens Table

```sql
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT UNSIGNED NOT NULL,
    name TEXT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX personal_access_tokens_tokenable_type_tokenable_id_index (tokenable_type, tokenable_id),
    INDEX personal_access_tokens_expires_at_index (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.3.4 Password Reset Tokens Table

```sql
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.3.5 Sessions Table

```sql
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload LONGTEXT NOT NULL,
    last_activity INTEGER NOT NULL,
    INDEX sessions_user_id_index (user_id),
    INDEX sessions_last_activity_index (last_activity),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3.4 Inmate Management Tables

### 3.4.1 Inmates Table

```sql
CREATE TABLE inmates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prison_number VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    other_names VARCHAR(100) NULL,
    date_of_birth DATE NOT NULL,
    is_young_offender BOOLEAN NOT NULL DEFAULT FALSE,
    place_of_birth VARCHAR(100) NULL,
    nationality VARCHAR(50) DEFAULT 'Malawian',
    national_id VARCHAR(20) NULL UNIQUE,
    marital_status VARCHAR(20) NULL,
    next_of_kin_name VARCHAR(100) NULL,
    next_of_kin_contact VARCHAR(50) NULL,
    personal_belongings TEXT NULL,
    photo_path VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_release_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (status IN ('active', 'released', 'deceased', 'transferred'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.4.2 Admissions Table

```sql
CREATE TABLE admissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    admission_date DATE NOT NULL,
    admission_type VARCHAR(20) NOT NULL,
    inmate_type VARCHAR(50) NOT NULL,
    case_number VARCHAR(50) NOT NULL,
    court_name VARCHAR(100) NULL,
    offence_description TEXT NULL,
    sentence_years INTEGER NULL,
    sentence_months INTEGER NULL,
    sentence_start_date DATE NULL,
    projected_release_date DATE NULL,
    original_release_date DATE NULL,
    remand_next_court_date DATE NULL,
    committal_warrant_path VARCHAR(255) NULL,
    remand_warrant_path VARCHAR(255) NULL,
    admitted_by BIGINT UNSIGNED NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    released_at DATE NULL,
    release_reason VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX admissions_projected_release_date_index (projected_release_date),
    INDEX admissions_inmate_is_current_index (inmate_id, is_current),
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE RESTRICT,
    FOREIGN KEY (admitted_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (admission_type IN ('first_time', 'repeat')),
    CHECK (inmate_type IN ('convict', 'remandee', 'murder_remandee'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.4.3 Cells Table

```sql
CREATE TABLE cells (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cell_number VARCHAR(20) NOT NULL UNIQUE,
    block VARCHAR(10) NOT NULL,
    security_classification VARCHAR(20) NOT NULL,
    capacity INTEGER UNSIGNED NOT NULL,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX cells_security_status_index (security_classification, status),
    CHECK (security_classification IN ('maximum', 'medium', 'minimum')),
    CHECK (status IN ('available', 'full', 'maintenance'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.4.4 Cell Allocations Table

```sql
CREATE TABLE cell_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    admission_id BIGINT UNSIGNED NOT NULL,
    cell_id BIGINT UNSIGNED NOT NULL,
    allocated_date DATE NOT NULL,
    deallocated_date DATE NULL,
    reason VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX cell_allocations_inmate_admission_index (inmate_id, admission_id),
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE CASCADE,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.4.5 Documents Table

```sql
CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    admission_id BIGINT UNSIGNED NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX documents_inmate_document_type_index (inmate_id, document_type),
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE CASCADE,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3.5 Activity Management Tables

### 3.5.1 Activities Table

```sql
CREATE TABLE activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    activity_type VARCHAR(50) NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    eligibility_criteria JSON NULL,
    max_participants INTEGER NULL,
    source_type VARCHAR(20) NOT NULL DEFAULT 'predefined',
    security_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    modified_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES activity_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (source_type IN ('predefined', 'custom')),
    CHECK (security_level IN ('low', 'medium', 'high'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5.2 Activity Categories Table

```sql
CREATE TABLE activity_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5.3 External Activity Details Table

```sql
CREATE TABLE external_activity_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activity_id BIGINT UNSIGNED NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    external_partner VARCHAR(255) NULL,
    requires_transport BOOLEAN NOT NULL DEFAULT FALSE,
    transport_details TEXT NULL,
    safety_requirements TEXT NULL,
    supervisor_requirements TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5.4 Inmate Activities Table

```sql
CREATE TABLE inmate_activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    admission_id BIGINT UNSIGNED NOT NULL,
    activity_id BIGINT UNSIGNED NOT NULL,
    assigned_date DATE NOT NULL,
    end_date DATE NULL,
    assigned_by BIGINT UNSIGNED NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX inmate_activities_inmate_admission_index (inmate_id, admission_id),
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE CASCADE,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5.5 Activity Sessions Table

```sql
CREATE TABLE activity_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activity_id BIGINT UNSIGNED NOT NULL,
    session_date DATE NOT NULL,
    session_time VARCHAR(20) NOT NULL,
    supervising_officer_id BIGINT UNSIGNED NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX activity_sessions_activity_id_index (activity_id),
    INDEX activity_sessions_session_date_index (session_date),
    INDEX activity_sessions_supervising_officer_id_index (supervising_officer_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE RESTRICT,
    FOREIGN KEY (supervising_officer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5.6 Session Attendance Table

```sql
CREATE TABLE session_attendance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    inmate_id BIGINT UNSIGNED NOT NULL,
    admission_id BIGINT UNSIGNED NOT NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'present',
    notes TEXT NULL,
    recorded_by BIGINT UNSIGNED NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY session_attendance_session_inmate_unique (session_id, inmate_id),
    INDEX session_attendance_inmate_id_index (inmate_id),
    INDEX session_attendance_admission_id_index (admission_id),
    FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE RESTRICT,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (attendance_status IN ('present', 'absent', 'late', 'excused'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5.7 Activity Assignment Logs Table

```sql
CREATE TABLE activity_assignment_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_activity_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NOT NULL,
    assignment_reason VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX activity_assignment_logs_inmate_activity_id_index (inmate_activity_id),
    FOREIGN KEY (inmate_activity_id) REFERENCES inmate_activities(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3.6 Duty Management Tables

### 3.6.1 Officer Duty Rosters Table

```sql
CREATE TABLE officer_duty_rosters (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    officer_id BIGINT UNSIGNED NOT NULL,
    duty_week_start DATE NOT NULL,
    duty_week_end DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY officer_duty_rosters_officer_week_shift_unique (officer_id, duty_week_start, shift_type),
    INDEX officer_duty_rosters_officer_week_index (officer_id, duty_week_start),
    FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (shift_type IN ('full_day')),
    CHECK (duty_week_end >= duty_week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3.7 Release Management Tables

### 3.7.1 Sentence Adjustments Table

```sql
CREATE TABLE sentence_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admission_id BIGINT UNSIGNED NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL,
    adjustment_days INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT NULL,
    approved_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX sentence_adjustments_admission_id_index (admission_id),
    INDEX sentence_adjustments_effective_date_index (effective_date),
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.7.2 Release Workflow Table

```sql
CREATE TABLE release_workflow (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admission_id BIGINT UNSIGNED NOT NULL,
    approved_by BIGINT UNSIGNED NOT NULL,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_notes TEXT NULL,
    confirmed_by BIGINT UNSIGNED NULL,
    confirmed_at TIMESTAMP NULL,
    confirmation_notes TEXT NULL,
    cancelled_by BIGINT UNSIGNED NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX release_workflow_admission_id_index (admission_id),
    INDEX release_workflow_status_index (status),
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (status IN ('approved', 'confirmed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3.8 Visitor Management Tables

### 3.8.1 Visitors Table

```sql
CREATE TABLE visitors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    national_id VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (relationship IN ('family', 'friend', 'legal_representative', 'social_worker', 'charity_representative', 'other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.8.2 Inmate Visitor Registrations Table

```sql
CREATE TABLE inmate_visitor_registrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    visitor_id BIGINT UNSIGNED NOT NULL,
    registered_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE CASCADE,
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.8.3 Visitation Sessions Table

```sql
CREATE TABLE visitation_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    visitor_id BIGINT UNSIGNED NOT NULL,
    admission_id BIGINT UNSIGNED NOT NULL,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    duration_minutes INTEGER NULL,
    location VARCHAR(100) NULL,
    supervising_officer_id BIGINT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    visit_purpose VARCHAR(255) NULL,
    notes TEXT NULL,
    checked_in_at TIMESTAMP NULL,
    checked_out_at TIMESTAMP NULL,
    is_charity_visit BOOLEAN NOT NULL DEFAULT FALSE,
    charity_organization VARCHAR(255) NULL,
    charity_purpose TEXT NULL,
    pdf_file_path VARCHAR(255) NULL,
    pdf_generated_at TIMESTAMP NULL,
    pdf_created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX visitation_sessions_inmate_visit_date_index (inmate_id, visit_date),
    INDEX visitation_sessions_visitor_id_index (visitor_id),
    INDEX visitation_sessions_supervising_officer_id_index (supervising_officer_id),
    INDEX visitation_sessions_status_index (status),
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE CASCADE,
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (supervising_officer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (pdf_created_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.8.4 Visitation Rules Table

```sql
CREATE TABLE visitation_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inmate_id BIGINT UNSIGNED NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (inmate_id) REFERENCES inmates(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (rule_type IN ('restricted_visitors', 'contact_only', 'supervised_only', 'no_visitation'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.8.5 Visitation Denials Table

```sql
CREATE TABLE visitation_denials (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitation_session_id BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(255) NOT NULL,
    denied_by BIGINT UNSIGNED NOT NULL,
    denial_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (visitation_session_id) REFERENCES visitation_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (denied_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.8.6 Visitation Items Table

```sql
CREATE TABLE visitation_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitation_session_id BIGINT UNSIGNED NOT NULL,
    item_description TEXT NOT NULL,
    item_category VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    inspected_by BIGINT UNSIGNED NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    inspection_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (visitation_session_id) REFERENCES visitation_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (item_category IN ('food', 'clothing', 'reading_material', 'toiletries', 'documents', 'other')),
    CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3.9 System Infrastructure Tables

### 3.9.1 Cache Table

```sql
CREATE TABLE cache (
    `key` VARCHAR(255) PRIMARY KEY,
    value MEDIUMTEXT NOT NULL,
    expiration INTEGER NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.9.2 Cache Locks Table

```sql
CREATE TABLE cache_locks (
    `key` VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255) NOT NULL,
    expiration INTEGER NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.9.3 Jobs Table

```sql
CREATE TABLE jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload LONGTEXT NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL,
    reserved_at INTEGER UNSIGNED NULL,
    available_at INTEGER UNSIGNED NOT NULL,
    created_at INTEGER UNSIGNED NOT NULL,
    INDEX jobs_queue_index (queue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.9.4 Job Batches Table

```sql
CREATE TABLE job_batches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_jobs INTEGER NOT NULL,
    pending_jobs INTEGER NOT NULL,
    failed_jobs INTEGER NOT NULL,
    failed_job_ids LONGTEXT NOT NULL,
    options MEDIUMTEXT NULL,
    cancelled_at INTEGER NULL,
    created_at INTEGER NOT NULL,
    finished_at INTEGER NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.9.5 Failed Jobs Table

```sql
CREATE TABLE failed_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(255) NOT NULL UNIQUE,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload LONGTEXT NOT NULL,
    exception LONGTEXT NOT NULL,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.9.6 Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id BIGINT UNSIGNED NULL,
    old_data JSON NULL,
    new_data JSON NULL,
    ip_address VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX audit_logs_user_created_at_index (user_id, created_at),
    INDEX audit_logs_table_name_index (table_name),
    INDEX audit_logs_record_id_index (record_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Supporting Database Objects

### Views

The system also defines reporting and operational views for population statistics, duty rosters, activity assignments, attendance summaries, release eligibility, release workflows, sentence adjustments, visitation statistics, active visit schedules, and charity visit approvals.

```sql
CREATE VIEW population_statistics AS ...;
CREATE VIEW current_duty_roster AS ...;
CREATE VIEW active_inmate_activities AS ...;
CREATE VIEW session_attendance_summary AS ...;
CREATE VIEW inmates_due_for_release AS ...;
CREATE VIEW pending_gatekeeper_releases AS ...;
CREATE VIEW release_history AS ...;
CREATE VIEW sentence_adjustment_summary AS ...;
CREATE VIEW visitation_statistics AS ...;
CREATE VIEW active_visitation_schedule AS ...;
CREATE VIEW pending_charity_approvals AS ...;
```

### Triggers and Conditional Indexes

Release-related triggers recalculate projected release dates, finalize confirmed releases, prevent double confirmation, and verify gatekeeper confirmation. Conditional unique indexes enforce one current admission, one active cell allocation, and one active activity assignment per inmate/admission where supported by the database driver.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total project tables | 32 |
| Authentication and Authorization tables | 5 |
| Inmate Management tables | 5 |
| Activity Management tables | 7 |
| Duty Management tables | 1 |
| Release Management tables | 2 |
| Visitor Management tables | 6 |
| System Infrastructure tables | 6 |
| Internal Laravel migrations table | Excluded |

---

**Document Version:** 1.0  
**Last Updated:** May 2026  
**Database Schema Version:** 3.2.0  
**Compatibility:** PostgreSQL 13+, SQLite 3.35+, MySQL 8.0+
