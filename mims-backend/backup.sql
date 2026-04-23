--
-- PostgreSQL database dump
--

\restrict Kk4NARZ2RVYtPVoqgkRi9GC04K9wPFCF38F2kE9bEDvAw5gAcHgTePTwKrl5ehK

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: prison_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO prison_user;

--
-- Name: testing; Type: SCHEMA; Schema: -; Owner: prison_user
--

CREATE SCHEMA testing;


ALTER SCHEMA testing OWNER TO prison_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.activities (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    activity_type character varying(50) NOT NULL,
    eligibility_criteria json,
    max_participants integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    category_id bigint,
    source_type character varying(20) DEFAULT 'predefined'::character varying NOT NULL,
    security_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_by bigint,
    modified_by bigint,
    CONSTRAINT activities_security_level_check CHECK (((security_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT activities_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['predefined'::character varying, 'custom'::character varying])::text[])))
);


ALTER TABLE public.activities OWNER TO prison_user;

--
-- Name: inmate_activities; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.inmate_activities (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint NOT NULL,
    activity_id bigint NOT NULL,
    assigned_date date NOT NULL,
    end_date date,
    assigned_by bigint NOT NULL,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.inmate_activities OWNER TO prison_user;

--
-- Name: inmates; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.inmates (
    id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    prison_number character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    other_names character varying(100),
    date_of_birth date NOT NULL,
    place_of_birth character varying(100),
    nationality character varying(50) DEFAULT 'Malawian'::character varying NOT NULL,
    national_id character varying(20),
    marital_status character varying(20),
    next_of_kin_name character varying(100),
    next_of_kin_contact character varying(50),
    photo_path character varying(255),
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    is_young_offender boolean DEFAULT false NOT NULL,
    personal_belongings text,
    CONSTRAINT inmates_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'released'::character varying, 'deceased'::character varying, 'transferred'::character varying])::text[])))
);


ALTER TABLE public.inmates OWNER TO prison_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    role character varying(255) DEFAULT 'reception_officer'::character varying NOT NULL,
    role_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp(0) without time zone,
    is_eligible_for_duty boolean DEFAULT false NOT NULL,
    duty_preferences json
);


ALTER TABLE public.users OWNER TO prison_user;

--
-- Name: active_inmate_activities; Type: VIEW; Schema: public; Owner: prison_user
--

CREATE VIEW public.active_inmate_activities AS
 SELECT ia.id,
    i.id AS inmate_id,
    i.first_name,
    i.last_name,
    i.prison_number,
    a.id AS activity_id,
    a.name AS activity_name,
    a.activity_type,
    a.security_level,
    ia.assigned_date,
    u.name AS assigned_by_name
   FROM (((public.inmate_activities ia
     JOIN public.inmates i ON ((i.id = ia.inmate_id)))
     JOIN public.activities a ON ((a.id = ia.activity_id)))
     JOIN public.users u ON ((u.id = ia.assigned_by)))
  WHERE (ia.end_date IS NULL);


ALTER VIEW public.active_inmate_activities OWNER TO prison_user;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO prison_user;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_assignment_logs; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.activity_assignment_logs (
    id bigint NOT NULL,
    inmate_activity_id bigint NOT NULL,
    assigned_by bigint NOT NULL,
    assignment_reason character varying(255),
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.activity_assignment_logs OWNER TO prison_user;

--
-- Name: activity_assignment_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.activity_assignment_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_assignment_logs_id_seq OWNER TO prison_user;

--
-- Name: activity_assignment_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.activity_assignment_logs_id_seq OWNED BY public.activity_assignment_logs.id;


--
-- Name: activity_categories; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.activity_categories (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.activity_categories OWNER TO prison_user;

--
-- Name: activity_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.activity_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_categories_id_seq OWNER TO prison_user;

--
-- Name: activity_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.activity_categories_id_seq OWNED BY public.activity_categories.id;


--
-- Name: activity_sessions; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.activity_sessions (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    session_date date NOT NULL,
    session_time character varying(20) NOT NULL,
    supervising_officer_id bigint NOT NULL,
    start_time time(0) without time zone,
    end_time time(0) without time zone,
    status character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    notes text,
    created_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT activity_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.activity_sessions OWNER TO prison_user;

--
-- Name: activity_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.activity_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_sessions_id_seq OWNER TO prison_user;

--
-- Name: activity_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.activity_sessions_id_seq OWNED BY public.activity_sessions.id;


--
-- Name: admissions; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.admissions (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_date date NOT NULL,
    admission_type character varying(255) NOT NULL,
    inmate_type character varying(255) NOT NULL,
    case_number character varying(50) NOT NULL,
    court_name character varying(100),
    offence_description text,
    sentence_years integer,
    sentence_months integer,
    sentence_start_date date,
    projected_release_date date,
    remand_next_court_date date,
    committal_warrant_path character varying(255),
    remand_warrant_path character varying(255),
    admitted_by bigint NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    released_at date,
    release_reason character varying(50),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT admissions_admission_type_check CHECK (((admission_type)::text = ANY ((ARRAY['first_time'::character varying, 'repeat'::character varying])::text[]))),
    CONSTRAINT admissions_inmate_type_check CHECK (((inmate_type)::text = ANY ((ARRAY['convict'::character varying, 'remandee'::character varying, 'murder_remandee'::character varying])::text[])))
);


ALTER TABLE public.admissions OWNER TO prison_user;

--
-- Name: admissions_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.admissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admissions_id_seq OWNER TO prison_user;

--
-- Name: admissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.admissions_id_seq OWNED BY public.admissions.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    action character varying(50) NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id bigint,
    old_data json,
    new_data json,
    ip_address inet,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.audit_logs OWNER TO prison_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO prison_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache OWNER TO prison_user;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO prison_user;

--
-- Name: cell_allocations; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.cell_allocations (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint NOT NULL,
    cell_id bigint NOT NULL,
    allocated_date date NOT NULL,
    deallocated_date date,
    reason character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.cell_allocations OWNER TO prison_user;

--
-- Name: cell_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.cell_allocations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cell_allocations_id_seq OWNER TO prison_user;

--
-- Name: cell_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.cell_allocations_id_seq OWNED BY public.cell_allocations.id;


--
-- Name: cells; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.cells (
    id bigint NOT NULL,
    cell_number character varying(20) NOT NULL,
    block character varying(10) NOT NULL,
    security_classification character varying(255) NOT NULL,
    capacity integer NOT NULL,
    current_occupancy integer DEFAULT 0 NOT NULL,
    status character varying(255) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT cells_security_classification_check CHECK (((security_classification)::text = ANY ((ARRAY['maximum'::character varying, 'medium'::character varying, 'minimum'::character varying])::text[]))),
    CONSTRAINT cells_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'full'::character varying, 'maintenance'::character varying])::text[])))
);


ALTER TABLE public.cells OWNER TO prison_user;

--
-- Name: cells_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.cells_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cells_id_seq OWNER TO prison_user;

--
-- Name: cells_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.cells_id_seq OWNED BY public.cells.id;


--
-- Name: officer_duty_rosters; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.officer_duty_rosters (
    id bigint NOT NULL,
    officer_id bigint NOT NULL,
    duty_week_start date NOT NULL,
    duty_week_end date NOT NULL,
    shift_type character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT officer_duty_rosters_shift_type_check CHECK (((shift_type)::text = 'full_day'::text)),
    CONSTRAINT officer_duty_rosters_week_range_check CHECK ((duty_week_end >= duty_week_start))
);


ALTER TABLE public.officer_duty_rosters OWNER TO prison_user;

--
-- Name: current_duty_roster; Type: VIEW; Schema: public; Owner: prison_user
--

CREATE VIEW public.current_duty_roster AS
 SELECT odr.id,
    u.id AS officer_id,
    u.name AS officer_name,
    odr.duty_week_start,
    odr.duty_week_end,
    odr.shift_type
   FROM (public.officer_duty_rosters odr
     JOIN public.users u ON ((u.id = odr.officer_id)))
  WHERE ((odr.duty_week_start <= CURRENT_DATE) AND (odr.duty_week_end >= CURRENT_DATE) AND (odr.is_active = true))
  ORDER BY odr.shift_type;


ALTER VIEW public.current_duty_roster OWNER TO prison_user;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint,
    document_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    mime_type character varying(100),
    uploaded_by bigint NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.documents OWNER TO prison_user;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO prison_user;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: external_activity_details; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.external_activity_details (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    location character varying(255) NOT NULL,
    external_partner character varying(255),
    requires_transport boolean DEFAULT false NOT NULL,
    transport_details text,
    safety_requirements text,
    supervisor_requirements text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.external_activity_details OWNER TO prison_user;

--
-- Name: external_activity_details_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.external_activity_details_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_activity_details_id_seq OWNER TO prison_user;

--
-- Name: external_activity_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.external_activity_details_id_seq OWNED BY public.external_activity_details.id;


--
-- Name: inmate_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.inmate_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inmate_activities_id_seq OWNER TO prison_user;

--
-- Name: inmate_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.inmate_activities_id_seq OWNED BY public.inmate_activities.id;


--
-- Name: inmates_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.inmates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inmates_id_seq OWNER TO prison_user;

--
-- Name: inmates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.inmates_id_seq OWNED BY public.inmates.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO prison_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO prison_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: officer_duty_rosters_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.officer_duty_rosters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.officer_duty_rosters_id_seq OWNER TO prison_user;

--
-- Name: officer_duty_rosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.officer_duty_rosters_id_seq OWNED BY public.officer_duty_rosters.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO prison_user;

--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO prison_user;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO prison_user;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: population_statistics; Type: VIEW; Schema: public; Owner: prison_user
--

CREATE VIEW public.population_statistics AS
 SELECT count(DISTINCT i.id) AS total_inmates,
    count(DISTINCT
        CASE
            WHEN (((a.inmate_type)::text = 'convict'::text) AND (a.is_current = true)) THEN i.id
            ELSE NULL::bigint
        END) AS convict_count,
    count(DISTINCT
        CASE
            WHEN (((a.inmate_type)::text = 'remandee'::text) AND (a.is_current = true)) THEN i.id
            ELSE NULL::bigint
        END) AS remandee_count,
    count(DISTINCT
        CASE
            WHEN (((a.inmate_type)::text = 'murder_remandee'::text) AND (a.is_current = true)) THEN i.id
            ELSE NULL::bigint
        END) AS murder_remandee_count,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'active'::text) THEN i.id
            ELSE NULL::bigint
        END) AS active_inmates,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'released'::text) THEN i.id
            ELSE NULL::bigint
        END) AS released_inmates,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'deceased'::text) THEN i.id
            ELSE NULL::bigint
        END) AS deceased_inmates,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'transferred'::text) THEN i.id
            ELSE NULL::bigint
        END) AS transferred_inmates
   FROM (public.inmates i
     LEFT JOIN public.admissions a ON (((i.id = a.inmate_id) AND (a.is_current = true))));


ALTER VIEW public.population_statistics OWNER TO prison_user;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.roles OWNER TO prison_user;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO prison_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: session_attendance; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.session_attendance (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint NOT NULL,
    attendance_status character varying(20) DEFAULT 'present'::character varying NOT NULL,
    notes text,
    recorded_by bigint NOT NULL,
    recorded_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT session_attendance_status_check CHECK (((attendance_status)::text = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'late'::character varying, 'excused'::character varying])::text[])))
);


ALTER TABLE public.session_attendance OWNER TO prison_user;

--
-- Name: session_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.session_attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_attendance_id_seq OWNER TO prison_user;

--
-- Name: session_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.session_attendance_id_seq OWNED BY public.session_attendance.id;


--
-- Name: session_attendance_summary; Type: VIEW; Schema: public; Owner: prison_user
--

CREATE VIEW public.session_attendance_summary AS
 SELECT s.id AS session_id,
    a.name AS activity_name,
    s.session_date,
    s.session_time,
    u.name AS supervising_officer,
    count(sa.id) AS total_recorded,
    count(
        CASE
            WHEN ((sa.attendance_status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END) AS present_count,
    count(
        CASE
            WHEN ((sa.attendance_status)::text = 'absent'::text) THEN 1
            ELSE NULL::integer
        END) AS absent_count,
    count(
        CASE
            WHEN ((sa.attendance_status)::text = 'late'::text) THEN 1
            ELSE NULL::integer
        END) AS late_count
   FROM (((public.activity_sessions s
     JOIN public.activities a ON ((a.id = s.activity_id)))
     JOIN public.users u ON ((u.id = s.supervising_officer_id)))
     LEFT JOIN public.session_attendance sa ON ((sa.session_id = s.id)))
  GROUP BY s.id, a.name, s.session_date, s.session_time, u.name;


ALTER VIEW public.session_attendance_summary OWNER TO prison_user;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: prison_user
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO prison_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: prison_user
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO prison_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: prison_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activities; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.activities (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    activity_type character varying(50) NOT NULL,
    eligibility_criteria json,
    max_participants integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.activities OWNER TO prison_user;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.activities_id_seq OWNER TO prison_user;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.activities_id_seq OWNED BY testing.activities.id;


--
-- Name: admissions; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.admissions (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_date date NOT NULL,
    admission_type character varying(255) NOT NULL,
    inmate_type character varying(255) NOT NULL,
    case_number character varying(50) NOT NULL,
    court_name character varying(100),
    offence_description text,
    sentence_years integer,
    sentence_months integer,
    sentence_start_date date,
    projected_release_date date,
    remand_next_court_date date,
    committal_warrant_path character varying(255),
    remand_warrant_path character varying(255),
    admitted_by bigint NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    released_at date,
    release_reason character varying(50),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT admissions_admission_type_check CHECK (((admission_type)::text = ANY ((ARRAY['first_time'::character varying, 'repeat'::character varying])::text[]))),
    CONSTRAINT admissions_inmate_type_check CHECK (((inmate_type)::text = ANY ((ARRAY['convict'::character varying, 'remandee'::character varying, 'murder_remandee'::character varying])::text[])))
);


ALTER TABLE testing.admissions OWNER TO prison_user;

--
-- Name: admissions_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.admissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.admissions_id_seq OWNER TO prison_user;

--
-- Name: admissions_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.admissions_id_seq OWNED BY testing.admissions.id;


--
-- Name: audit_logs; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    action character varying(50) NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id bigint,
    old_data json,
    new_data json,
    ip_address inet,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.audit_logs OWNER TO prison_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.audit_logs_id_seq OWNER TO prison_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.audit_logs_id_seq OWNED BY testing.audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE testing.cache OWNER TO prison_user;

--
-- Name: cache_locks; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE testing.cache_locks OWNER TO prison_user;

--
-- Name: cell_allocations; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.cell_allocations (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint NOT NULL,
    cell_id bigint NOT NULL,
    allocated_date date NOT NULL,
    deallocated_date date,
    reason character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.cell_allocations OWNER TO prison_user;

--
-- Name: cell_allocations_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.cell_allocations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.cell_allocations_id_seq OWNER TO prison_user;

--
-- Name: cell_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.cell_allocations_id_seq OWNED BY testing.cell_allocations.id;


--
-- Name: cells; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.cells (
    id bigint NOT NULL,
    cell_number character varying(20) NOT NULL,
    block character varying(10) NOT NULL,
    security_classification character varying(255) NOT NULL,
    capacity integer NOT NULL,
    current_occupancy integer DEFAULT 0 NOT NULL,
    status character varying(255) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT cells_security_classification_check CHECK (((security_classification)::text = ANY ((ARRAY['maximum'::character varying, 'medium'::character varying, 'minimum'::character varying])::text[]))),
    CONSTRAINT cells_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'full'::character varying, 'maintenance'::character varying])::text[])))
);


ALTER TABLE testing.cells OWNER TO prison_user;

--
-- Name: cells_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.cells_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.cells_id_seq OWNER TO prison_user;

--
-- Name: cells_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.cells_id_seq OWNED BY testing.cells.id;


--
-- Name: documents; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.documents (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint,
    document_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    mime_type character varying(100),
    uploaded_by bigint NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.documents OWNER TO prison_user;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.documents_id_seq OWNER TO prison_user;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.documents_id_seq OWNED BY testing.documents.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE testing.failed_jobs OWNER TO prison_user;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.failed_jobs_id_seq OWNER TO prison_user;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.failed_jobs_id_seq OWNED BY testing.failed_jobs.id;


--
-- Name: inmate_activities; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.inmate_activities (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint NOT NULL,
    activity_id bigint NOT NULL,
    assigned_date date NOT NULL,
    end_date date,
    assigned_by bigint NOT NULL,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.inmate_activities OWNER TO prison_user;

--
-- Name: inmate_activities_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.inmate_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.inmate_activities_id_seq OWNER TO prison_user;

--
-- Name: inmate_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.inmate_activities_id_seq OWNED BY testing.inmate_activities.id;


--
-- Name: inmates; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.inmates (
    id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    prison_number character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    other_names character varying(100),
    date_of_birth date NOT NULL,
    place_of_birth character varying(100),
    nationality character varying(50) DEFAULT 'Malawian'::character varying NOT NULL,
    national_id character varying(20),
    marital_status character varying(20),
    next_of_kin_name character varying(100),
    next_of_kin_contact character varying(50),
    photo_path character varying(255),
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT inmates_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'released'::character varying, 'deceased'::character varying, 'transferred'::character varying])::text[])))
);


ALTER TABLE testing.inmates OWNER TO prison_user;

--
-- Name: inmates_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.inmates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.inmates_id_seq OWNER TO prison_user;

--
-- Name: inmates_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.inmates_id_seq OWNED BY testing.inmates.id;


--
-- Name: job_batches; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE testing.job_batches OWNER TO prison_user;

--
-- Name: jobs; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE testing.jobs OWNER TO prison_user;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.jobs_id_seq OWNER TO prison_user;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.jobs_id_seq OWNED BY testing.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE testing.migrations OWNER TO prison_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.migrations_id_seq OWNER TO prison_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.migrations_id_seq OWNED BY testing.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE testing.password_reset_tokens OWNER TO prison_user;

--
-- Name: personal_access_tokens; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.personal_access_tokens OWNER TO prison_user;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.personal_access_tokens_id_seq OWNER TO prison_user;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.personal_access_tokens_id_seq OWNED BY testing.personal_access_tokens.id;


--
-- Name: population_statistics; Type: VIEW; Schema: testing; Owner: prison_user
--

CREATE VIEW testing.population_statistics AS
 SELECT count(DISTINCT i.id) AS total_inmates,
    count(DISTINCT
        CASE
            WHEN (((a.inmate_type)::text = 'convict'::text) AND (a.is_current = true)) THEN i.id
            ELSE NULL::bigint
        END) AS convict_count,
    count(DISTINCT
        CASE
            WHEN (((a.inmate_type)::text = 'remandee'::text) AND (a.is_current = true)) THEN i.id
            ELSE NULL::bigint
        END) AS remandee_count,
    count(DISTINCT
        CASE
            WHEN (((a.inmate_type)::text = 'murder_remandee'::text) AND (a.is_current = true)) THEN i.id
            ELSE NULL::bigint
        END) AS murder_remandee_count,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'active'::text) THEN i.id
            ELSE NULL::bigint
        END) AS active_inmates,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'released'::text) THEN i.id
            ELSE NULL::bigint
        END) AS released_inmates,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'deceased'::text) THEN i.id
            ELSE NULL::bigint
        END) AS deceased_inmates,
    count(DISTINCT
        CASE
            WHEN ((i.status)::text = 'transferred'::text) THEN i.id
            ELSE NULL::bigint
        END) AS transferred_inmates
   FROM (testing.inmates i
     LEFT JOIN testing.admissions a ON (((i.id = a.inmate_id) AND (a.is_current = true))));


ALTER VIEW testing.population_statistics OWNER TO prison_user;

--
-- Name: roles; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.roles (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE testing.roles OWNER TO prison_user;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.roles_id_seq OWNER TO prison_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.roles_id_seq OWNED BY testing.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE testing.sessions OWNER TO prison_user;

--
-- Name: users; Type: TABLE; Schema: testing; Owner: prison_user
--

CREATE TABLE testing.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    role_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp(0) without time zone
);


ALTER TABLE testing.users OWNER TO prison_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: testing; Owner: prison_user
--

CREATE SEQUENCE testing.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE testing.users_id_seq OWNER TO prison_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: testing; Owner: prison_user
--

ALTER SEQUENCE testing.users_id_seq OWNED BY testing.users.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_assignment_logs id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_assignment_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_assignment_logs_id_seq'::regclass);


--
-- Name: activity_categories id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_categories ALTER COLUMN id SET DEFAULT nextval('public.activity_categories_id_seq'::regclass);


--
-- Name: activity_sessions id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_sessions ALTER COLUMN id SET DEFAULT nextval('public.activity_sessions_id_seq'::regclass);


--
-- Name: admissions id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.admissions ALTER COLUMN id SET DEFAULT nextval('public.admissions_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: cell_allocations id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cell_allocations ALTER COLUMN id SET DEFAULT nextval('public.cell_allocations_id_seq'::regclass);


--
-- Name: cells id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cells ALTER COLUMN id SET DEFAULT nextval('public.cells_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: external_activity_details id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.external_activity_details ALTER COLUMN id SET DEFAULT nextval('public.external_activity_details_id_seq'::regclass);


--
-- Name: inmate_activities id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities ALTER COLUMN id SET DEFAULT nextval('public.inmate_activities_id_seq'::regclass);


--
-- Name: inmates id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmates ALTER COLUMN id SET DEFAULT nextval('public.inmates_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: officer_duty_rosters id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.officer_duty_rosters ALTER COLUMN id SET DEFAULT nextval('public.officer_duty_rosters_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: session_attendance id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance ALTER COLUMN id SET DEFAULT nextval('public.session_attendance_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.activities ALTER COLUMN id SET DEFAULT nextval('testing.activities_id_seq'::regclass);


--
-- Name: admissions id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.admissions ALTER COLUMN id SET DEFAULT nextval('testing.admissions_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.audit_logs ALTER COLUMN id SET DEFAULT nextval('testing.audit_logs_id_seq'::regclass);


--
-- Name: cell_allocations id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cell_allocations ALTER COLUMN id SET DEFAULT nextval('testing.cell_allocations_id_seq'::regclass);


--
-- Name: cells id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cells ALTER COLUMN id SET DEFAULT nextval('testing.cells_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.documents ALTER COLUMN id SET DEFAULT nextval('testing.documents_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.failed_jobs ALTER COLUMN id SET DEFAULT nextval('testing.failed_jobs_id_seq'::regclass);


--
-- Name: inmate_activities id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmate_activities ALTER COLUMN id SET DEFAULT nextval('testing.inmate_activities_id_seq'::regclass);


--
-- Name: inmates id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmates ALTER COLUMN id SET DEFAULT nextval('testing.inmates_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.jobs ALTER COLUMN id SET DEFAULT nextval('testing.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.migrations ALTER COLUMN id SET DEFAULT nextval('testing.migrations_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('testing.personal_access_tokens_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.roles ALTER COLUMN id SET DEFAULT nextval('testing.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.users ALTER COLUMN id SET DEFAULT nextval('testing.users_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.activities (id, name, activity_type, eligibility_criteria, max_participants, is_active, created_at, updated_at, category_id, source_type, security_level, created_by, modified_by) FROM stdin;
1	Kitchen	internal	{"allowed_inmate_types": ["convict"], "min_sentence_years": 0, "skills_required": ["cooking", "cleaning"]}	15	t	2026-03-24 10:20:39	2026-04-01 08:11:13	1	predefined	low	52	\N
2	Tailoring	internal	{"allowed_inmate_types": ["convict"], "min_sentence_years": 1, "skills_required": ["sewing", "design"]}	10	t	2026-03-24 10:20:39	2026-04-01 08:11:13	1	predefined	medium	52	\N
3	Farm Work	internal	{"allowed_inmate_types": ["convict"], "min_sentence_years": 0, "skills_required": ["farming"]}	20	t	2026-03-24 10:20:39	2026-04-01 08:11:13	1	predefined	low	52	\N
6	Computer Literacy	internal	{"allowed_inmate_types": ["convict"], "min_sentence_years": 3, "education_level": "secondary"}	5	t	2026-04-01 08:11:13	2026-04-01 08:11:13	2	custom	low	52	\N
7	Community Cleanup	external	{"allowed_inmate_types": ["convict"], "min_sentence_years": 0, "good_behavior": true}	20	t	2026-04-01 08:11:13	2026-04-01 08:11:13	3	custom	high	52	\N
5	Carpentry	internal	{"allowed_inmate_types": ["convict"], "min_sentence_years": 2, "skills_required": ["woodworking"]}	8	t	2026-04-01 08:11:13	2026-04-01 08:59:00	1	predefined	medium	52	63
9	House building	internal	{"allowed_inmate_types":["convict"],"min_sentence_years":7,"skills_required":["House building"],"good_behavior":false,"education_level":"secondary"}	15	t	2026-04-01 09:23:42	2026-04-01 09:23:42	1	predefined	medium	63	\N
10	Teaching	internal	{"allowed_inmate_types":["convict"],"min_sentence_years":10,"skills_required":["teaching"],"good_behavior":true,"education_level":"tertiary"}	5	t	2026-04-02 08:20:29	2026-04-02 08:20:29	1	predefined	medium	63	\N
\.


--
-- Data for Name: activity_assignment_logs; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.activity_assignment_logs (id, inmate_activity_id, assigned_by, assignment_reason, notes, created_at, updated_at) FROM stdin;
1	2	65	automatic external allocation	\N	2026-04-03 16:26:18	2026-04-03 16:26:18
2	3	65	automatic external allocation	\N	2026-04-03 16:26:18	2026-04-03 16:26:18
3	4	65	automatic external allocation	\N	2026-04-03 16:26:18	2026-04-03 16:26:18
4	5	65	automatic external allocation	\N	2026-04-03 16:26:18	2026-04-03 16:26:18
5	6	65	automatic external allocation	\N	2026-04-03 16:26:18	2026-04-03 16:26:18
6	7	65	automatic external allocation	\N	2026-04-03 16:26:18	2026-04-03 16:26:18
7	17	65	automatic external allocation	\N	2026-04-07 17:03:48	2026-04-07 17:03:48
8	18	65	manual external allocation	\N	2026-04-09 17:45:17	2026-04-09 17:45:17
\.


--
-- Data for Name: activity_categories; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.activity_categories (id, name, description, created_at, updated_at) FROM stdin;
1	Internal Predefined	Standard internal activities like Kitchen, Tailoring	\N	\N
2	Internal Custom	Custom internal activities created by admin	\N	\N
3	External	External activities like community service	\N	\N
\.


--
-- Data for Name: activity_sessions; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.activity_sessions (id, activity_id, session_date, session_time, supervising_officer_id, start_time, end_time, status, notes, created_by, created_at, updated_at) FROM stdin;
6	7	2026-04-03	Afternoon	65	13:00:00	17:00:00	completed	\N	65	2026-04-03 16:16:00	2026-04-03 16:28:27
8	5	2026-04-15	Daily	65	14:00:00	15:00:00	scheduled	objective is to develop two sofa sets	65	2026-04-15 11:58:34	2026-04-15 11:58:34
\.


--
-- Data for Name: admissions; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.admissions (id, inmate_id, admission_date, admission_type, inmate_type, case_number, court_name, offence_description, sentence_years, sentence_months, sentence_start_date, projected_release_date, remand_next_court_date, committal_warrant_path, remand_warrant_path, admitted_by, is_current, released_at, release_reason, created_at, updated_at) FROM stdin;
1	1	2026-03-28	first_time	murder_remandee	BHG123	Zingwangwa	Murder	\N	\N	\N	\N	2026-05-22	\N	\N	68	t	\N	\N	2026-03-28 12:48:03	2026-03-28 12:48:03
2	2	2026-03-28	first_time	convict	h23	Zomba highcourt	killed A Toddler	8	8	2026-03-30	2032-01-10	\N	\N	\N	68	t	\N	\N	2026-03-28 12:51:28	2026-03-28 12:51:28
3	5	2026-03-28	first_time	murder_remandee	H123	zomba	murder of a 10 year old	\N	\N	\N	\N	2026-03-31	\N	\N	68	t	\N	\N	2026-03-28 13:28:56	2026-03-28 13:28:56
4	6	2026-03-29	first_time	convict	H234	zomba	stole 5 bags of rice at Admarc	7	5	2026-03-31	2031-03-12	\N	\N	\N	68	t	\N	\N	2026-03-29 12:33:56	2026-03-29 12:33:56
5	4	2026-03-29	first_time	convict	H25	Blantyre High court	burgaly	7	8	2026-03-31	2031-05-12	\N	\N	\N	68	t	\N	\N	2026-03-29 19:06:39	2026-03-29 19:06:39
6	7	2026-03-30	first_time	remandee	MP004	Ezondweni Magistrate Court	Stole two Tv sets at The Namadya residence	\N	\N	\N	\N	2026-03-31	\N	\N	68	t	\N	\N	2026-03-30 15:19:09	2026-03-30 15:19:09
7	8	2026-03-30	first_time	convict	MP005	Mzuzu High Court	Killed An entire Familly at Chiwabvi	16	8	2026-03-31	2037-05-12	\N	\N	\N	68	t	\N	\N	2026-03-30 15:34:01	2026-03-30 15:34:01
8	9	2026-03-30	repeat	murder_remandee	MP007	Mzuzu High Court	Killed an 8 year old boy	\N	\N	\N	\N	2026-03-31	\N	\N	68	t	\N	\N	2026-03-30 15:50:22	2026-03-30 15:50:22
9	10	2026-03-31	first_time	convict	MP008	Mzimba Magistrate Court	Killed an elderly woman at ekwendeni	14	8	2026-03-31	2036-01-11	\N	\N	\N	68	t	\N	\N	2026-03-31 08:04:04	2026-03-31 08:04:04
10	3	2026-04-03	first_time	murder_remandee	MP009	Mzuzu High Court	Killed two tourists at viphya plateu	\N	\N	\N	\N	2026-04-23	\N	\N	68	t	\N	\N	2026-04-03 16:04:33	2026-04-03 16:04:33
11	11	2026-04-03	first_time	convict	MP010	\N	Stole two goats	7	8	2026-04-10	2031-05-22	\N	\N	\N	68	t	\N	\N	2026-04-03 16:07:31	2026-04-03 16:07:31
12	12	2026-04-07	repeat	convict	MP011	Mzuzu High Court	Killed two residents at area 1B	20	6	2026-04-07	2039-12-07	\N	\N	\N	68	t	\N	\N	2026-04-07 17:02:41	2026-04-07 17:02:41
13	13	2026-04-09	first_time	convict	MP012	\N	Stole two tons of maize	7	3	2026-04-09	2031-02-08	\N	\N	\N	68	t	\N	\N	2026-04-09 17:38:09	2026-04-09 17:38:09
14	14	2026-04-13	first_time	murder_remandee	MP00545	Mbande Magistrate Court	murder	\N	\N	\N	\N	2026-04-13	\N	\N	68	t	\N	\N	2026-04-13 11:34:41	2026-04-13 11:34:41
15	15	2026-04-15	first_time	convict	MP1111	Mzuzu High Court	Stole 3 bags of maize	13	5	2026-04-15	2035-03-27	\N	\N	\N	68	t	\N	\N	2026-04-15 11:51:58	2026-04-15 11:51:58
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_data, new_data, ip_address, created_at, updated_at) FROM stdin;
1	68	INSERT	admissions	1	\N	{"inmate_id":1,"admission_date":"2026-03-28T00:00:00.000000Z","admission_type":"first_time","inmate_type":"murder_remandee","case_number":"BHG123","court_name":"Zingwangwa","offence_description":"Murder","sentence_years":null,"sentence_months":null,"sentence_start_date":null,"projected_release_date":null,"remand_next_court_date":"2026-05-22T00:00:00.000000Z","admitted_by":68,"is_current":true,"updated_at":"2026-03-28T12:48:03.000000Z","created_at":"2026-03-28T12:48:03.000000Z","id":1}	127.0.0.1	2026-03-28 12:48:03	2026-03-28 12:48:03
2	68	INSERT	admissions	2	\N	{"inmate_id":2,"admission_date":"2026-03-28T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"h23","court_name":"Zomba highcourt","offence_description":"killed A Toddler","sentence_years":8,"sentence_months":8,"sentence_start_date":"2026-03-30T00:00:00.000000Z","projected_release_date":"2032-01-10T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-03-28T12:51:28.000000Z","created_at":"2026-03-28T12:51:28.000000Z","id":2}	127.0.0.1	2026-03-28 12:51:28	2026-03-28 12:51:28
3	68	INSERT	admissions	3	\N	{"inmate_id":5,"admission_date":"2026-03-28T00:00:00.000000Z","admission_type":"first_time","inmate_type":"murder_remandee","case_number":"H123","court_name":"zomba","offence_description":"murder of a 10 year old","sentence_years":null,"sentence_months":null,"sentence_start_date":null,"projected_release_date":null,"remand_next_court_date":"2026-03-31T00:00:00.000000Z","admitted_by":68,"is_current":true,"updated_at":"2026-03-28T13:28:56.000000Z","created_at":"2026-03-28T13:28:56.000000Z","id":3}	127.0.0.1	2026-03-28 13:28:56	2026-03-28 13:28:56
4	68	INSERT	admissions	4	\N	{"inmate_id":6,"admission_date":"2026-03-29T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"H234","court_name":"zomba","offence_description":"stole 5 bags of rice at Admarc","sentence_years":7,"sentence_months":5,"sentence_start_date":"2026-03-31T00:00:00.000000Z","projected_release_date":"2031-03-12T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-03-29T12:33:56.000000Z","created_at":"2026-03-29T12:33:56.000000Z","id":4}	127.0.0.1	2026-03-29 12:33:56	2026-03-29 12:33:56
5	68	INSERT	admissions	5	\N	{"inmate_id":4,"admission_date":"2026-03-29T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"H25","court_name":"Blantyre High court","offence_description":"burgaly","sentence_years":7,"sentence_months":8,"sentence_start_date":"2026-03-31T00:00:00.000000Z","projected_release_date":"2031-05-12T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-03-29T19:06:39.000000Z","created_at":"2026-03-29T19:06:39.000000Z","id":5}	127.0.0.1	2026-03-29 19:06:39	2026-03-29 19:06:39
6	68	INSERT	documents	1	\N	{"inmate_id":7,"admission_id":null,"document_type":"inmate_photo","file_name":"government-logo.png","file_path":"documents\\/7\\/d36HsLAoBSoY0k0zutDtbUPmxgMlEfh2KY6zLnRe.png","mime_type":"image\\/png","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-03-30T15:19:09.000000Z","created_at":"2026-03-30T15:19:09.000000Z","id":1}	127.0.0.1	2026-03-30 15:19:09	2026-03-30 15:19:09
7	68	INSERT	admissions	6	\N	{"inmate_id":7,"admission_date":"2026-03-30T00:00:00.000000Z","admission_type":"first_time","inmate_type":"remandee","case_number":"MP004","court_name":"Ezondweni Magistrate Court","offence_description":"Stole two Tv sets at The Namadya residence","sentence_years":null,"sentence_months":null,"sentence_start_date":null,"projected_release_date":null,"remand_next_court_date":"2026-03-31T00:00:00.000000Z","admitted_by":68,"is_current":true,"updated_at":"2026-03-30T15:19:09.000000Z","created_at":"2026-03-30T15:19:09.000000Z","id":6}	127.0.0.1	2026-03-30 15:19:10	2026-03-30 15:19:10
8	68	INSERT	documents	2	\N	{"inmate_id":8,"admission_id":null,"document_type":"inmate_photo","file_name":"government-logo.png","file_path":"documents\\/8\\/wyXu399jpollrSpBxgmx1Mb2BGKw12vYUxvYUNu3.png","mime_type":"image\\/png","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-03-30T15:34:01.000000Z","created_at":"2026-03-30T15:34:01.000000Z","id":2}	127.0.0.1	2026-03-30 15:34:01	2026-03-30 15:34:01
9	68	INSERT	admissions	7	\N	{"inmate_id":8,"admission_date":"2026-03-30T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"MP005","court_name":"Mzuzu High Court","offence_description":"Killed An entire Familly at Chiwabvi","sentence_years":16,"sentence_months":8,"sentence_start_date":"2026-03-31T00:00:00.000000Z","projected_release_date":"2037-05-12T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-03-30T15:34:01.000000Z","created_at":"2026-03-30T15:34:01.000000Z","id":7}	127.0.0.1	2026-03-30 15:34:01	2026-03-30 15:34:01
10	68	INSERT	documents	3	\N	{"inmate_id":9,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/9\\/0Ezv5M9uy4SoK41NcBhJt98qQtCAnp6lt8gCOKa5.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-03-30T15:50:21.000000Z","created_at":"2026-03-30T15:50:21.000000Z","id":3}	127.0.0.1	2026-03-30 15:50:21	2026-03-30 15:50:21
11	68	INSERT	admissions	8	\N	{"inmate_id":9,"admission_date":"2026-03-30T00:00:00.000000Z","admission_type":"repeat","inmate_type":"murder_remandee","case_number":"MP007","court_name":"Mzuzu High Court","offence_description":"Killed an 8 year old boy","sentence_years":null,"sentence_months":null,"sentence_start_date":null,"projected_release_date":null,"remand_next_court_date":"2026-03-31T00:00:00.000000Z","admitted_by":68,"is_current":true,"updated_at":"2026-03-30T15:50:22.000000Z","created_at":"2026-03-30T15:50:22.000000Z","id":8}	127.0.0.1	2026-03-30 15:50:22	2026-03-30 15:50:22
12	68	INSERT	documents	4	\N	{"inmate_id":10,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/10\\/VbuGLN8auXaiaX7SC7wQoqseQV5r0fE9BeuvXnbU.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-03-31T08:04:03.000000Z","created_at":"2026-03-31T08:04:03.000000Z","id":4}	127.0.0.1	2026-03-31 08:04:03	2026-03-31 08:04:03
13	68	INSERT	admissions	9	\N	{"inmate_id":10,"admission_date":"2026-03-31T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"MP008","court_name":"Mzimba Magistrate Court","offence_description":"Killed an elderly woman at ekwendeni","sentence_years":14,"sentence_months":8,"sentence_start_date":"2026-03-31T00:00:00.000000Z","projected_release_date":"2036-01-11T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-03-31T08:04:04.000000Z","created_at":"2026-03-31T08:04:04.000000Z","id":9}	127.0.0.1	2026-03-31 08:04:04	2026-03-31 08:04:04
29	68	INSERT	documents	5	\N	{"inmate_id":3,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/3\\/AoPvibK5NDqsAyy8wIww0HJwChXKLkuwAbV52Lnd.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-04-03T16:04:33.000000Z","created_at":"2026-04-03T16:04:33.000000Z","id":5}	127.0.0.1	2026-04-03 16:04:33	2026-04-03 16:04:33
14	63	UPDATE	activities	5	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":true,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:11:13.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":null,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":false,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:41.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	127.0.0.1	2026-04-01 08:58:41	2026-04-01 08:58:41
15	63	UPDATE	activities	5	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":false,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:41.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":true,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:43.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	127.0.0.1	2026-04-01 08:58:43	2026-04-01 08:58:43
16	63	UPDATE	activities	5	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":true,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:43.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":false,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:45.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	127.0.0.1	2026-04-01 08:58:45	2026-04-01 08:58:45
17	63	UPDATE	activities	5	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":false,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:45.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":true,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:49.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	127.0.0.1	2026-04-01 08:58:49	2026-04-01 08:58:49
18	63	UPDATE	activities	5	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":true,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:49.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":false,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:51.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	127.0.0.1	2026-04-01 08:58:51	2026-04-01 08:58:51
19	63	UPDATE	activities	5	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":false,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:58:51.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	{"id":5,"name":"Carpentry","activity_type":"internal","eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":2,"skills_required":["woodworking"]},"max_participants":8,"is_active":true,"created_at":"2026-04-01T08:11:13.000000Z","updated_at":"2026-04-01T08:59:00.000000Z","category_id":1,"source_type":"predefined","security_level":"medium","created_by":52,"modified_by":63,"category":{"id":1,"name":"Internal Predefined","description":"Standard internal activities like Kitchen, Tailoring","created_at":null,"updated_at":null},"creator":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"external_details":null}	127.0.0.1	2026-04-01 08:59:00	2026-04-01 08:59:00
20	63	INSERT	activities	8	\N	{"name":"Grass cutting","source_type":"custom","category_id":null,"eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":7,"skills_required":["none"],"good_behavior":true,"education_level":"none"},"max_participants":17,"is_active":true,"security_level":"medium","activity_type":"external","created_by":63,"updated_at":"2026-04-01T09:11:56.000000Z","created_at":"2026-04-01T09:11:56.000000Z","id":8}	127.0.0.1	2026-04-01 09:11:56	2026-04-01 09:11:56
21	63	INSERT	activities	9	\N	{"name":"House building","source_type":"predefined","category_id":1,"eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":7,"skills_required":["House building"],"good_behavior":false,"education_level":"secondary"},"max_participants":15,"is_active":true,"security_level":"medium","activity_type":"internal","created_by":63,"updated_at":"2026-04-01T09:23:42.000000Z","created_at":"2026-04-01T09:23:42.000000Z","id":9}	127.0.0.1	2026-04-01 09:23:42	2026-04-01 09:23:42
22	63	INSERT	officer_duty_rosters	3	\N	{"officer_id":65,"duty_week_start":"2026-04-01T00:00:00.000000Z","duty_week_end":"2026-04-07T00:00:00.000000Z","shift_type":"full_day","created_by":63,"updated_at":"2026-04-01T10:01:29.000000Z","created_at":"2026-04-01T10:01:29.000000Z","id":3}	127.0.0.1	2026-04-01 10:01:29	2026-04-01 10:01:29
23	63	INSERT	officer_duty_rosters	4	\N	{"officer_id":52,"duty_week_start":"2026-04-06T00:00:00.000000Z","duty_week_end":"2026-04-12T00:00:00.000000Z","shift_type":"full_day","is_active":true,"created_by":63,"updated_at":"2026-04-01T10:03:16.000000Z","created_at":"2026-04-01T10:03:16.000000Z","id":4}	127.0.0.1	2026-04-01 10:03:16	2026-04-01 10:03:16
24	63	INSERT	activities	10	\N	{"name":"Teaching","category_id":1,"eligibility_criteria":{"allowed_inmate_types":["convict"],"min_sentence_years":10,"skills_required":["teaching"],"good_behavior":true,"education_level":"tertiary"},"max_participants":5,"is_active":true,"security_level":"medium","activity_type":"internal","source_type":"predefined","created_by":63,"updated_at":"2026-04-02T08:20:29.000000Z","created_at":"2026-04-02T08:20:29.000000Z","id":10}	127.0.0.1	2026-04-02 08:20:29	2026-04-02 08:20:29
25	65	INSERT	activity_sessions	1	\N	{"activity_id":1,"session_date":"2026-04-03T00:00:00.000000Z","session_time":"Daily","supervising_officer_id":65,"start_time":null,"end_time":null,"status":"scheduled","notes":"as for todays work Inmates are supposed to make the usual meal of the day","created_by":65,"updated_at":"2026-04-03T15:32:57.000000Z","created_at":"2026-04-03T15:32:57.000000Z","id":1}	127.0.0.1	2026-04-03 15:32:57	2026-04-03 15:32:57
26	65	INSERT	activity_sessions	2	\N	{"activity_id":5,"session_date":"2026-04-03T00:00:00.000000Z","session_time":"Daily","supervising_officer_id":65,"created_by":65,"updated_at":"2026-04-03T15:34:26.000000Z","created_at":"2026-04-03T15:34:26.000000Z","id":2}	127.0.0.1	2026-04-03 15:34:26	2026-04-03 15:34:26
27	65	INSERT	activity_sessions	3	\N	{"activity_id":7,"session_date":"2026-04-03T00:00:00.000000Z","session_time":"One-time","supervising_officer_id":65,"created_by":65,"updated_at":"2026-04-03T15:35:03.000000Z","created_at":"2026-04-03T15:35:03.000000Z","id":3}	127.0.0.1	2026-04-03 15:35:03	2026-04-03 15:35:03
28	65	INSERT	activity_sessions	4	\N	{"activity_id":5,"session_date":"2026-04-03T00:00:00.000000Z","session_time":"Daily","supervising_officer_id":65,"start_time":"06:30:00","end_time":"08:45:00","status":"scheduled","notes":"Inmates today will be making some wooden stools","created_by":65,"updated_at":"2026-04-03T15:48:00.000000Z","created_at":"2026-04-03T15:48:00.000000Z","id":4}	127.0.0.1	2026-04-03 15:48:00	2026-04-03 15:48:00
30	68	INSERT	admissions	10	\N	{"inmate_id":3,"admission_date":"2026-04-03T00:00:00.000000Z","admission_type":"first_time","inmate_type":"murder_remandee","case_number":"MP009","court_name":"Mzuzu High Court","offence_description":"Killed two tourists at viphya plateu","sentence_years":null,"sentence_months":null,"sentence_start_date":null,"projected_release_date":null,"remand_next_court_date":"2026-04-23T00:00:00.000000Z","admitted_by":68,"is_current":true,"updated_at":"2026-04-03T16:04:33.000000Z","created_at":"2026-04-03T16:04:33.000000Z","id":10}	127.0.0.1	2026-04-03 16:04:34	2026-04-03 16:04:34
31	68	INSERT	documents	6	\N	{"inmate_id":11,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/11\\/GHUayk5BxOsLIc8Puobfjioe3MOCqXw591RtOyhg.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-04-03T16:07:31.000000Z","created_at":"2026-04-03T16:07:31.000000Z","id":6}	127.0.0.1	2026-04-03 16:07:31	2026-04-03 16:07:31
32	68	INSERT	admissions	11	\N	{"inmate_id":11,"admission_date":"2026-04-03T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"MP010","court_name":null,"offence_description":"Stole two goats","sentence_years":7,"sentence_months":8,"sentence_start_date":"2026-04-10T00:00:00.000000Z","projected_release_date":"2031-05-22T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-04-03T16:07:31.000000Z","created_at":"2026-04-03T16:07:31.000000Z","id":11}	127.0.0.1	2026-04-03 16:07:32	2026-04-03 16:07:32
33	65	INSERT	activity_sessions	5	\N	{"activity_id":7,"session_date":"2026-04-03T00:00:00.000000Z","session_time":"One-time","supervising_officer_id":65,"created_by":65,"updated_at":"2026-04-03T16:08:30.000000Z","created_at":"2026-04-03T16:08:30.000000Z","id":5}	127.0.0.1	2026-04-03 16:08:30	2026-04-03 16:08:30
34	65	INSERT	activity_sessions	6	\N	{"activity_id":7,"session_date":"2026-04-03T00:00:00.000000Z","session_time":"Afternoon","supervising_officer_id":65,"start_time":"13:00:00","end_time":"17:00:00","status":"scheduled","notes":null,"created_by":65,"updated_at":"2026-04-03T16:16:00.000000Z","created_at":"2026-04-03T16:16:00.000000Z","id":6}	127.0.0.1	2026-04-03 16:16:00	2026-04-03 16:16:00
35	65	INSERT	session_attendance	1	\N	{"session_id":6,"inmate_id":2,"admission_id":2,"attendance_status":"present","notes":null,"recorded_by":65,"recorded_at":"2026-04-03T16:28:14.000000Z","updated_at":"2026-04-03T16:28:14.000000Z","created_at":"2026-04-03T16:28:14.000000Z","id":1}	127.0.0.1	2026-04-03 16:28:14	2026-04-03 16:28:14
36	65	INSERT	session_attendance	2	\N	{"session_id":6,"inmate_id":6,"admission_id":4,"attendance_status":"late","notes":null,"recorded_by":65,"recorded_at":"2026-04-03T16:28:14.000000Z","updated_at":"2026-04-03T16:28:14.000000Z","created_at":"2026-04-03T16:28:14.000000Z","id":2}	127.0.0.1	2026-04-03 16:28:14	2026-04-03 16:28:14
37	65	INSERT	session_attendance	3	\N	{"session_id":6,"inmate_id":8,"admission_id":7,"attendance_status":"present","notes":null,"recorded_by":65,"recorded_at":"2026-04-03T16:28:14.000000Z","updated_at":"2026-04-03T16:28:14.000000Z","created_at":"2026-04-03T16:28:14.000000Z","id":3}	127.0.0.1	2026-04-03 16:28:14	2026-04-03 16:28:14
38	65	INSERT	session_attendance	4	\N	{"session_id":6,"inmate_id":10,"admission_id":9,"attendance_status":"late","notes":null,"recorded_by":65,"recorded_at":"2026-04-03T16:28:14.000000Z","updated_at":"2026-04-03T16:28:14.000000Z","created_at":"2026-04-03T16:28:14.000000Z","id":4}	127.0.0.1	2026-04-03 16:28:14	2026-04-03 16:28:14
39	65	INSERT	session_attendance	5	\N	{"session_id":6,"inmate_id":11,"admission_id":11,"attendance_status":"excused","notes":null,"recorded_by":65,"recorded_at":"2026-04-03T16:28:14.000000Z","updated_at":"2026-04-03T16:28:14.000000Z","created_at":"2026-04-03T16:28:14.000000Z","id":5}	127.0.0.1	2026-04-03 16:28:14	2026-04-03 16:28:14
40	63	UPDATE	officer_duty_rosters	4	{"id":4,"officer_id":52,"duty_week_start":"2026-04-06T00:00:00.000000Z","duty_week_end":"2026-04-12T00:00:00.000000Z","shift_type":"full_day","is_active":true,"created_by":63,"created_at":"2026-04-01T10:03:16.000000Z","updated_at":"2026-04-01T10:03:16.000000Z","officer":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"creator":{"id":63,"name":"Administrator","email":"admin@example.com","email_verified_at":null,"created_at":"2026-03-23T09:35:06.000000Z","updated_at":"2026-04-07T16:49:33.000000Z","role":"admin","role_id":1,"is_active":true,"last_login":"2026-04-07T16:49:33.000000Z","is_eligible_for_duty":false,"duty_preferences":null}}	{"id":4,"officer_id":52,"duty_week_start":"2026-04-06T00:00:00.000000Z","duty_week_end":"2026-04-12T00:00:00.000000Z","shift_type":"full_day","is_active":false,"created_by":63,"created_at":"2026-04-01T10:03:16.000000Z","updated_at":"2026-04-07T16:52:45.000000Z","officer":{"id":52,"name":"Jaren Hegmann","email":"wilma.schultz@example.org","email_verified_at":"2026-03-15T16:19:10.000000Z","created_at":"2026-03-15T16:19:10.000000Z","updated_at":"2026-03-15T16:19:10.000000Z","role":"officer_on_duty","role_id":null,"is_active":true,"last_login":null,"is_eligible_for_duty":false,"duty_preferences":null},"creator":{"id":63,"name":"Administrator","email":"admin@example.com","email_verified_at":null,"created_at":"2026-03-23T09:35:06.000000Z","updated_at":"2026-04-07T16:49:33.000000Z","role":"admin","role_id":1,"is_active":true,"last_login":"2026-04-07T16:49:33.000000Z","is_eligible_for_duty":false,"duty_preferences":null}}	127.0.0.1	2026-04-07 16:52:45	2026-04-07 16:52:45
41	68	INSERT	documents	7	\N	{"inmate_id":12,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/12\\/E4iCxaCygKNQgcMEemcqdTvpbWzhbgCSxWrMnSlS.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-04-07T17:02:41.000000Z","created_at":"2026-04-07T17:02:41.000000Z","id":7}	127.0.0.1	2026-04-07 17:02:41	2026-04-07 17:02:41
42	68	INSERT	admissions	12	\N	{"inmate_id":12,"admission_date":"2026-04-07T00:00:00.000000Z","admission_type":"repeat","inmate_type":"convict","case_number":"MP011","court_name":"Mzuzu High Court","offence_description":"Killed two residents at area 1B","sentence_years":20,"sentence_months":6,"sentence_start_date":"2026-04-07T00:00:00.000000Z","projected_release_date":"2039-12-07T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-04-07T17:02:41.000000Z","created_at":"2026-04-07T17:02:41.000000Z","id":12}	127.0.0.1	2026-04-07 17:02:42	2026-04-07 17:02:42
43	65	INSERT	activity_sessions	7	\N	{"activity_id":5,"session_date":"2026-04-07T00:00:00.000000Z","session_time":"Daily","supervising_officer_id":65,"created_by":65,"updated_at":"2026-04-07T17:04:43.000000Z","created_at":"2026-04-07T17:04:43.000000Z","id":7}	127.0.0.1	2026-04-07 17:04:43	2026-04-07 17:04:43
44	68	INSERT	documents	8	\N	{"inmate_id":13,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/13\\/CIvWKORfQF9OpKm8qpEQSlJZTa8lEuPAjoMVEVHC.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-04-09T17:38:08.000000Z","created_at":"2026-04-09T17:38:08.000000Z","id":8}	127.0.0.1	2026-04-09 17:38:09	2026-04-09 17:38:09
45	68	INSERT	admissions	13	\N	{"inmate_id":13,"admission_date":"2026-04-09T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"MP012","court_name":null,"offence_description":"Stole two tons of maize","sentence_years":7,"sentence_months":3,"sentence_start_date":"2026-04-09T00:00:00.000000Z","projected_release_date":"2031-02-08T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-04-09T17:38:09.000000Z","created_at":"2026-04-09T17:38:09.000000Z","id":13}	127.0.0.1	2026-04-09 17:38:09	2026-04-09 17:38:09
46	68	INSERT	documents	9	\N	{"inmate_id":14,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/14\\/4n5jLjwC5zitd71X2gNcOZmiJUaZqQwGMug1ralN.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-04-13T11:34:41.000000Z","created_at":"2026-04-13T11:34:41.000000Z","id":9}	127.0.0.1	2026-04-13 11:34:41	2026-04-13 11:34:41
47	68	INSERT	admissions	14	\N	{"inmate_id":14,"admission_date":"2026-04-13T00:00:00.000000Z","admission_type":"first_time","inmate_type":"murder_remandee","case_number":"MP00545","court_name":"Mbande Magistrate Court","offence_description":"murder","sentence_years":null,"sentence_months":null,"sentence_start_date":null,"projected_release_date":null,"remand_next_court_date":"2026-04-13T00:00:00.000000Z","admitted_by":68,"is_current":true,"updated_at":"2026-04-13T11:34:41.000000Z","created_at":"2026-04-13T11:34:41.000000Z","id":14}	127.0.0.1	2026-04-13 11:34:41	2026-04-13 11:34:41
48	68	INSERT	documents	10	\N	{"inmate_id":15,"admission_id":null,"document_type":"inmate_photo","file_name":"Inmate1.jpeg","file_path":"documents\\/15\\/WRBeca1P6x761dxJSypnnBodZdFsJpH0qiLiLI4t.jpg","mime_type":"image\\/jpeg","uploaded_by":68,"description":"Inmate photo","updated_at":"2026-04-15T11:51:57.000000Z","created_at":"2026-04-15T11:51:57.000000Z","id":10}	127.0.0.1	2026-04-15 11:51:58	2026-04-15 11:51:58
49	68	INSERT	admissions	15	\N	{"inmate_id":15,"admission_date":"2026-04-15T00:00:00.000000Z","admission_type":"first_time","inmate_type":"convict","case_number":"MP1111","court_name":"Mzuzu High Court","offence_description":"Stole 3 bags of maize","sentence_years":13,"sentence_months":5,"sentence_start_date":"2026-04-15T00:00:00.000000Z","projected_release_date":"2035-03-27T00:00:00.000000Z","remand_next_court_date":null,"admitted_by":68,"is_current":true,"updated_at":"2026-04-15T11:51:58.000000Z","created_at":"2026-04-15T11:51:58.000000Z","id":15}	127.0.0.1	2026-04-15 11:51:58	2026-04-15 11:51:58
50	65	INSERT	activity_sessions	8	\N	{"activity_id":5,"session_date":"2026-04-15T00:00:00.000000Z","session_time":"Daily","supervising_officer_id":65,"start_time":"14:00:00","end_time":"15:00:00","status":"scheduled","notes":"objective is to develop two sofa sets","created_by":65,"updated_at":"2026-04-15T11:58:34.000000Z","created_at":"2026-04-15T11:58:34.000000Z","id":8}	127.0.0.1	2026-04-15 11:58:34	2026-04-15 11:58:34
\.


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.cache (key, value, expiration) FROM stdin;
laravel-cache-rate_limit:user:68	a:3:{s:8:"attempts";i:4;s:16:"first_attempt_at";i:1776253917;s:13:"blocked_until";N;}	1776253978
laravel-cache-rate_limit:auth_ip:127.0.0.1	a:3:{s:8:"attempts";i:1;s:16:"first_attempt_at";i:1776254054;s:13:"blocked_until";N;}	1776254115
laravel-cache-rate_limit:user:52	a:3:{s:8:"attempts";i:1;s:16:"first_attempt_at";i:1773591550;s:13:"blocked_until";N;}	1773591610
laravel-cache-rate_limit:user:65	a:3:{s:8:"attempts";i:25;s:16:"first_attempt_at";i:1776254314;s:13:"blocked_until";N;}	1776254433
laravel-cache-rate_limit:user:63	a:3:{s:8:"attempts";i:18;s:16:"first_attempt_at";i:1776253633;s:13:"blocked_until";N;}	1776253746
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: cell_allocations; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.cell_allocations (id, inmate_id, admission_id, cell_id, allocated_date, deallocated_date, reason, created_at, updated_at) FROM stdin;
1	1	1	1	2026-03-28	\N	\N	2026-03-28 12:48:03	2026-03-28 12:48:03
2	2	2	2	2026-03-28	\N	\N	2026-03-28 12:51:28	2026-03-28 12:51:28
3	5	3	1	2026-03-28	\N	\N	2026-03-28 13:28:56	2026-03-28 13:28:56
4	6	4	2	2026-03-29	\N	\N	2026-03-29 12:33:56	2026-03-29 12:33:56
5	4	5	2	2026-03-29	\N	\N	2026-03-29 19:06:39	2026-03-29 19:06:39
6	7	6	3	2026-03-30	\N	\N	2026-03-30 15:19:09	2026-03-30 15:19:09
7	8	7	2	2026-03-30	\N	\N	2026-03-30 15:34:01	2026-03-30 15:34:01
8	9	8	1	2026-03-30	\N	\N	2026-03-30 15:50:22	2026-03-30 15:50:22
9	10	9	2	2026-03-31	\N	\N	2026-03-31 08:04:04	2026-03-31 08:04:04
10	3	10	1	2026-04-03	\N	\N	2026-04-03 16:04:33	2026-04-03 16:04:33
11	11	11	2	2026-04-03	\N	\N	2026-04-03 16:07:31	2026-04-03 16:07:31
\.


--
-- Data for Name: cells; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.cells (id, cell_number, block, security_classification, capacity, current_occupancy, status, created_at, updated_at) FROM stdin;
3	C-301	C	minimum	8	1	available	2026-03-24 10:20:39	2026-03-30 15:19:10
1	A-101	A	maximum	4	4	full	2026-03-24 10:20:39	2026-04-03 16:04:34
2	B-201	B	medium	6	6	full	2026-03-24 10:20:39	2026-04-03 16:07:31
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.documents (id, inmate_id, admission_id, document_type, file_name, file_path, mime_type, uploaded_by, description, created_at, updated_at) FROM stdin;
1	7	\N	inmate_photo	government-logo.png	documents/7/d36HsLAoBSoY0k0zutDtbUPmxgMlEfh2KY6zLnRe.png	image/png	68	Inmate photo	2026-03-30 15:19:09	2026-03-30 15:19:09
2	8	\N	inmate_photo	government-logo.png	documents/8/wyXu399jpollrSpBxgmx1Mb2BGKw12vYUxvYUNu3.png	image/png	68	Inmate photo	2026-03-30 15:34:01	2026-03-30 15:34:01
3	9	\N	inmate_photo	Inmate1.jpeg	documents/9/0Ezv5M9uy4SoK41NcBhJt98qQtCAnp6lt8gCOKa5.jpg	image/jpeg	68	Inmate photo	2026-03-30 15:50:21	2026-03-30 15:50:21
4	10	\N	inmate_photo	Inmate1.jpeg	documents/10/VbuGLN8auXaiaX7SC7wQoqseQV5r0fE9BeuvXnbU.jpg	image/jpeg	68	Inmate photo	2026-03-31 08:04:03	2026-03-31 08:04:03
5	3	\N	inmate_photo	Inmate1.jpeg	documents/3/AoPvibK5NDqsAyy8wIww0HJwChXKLkuwAbV52Lnd.jpg	image/jpeg	68	Inmate photo	2026-04-03 16:04:33	2026-04-03 16:04:33
6	11	\N	inmate_photo	Inmate1.jpeg	documents/11/GHUayk5BxOsLIc8Puobfjioe3MOCqXw591RtOyhg.jpg	image/jpeg	68	Inmate photo	2026-04-03 16:07:31	2026-04-03 16:07:31
7	12	\N	inmate_photo	Inmate1.jpeg	documents/12/E4iCxaCygKNQgcMEemcqdTvpbWzhbgCSxWrMnSlS.jpg	image/jpeg	68	Inmate photo	2026-04-07 17:02:41	2026-04-07 17:02:41
8	13	\N	inmate_photo	Inmate1.jpeg	documents/13/CIvWKORfQF9OpKm8qpEQSlJZTa8lEuPAjoMVEVHC.jpg	image/jpeg	68	Inmate photo	2026-04-09 17:38:08	2026-04-09 17:38:08
9	14	\N	inmate_photo	Inmate1.jpeg	documents/14/4n5jLjwC5zitd71X2gNcOZmiJUaZqQwGMug1ralN.jpg	image/jpeg	68	Inmate photo	2026-04-13 11:34:41	2026-04-13 11:34:41
10	15	\N	inmate_photo	Inmate1.jpeg	documents/15/WRBeca1P6x761dxJSypnnBodZdFsJpH0qiLiLI4t.jpg	image/jpeg	68	Inmate photo	2026-04-15 11:51:57	2026-04-15 11:51:57
\.


--
-- Data for Name: external_activity_details; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.external_activity_details (id, activity_id, location, external_partner, requires_transport, transport_details, safety_requirements, supervisor_requirements, created_at, updated_at) FROM stdin;
1	7	Mzuzu City Center	Mzuzu City Council	t	Prison truck will transport inmates at 7:00 AM	Inmates must remain in designated area; two officers required	One officer per 5 inmates; must have first aid training	2026-04-01 08:11:13	2026-04-01 08:11:13
\.


--
-- Data for Name: inmate_activities; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.inmate_activities (id, inmate_id, admission_id, activity_id, assigned_date, end_date, assigned_by, notes, created_at, updated_at) FROM stdin;
1	1	1	1	2026-03-28	\N	68	\N	2026-03-28 12:48:03	2026-03-28 12:48:03
2	2	2	7	2026-04-03	\N	65	Closed for external allocation | Reassigned to external activity	2026-03-28 12:51:28	2026-04-03 16:26:18
3	6	4	7	2026-04-03	\N	65	Closed for external allocation | Reassigned to external activity	2026-03-29 12:33:56	2026-04-03 16:26:18
4	4	5	7	2026-04-03	\N	65	Closed for external allocation | Reassigned to external activity	2026-03-29 19:06:39	2026-04-03 16:26:18
5	8	7	7	2026-04-03	\N	65	Closed for external allocation | Reassigned to external activity	2026-03-30 15:34:01	2026-04-03 16:26:18
6	10	9	7	2026-04-03	\N	65	Closed for external allocation | Reassigned to external activity	2026-03-31 08:04:04	2026-04-03 16:26:18
7	11	11	7	2026-04-03	\N	65	Closed for external allocation | Reassigned to external activity	2026-04-03 16:07:31	2026-04-03 16:26:18
17	12	12	7	2026-04-07	\N	65	Closed for external allocation | Reassigned to external activity	2026-04-07 17:02:41	2026-04-07 17:03:48
18	13	13	7	2026-04-09	\N	65	Closed for external allocation | Reassigned to external activity	2026-04-09 17:38:09	2026-04-09 17:45:17
19	15	15	2	2026-04-15	\N	68	\N	2026-04-15 11:51:58	2026-04-15 11:51:58
\.


--
-- Data for Name: inmates; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.inmates (id, created_at, updated_at, prison_number, first_name, last_name, other_names, date_of_birth, place_of_birth, nationality, national_id, marital_status, next_of_kin_name, next_of_kin_contact, photo_path, status, is_young_offender, personal_belongings) FROM stdin;
1	2026-03-28 12:46:22	2026-03-28 12:46:22	MIMS/2026/00001	wongani	Phiri	mzozodo	1962-05-31	\N	Kenya	\N	\N	Gilbert	09909954769	\N	active	f	\N
2	2026-03-28 12:50:22	2026-03-28 12:50:22	MIMS/2026/00002	Watson	Phiri	Mzozodo	2002-05-23	\N	kenyan	BG!@#$%	\N	carolyne	0990886785	\N	active	f	\N
4	2026-03-28 13:17:56	2026-03-28 13:17:56	MIMS/2026/00004	Gregory	Phiri	binn	2000-08-23	\N	Malawian	\N	\N	Samson bwanali	0999945467	\N	active	f	\N
5	2026-03-28 13:25:40	2026-03-28 13:25:40	MIMS/2026/00005	Gregory	Nachali	\N	2000-03-29	\N	Malawian	Bg13RBH	\N	Carolyne standard	0999945467	\N	active	f	\N
6	2026-03-29 12:32:03	2026-03-29 12:32:03	MIMS/2026/00006	Gomezgani	Dokotala	Chambo	2009-03-24	\N	Malawian	\N	\N	Dalitso sokomiti	0999945467	\N	active	t	\N
7	2026-03-30 15:09:06	2026-03-30 15:09:06	MIMS/2026/00007	Thokozani	Banda	Deborah	2009-04-08	\N	Malawian	\N	\N	Carolyne standard	0999666789	\N	active	t	1 trouser ,1 blouse and a small handbag
8	2026-03-30 15:32:06	2026-03-30 15:34:01	MIMS/2026/00008	Boyd	Lozani	Bingoo	2005-05-04	\N	Malawian	\N	\N	Thokozile Lozani	0999777564	documents/8/wyXu399jpollrSpBxgmx1Mb2BGKw12vYUxvYUNu3.png	active	f	a pair of trousers and a yellow vest
9	2026-03-30 15:49:15	2026-03-30 15:50:21	MIMS/2026/00009	Thomas	Daudi	Solomon	2006-03-14	\N	British	\N	\N	Laura Claude	0888999067	documents/9/0Ezv5M9uy4SoK41NcBhJt98qQtCAnp6lt8gCOKa5.jpg	active	f	1 suite and a briefcase
10	2026-03-31 07:59:10	2026-03-31 08:04:03	MIMS/2026/00010	Gomezgani	Stambuli	\N	1995-04-11	\N	Malawian	\N	\N	Sa	\N	documents/10/VbuGLN8auXaiaX7SC7wQoqseQV5r0fE9BeuvXnbU.jpg	active	f	\N
3	2026-03-28 13:14:45	2026-04-03 16:04:33	MIMS/2026/00003	Gregory	Phiri	binn	2000-08-23	\N	Malawian	\N	\N	Samson bwanali	0999945467	documents/3/AoPvibK5NDqsAyy8wIww0HJwChXKLkuwAbV52Lnd.jpg	active	f	\N
11	2026-04-03 16:06:26	2026-04-03 16:07:31	MIMS/2026/00011	Gladwell	Benz	chakumanda	2009-03-11	\N	Malawian	\N	\N	chikondi	0999945467	documents/11/GHUayk5BxOsLIc8Puobfjioe3MOCqXw591RtOyhg.jpg	active	t	1 suite
12	2026-04-07 16:57:48	2026-04-07 17:02:41	MIMS/2026/00012	Mike	Banda	patrick	2007-04-19	\N	Ugandan	\N	\N	Mangani Phiri	0888999067	documents/12/E4iCxaCygKNQgcMEemcqdTvpbWzhbgCSxWrMnSlS.jpg	active	f	1 suite and a pair of shoes
13	2026-04-09 17:36:46	2026-04-09 17:38:08	MIMS/2026/00013	Boyd	Stevens	Lyod	2005-06-20	\N	American	\N	\N	Gracious Phiri	0888999067	documents/13/CIvWKORfQF9OpKm8qpEQSlJZTa8lEuPAjoMVEVHC.jpg	active	f	1 suite and a pair of slippers
14	2026-04-13 11:26:49	2026-04-13 11:34:41	MIMS/2026/00014	Wongani	Lungu	chakumanda	2002-03-13	\N	mal	fg6hghhj	\N	\N	\N	documents/14/4n5jLjwC5zitd71X2gNcOZmiJUaZqQwGMug1ralN.jpg	active	f	\N
15	2026-04-15 11:50:03	2026-04-15 11:51:57	MIMS/2026/00015	Gladwell	Frank	Thokozile	2001-04-18	\N	Malawian	jsugd783	\N	Chisomo Banda	0999666789	documents/15/WRBeca1P6x761dxJSypnnBodZdFsJpH0qiLiLI4t.jpg	active	f	1 trouser , 1 shirt and a pair of shoes
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_03_10_110516_create_personal_access_tokens_table	1
5	2026_03_13_145515_add_role_to_users_table	1
6	2026_03_24_090234_create_roles_table	2
7	2026_03_24_090438_add_role_to_users_table	2
8	2026_03_24_090439_create_inmates_table	3
9	2026_03_24_090439_create_admissions_table	4
10	2026_03_24_090439_create_cells_table	5
11	2026_03_24_090439_create_cell_allocations_table	6
12	2026_03_24_090440_create_activities_table	6
13	2026_03_24_090440_create_audit_logs_table	6
14	2026_03_24_090440_create_documents_table	6
15	2026_03_24_090440_create_inmate_activities_table	6
16	2026_03_24_092740_add_missing_columns_to_inmates_table	7
17	2026_03_24_090441_create_population_statistics_view	8
18	2026_03_29_090000_add_is_young_offender_to_inmates_table	9
19	2026_03_29_100000_add_personal_belongings_to_inmates_table	10
20	2026_04_02_000000_add_activity_allocation_admin_tables	11
22	2026_04_02_010000_make_officer_duty_rosters_weekly_only	12
23	2026_04_02_080026_add_activity_allocation_tables	13
\.


--
-- Data for Name: officer_duty_rosters; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.officer_duty_rosters (id, officer_id, duty_week_start, duty_week_end, shift_type, is_active, created_by, created_at, updated_at) FROM stdin;
3	65	2026-04-01	2026-04-07	full_day	t	63	2026-04-01 10:01:29	2026-04-01 10:01:29
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
3	App\\Models\\User	63	api-token	0dd2a2a42b061ce7d455b2cab9c747c0635d88fe5d212d7000a27972edce342a	["*"]	\N	\N	2026-03-24 11:23:38	2026-03-24 11:23:38
16	App\\Models\\User	63	api-token	a0c102843f590403f8d6057f61c630096e9ac8050ad186f593341d9339b71bab	["*"]	2026-04-01 09:42:17	\N	2026-04-01 08:50:27	2026-04-01 09:42:17
4	App\\Models\\User	63	api-token	0fa0fb9f29494d6af154f87be87f2a35f916fda54e6c73af8fa0be5677ad789c	["*"]	2026-03-25 11:21:25	\N	2026-03-25 11:21:03	2026-03-25 11:21:25
5	App\\Models\\User	63	api-token	549c0e257bd7a8d2b872518508ca5ba62c1f1e345193d958e33e3bb9d5189b8f	["*"]	2026-03-25 11:21:57	\N	2026-03-25 11:21:54	2026-03-25 11:21:57
6	App\\Models\\User	63	api-token	e999d426b9f7c8a76de1ceed0c36871e7d01c347fc201f38b292dafc165c6c54	["*"]	2026-03-25 11:22:09	\N	2026-03-25 11:22:06	2026-03-25 11:22:09
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
1	admin	System administrator	2026-03-24 10:20:39	2026-03-24 10:20:39
2	reception_officer	Handles inmate admissions	2026-03-24 10:20:39	2026-03-24 10:20:39
3	station_officer	Oversees inmate records and releases	2026-03-24 10:20:39	2026-03-24 10:20:39
4	officer_on_duty	Officer on duty	2026-03-24 10:20:39	2026-03-24 10:20:39
5	gatekeeper	Controls gate access	2026-03-24 10:20:39	2026-03-24 10:20:39
\.


--
-- Data for Name: session_attendance; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.session_attendance (id, session_id, inmate_id, admission_id, attendance_status, notes, recorded_by, recorded_at, created_at, updated_at) FROM stdin;
1	6	2	2	present	\N	65	2026-04-03 16:28:14	2026-04-03 16:28:14	2026-04-03 16:28:14
2	6	6	4	late	\N	65	2026-04-03 16:28:14	2026-04-03 16:28:14	2026-04-03 16:28:14
3	6	8	7	present	\N	65	2026-04-03 16:28:14	2026-04-03 16:28:14	2026-04-03 16:28:14
4	6	10	9	late	\N	65	2026-04-03 16:28:14	2026-04-03 16:28:14	2026-04-03 16:28:14
5	6	11	11	excused	\N	65	2026-04-03 16:28:14	2026-04-03 16:28:14	2026-04-03 16:28:14
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
ImZMsjkhulKmAudj5BQ4ERJj1X1qmFXABTq9ztba	\N	127.0.0.1	Symfony	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZnpFZzRIc3lPQkNSc3ZGU2J5YmZkN1NNSXRpNGtCeGlVWHJzZjVyYyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MjE6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1773591547
Kvg6zb0r0nDN02g73csoxQDWU8xHfhm7WbYTGRip	\N	127.0.0.1	PostmanRuntime/7.39.1	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSHVOb0JlOG5TWm5ITzR0ejlQSldveDR0OGhKSlVsbzdwZGNuUnBkQyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MjE6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1774351455
RrzP8EMqSvv916pTamCyCa09BLfW1LmvnoXcvxCz	\N	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:148.0) Gecko/20100101 Firefox/148.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoieWs3akRSQk9SMWR6Y0pDU1VZVEZuZDNrNUdRUXhGWTdOVWV2dkNOVyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MjE6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMCI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1774787035
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at, role, role_id, is_active, last_login, is_eligible_for_duty, duty_preferences) FROM stdin;
64	Test User	test@example.com	2026-03-23 09:35:06	$2y$12$U6XJLeNB20q8svRUPq/pOu6rSJaaD/MDYhfBzfEkT2CtEcbSOHfa6	6cGqyw6HKR	2026-03-23 09:35:06	2026-03-23 09:35:06	officer_on_duty	\N	t	\N	f	\N
63	Administrator	admin@example.com	\N	$2y$12$tdsY2ZwdT23bnwb4wiG49.saA1NzwdvJbC1kl1KQ6eVvbA0h7XJEG	\N	2026-03-23 09:35:06	2026-04-15 11:47:11	admin	1	t	2026-04-15 11:47:11	f	\N
68	Elton Chirambo	reception@example.com	\N	$2y$12$LPchSWvEJKIQ55Kidlba6ee0S6uX2a4RJt6ev3NKnzt9OGEzwnFNG	\N	2026-03-28 12:44:21	2026-04-15 11:48:40	reception_officer	2	t	2026-04-15 11:48:40	f	\N
65	Elton3	elton2@example.com	\N	$2y$12$VBiLyBf60VR18V2jEE26QeXqJ/pKQxIzoJEyY/BH6XOk2X.gDXls.	\N	2026-03-23 09:41:03	2026-04-15 11:54:15	officer_on_duty	4	t	2026-04-15 11:54:15	f	\N
69	shaniel	shaniel@example.com	\N	$2y$12$ELNiUXeQKA8eFk/NetZ.TeFXteDNz4XaUtgqFa8Iz4NVg/t85YhJS	\N	2026-04-07 16:51:43	2026-04-07 16:51:43	reception_officer	2	t	\N	f	\N
52	Jaren Hegmann	wilma.schultz@example.org	2026-03-15 16:19:10	$2y$12$Aa0SyJEhaoKMcqE40ZwS8eupReBfUq3/GClTQlqUxoKnUDs8oRjRy	tQBXUH4UW3	2026-03-15 16:19:10	2026-03-15 16:19:10	officer_on_duty	\N	t	\N	f	\N
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.activities (id, name, activity_type, eligibility_criteria, max_participants, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admissions; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.admissions (id, inmate_id, admission_date, admission_type, inmate_type, case_number, court_name, offence_description, sentence_years, sentence_months, sentence_start_date, projected_release_date, remand_next_court_date, committal_warrant_path, remand_warrant_path, admitted_by, is_current, released_at, release_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.audit_logs (id, user_id, action, table_name, record_id, old_data, new_data, ip_address, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cache; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.cache (key, value, expiration) FROM stdin;
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: cell_allocations; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.cell_allocations (id, inmate_id, admission_id, cell_id, allocated_date, deallocated_date, reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cells; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.cells (id, cell_number, block, security_classification, capacity, current_occupancy, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.documents (id, inmate_id, admission_id, document_type, file_name, file_path, mime_type, uploaded_by, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: inmate_activities; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.inmate_activities (id, inmate_id, admission_id, activity_id, assigned_date, end_date, assigned_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inmates; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.inmates (id, created_at, updated_at, prison_number, first_name, last_name, other_names, date_of_birth, place_of_birth, nationality, national_id, marital_status, next_of_kin_name, next_of_kin_contact, photo_path, status) FROM stdin;
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_03_10_110516_create_personal_access_tokens_table	1
5	2026_03_13_145515_add_role_to_users_table	1
6	2026_03_24_090234_create_roles_table	1
7	2026_03_24_090438_add_role_to_users_table	1
8	2026_03_24_090439_create_admissions_table	1
9	2026_03_24_090439_create_cell_allocations_table	1
10	2026_03_24_090439_create_cells_table	1
11	2026_03_24_090439_create_inmates_table	1
12	2026_03_24_090440_create_activities_table	1
13	2026_03_24_090440_create_audit_logs_table	1
14	2026_03_24_090440_create_documents_table	1
15	2026_03_24_090440_create_inmate_activities_table	1
16	2026_03_24_090441_create_population_statistics_view	1
17	2026_03_24_092740_add_missing_columns_to_inmates_table	1
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.roles (id, name, description, created_at, updated_at) FROM stdin;
65	reception_officer	\N	2026-03-24 11:21:40	2026-03-24 11:21:40
66	gatekeeper	\N	2026-03-24 11:21:42	2026-03-24 11:21:42
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: testing; Owner: prison_user
--

COPY testing.users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at, role_id, is_active, last_login) FROM stdin;
61	Prof. Mervin Nikolaus	omills@example.com	2026-03-24 11:21:40	$2y$04$33tfmj7F4/lD.tVjKEXDPudHukFV0SebTsmBBkdUm0pNzBl63fyBm	nXpCMnI0nx	2026-03-24 11:21:40	2026-03-24 11:21:40	65	t	\N
62	Daphney Skiles	bednar.beth@example.com	2026-03-24 11:21:42	$2y$04$33tfmj7F4/lD.tVjKEXDPudHukFV0SebTsmBBkdUm0pNzBl63fyBm	9TFQ8K7VX4	2026-03-24 11:21:42	2026-03-24 11:21:42	66	t	\N
\.


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.activities_id_seq', 10, true);


--
-- Name: activity_assignment_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.activity_assignment_logs_id_seq', 8, true);


--
-- Name: activity_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.activity_categories_id_seq', 3, true);


--
-- Name: activity_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.activity_sessions_id_seq', 8, true);


--
-- Name: admissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.admissions_id_seq', 15, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 50, true);


--
-- Name: cell_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.cell_allocations_id_seq', 11, true);


--
-- Name: cells_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.cells_id_seq', 3, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.documents_id_seq', 10, true);


--
-- Name: external_activity_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.external_activity_details_id_seq', 2, true);


--
-- Name: inmate_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.inmate_activities_id_seq', 19, true);


--
-- Name: inmates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.inmates_id_seq', 15, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 23, true);


--
-- Name: officer_duty_rosters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.officer_duty_rosters_id_seq', 4, true);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 36, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: session_attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.session_attendance_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.users_id_seq', 69, true);


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.activities_id_seq', 1, true);


--
-- Name: admissions_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.admissions_id_seq', 1, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.audit_logs_id_seq', 4, true);


--
-- Name: cell_allocations_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.cell_allocations_id_seq', 1, false);


--
-- Name: cells_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.cells_id_seq', 1, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.documents_id_seq', 3, true);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.failed_jobs_id_seq', 1, false);


--
-- Name: inmate_activities_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.inmate_activities_id_seq', 1, true);


--
-- Name: inmates_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.inmates_id_seq', 5, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.jobs_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.migrations_id_seq', 17, true);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.personal_access_tokens_id_seq', 1, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.roles_id_seq', 72, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: testing; Owner: prison_user
--

SELECT pg_catalog.setval('testing.users_id_seq', 72, true);


--
-- Name: activities activities_name_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_name_unique UNIQUE (name);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_assignment_logs activity_assignment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_assignment_logs
    ADD CONSTRAINT activity_assignment_logs_pkey PRIMARY KEY (id);


--
-- Name: activity_categories activity_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_name_unique UNIQUE (name);


--
-- Name: activity_categories activity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_pkey PRIMARY KEY (id);


--
-- Name: activity_sessions activity_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_pkey PRIMARY KEY (id);


--
-- Name: admissions admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: cell_allocations cell_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_pkey PRIMARY KEY (id);


--
-- Name: cells cells_cell_number_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cells
    ADD CONSTRAINT cells_cell_number_unique UNIQUE (cell_number);


--
-- Name: cells cells_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cells
    ADD CONSTRAINT cells_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: external_activity_details external_activity_details_activity_id_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.external_activity_details
    ADD CONSTRAINT external_activity_details_activity_id_unique UNIQUE (activity_id);


--
-- Name: external_activity_details external_activity_details_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.external_activity_details
    ADD CONSTRAINT external_activity_details_pkey PRIMARY KEY (id);


--
-- Name: session_attendance idx_attendance_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT idx_attendance_unique UNIQUE (session_id, inmate_id);


--
-- Name: inmate_activities inmate_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_pkey PRIMARY KEY (id);


--
-- Name: inmates inmates_national_id_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmates
    ADD CONSTRAINT inmates_national_id_unique UNIQUE (national_id);


--
-- Name: inmates inmates_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmates
    ADD CONSTRAINT inmates_pkey PRIMARY KEY (id);


--
-- Name: inmates inmates_prison_number_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmates
    ADD CONSTRAINT inmates_prison_number_unique UNIQUE (prison_number);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: officer_duty_rosters officer_duty_rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT officer_duty_rosters_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: session_attendance session_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: inmate_activities unique_active_activity; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT unique_active_activity UNIQUE (inmate_id, admission_id);


--
-- Name: cell_allocations unique_active_cell_allocation; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT unique_active_cell_allocation UNIQUE (inmate_id, admission_id);


--
-- Name: admissions unique_current_admission; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT unique_current_admission UNIQUE (inmate_id, is_current);


--
-- Name: officer_duty_rosters unique_duty_week_start; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT unique_duty_week_start UNIQUE (duty_week_start);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activities activities_name_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.activities
    ADD CONSTRAINT activities_name_unique UNIQUE (name);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: admissions admissions_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.admissions
    ADD CONSTRAINT admissions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: cell_allocations cell_allocations_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cell_allocations
    ADD CONSTRAINT cell_allocations_pkey PRIMARY KEY (id);


--
-- Name: cells cells_cell_number_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cells
    ADD CONSTRAINT cells_cell_number_unique UNIQUE (cell_number);


--
-- Name: cells cells_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cells
    ADD CONSTRAINT cells_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: inmate_activities inmate_activities_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmate_activities
    ADD CONSTRAINT inmate_activities_pkey PRIMARY KEY (id);


--
-- Name: inmates inmates_national_id_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmates
    ADD CONSTRAINT inmates_national_id_unique UNIQUE (national_id);


--
-- Name: inmates inmates_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmates
    ADD CONSTRAINT inmates_pkey PRIMARY KEY (id);


--
-- Name: inmates inmates_prison_number_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmates
    ADD CONSTRAINT inmates_prison_number_unique UNIQUE (prison_number);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_assignment_logs_inmate_activity_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX activity_assignment_logs_inmate_activity_id_index ON public.activity_assignment_logs USING btree (inmate_activity_id);


--
-- Name: activity_sessions_activity_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX activity_sessions_activity_id_index ON public.activity_sessions USING btree (activity_id);


--
-- Name: activity_sessions_session_date_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX activity_sessions_session_date_index ON public.activity_sessions USING btree (session_date);


--
-- Name: activity_sessions_supervising_officer_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX activity_sessions_supervising_officer_id_index ON public.activity_sessions USING btree (supervising_officer_id);


--
-- Name: admissions_inmate_id_is_current_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX admissions_inmate_id_is_current_index ON public.admissions USING btree (inmate_id, is_current);


--
-- Name: admissions_projected_release_date_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX admissions_projected_release_date_index ON public.admissions USING btree (projected_release_date);


--
-- Name: audit_logs_record_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX audit_logs_record_id_index ON public.audit_logs USING btree (record_id);


--
-- Name: audit_logs_table_name_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX audit_logs_table_name_index ON public.audit_logs USING btree (table_name);


--
-- Name: audit_logs_user_id_created_at_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX audit_logs_user_id_created_at_index ON public.audit_logs USING btree (user_id, created_at);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: cell_allocations_inmate_id_admission_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX cell_allocations_inmate_id_admission_id_index ON public.cell_allocations USING btree (inmate_id, admission_id);


--
-- Name: cells_security_classification_status_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX cells_security_classification_status_index ON public.cells USING btree (security_classification, status);


--
-- Name: documents_inmate_id_document_type_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX documents_inmate_id_document_type_index ON public.documents USING btree (inmate_id, document_type);


--
-- Name: idx_inmate_activities_end_date; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX idx_inmate_activities_end_date ON public.inmate_activities USING btree (end_date);


--
-- Name: inmate_activities_inmate_id_admission_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX inmate_activities_inmate_id_admission_id_index ON public.inmate_activities USING btree (inmate_id, admission_id);


--
-- Name: inmates_first_name_last_name_date_of_birth_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX inmates_first_name_last_name_date_of_birth_index ON public.inmates USING btree (first_name, last_name, date_of_birth);


--
-- Name: inmates_is_young_offender_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX inmates_is_young_offender_index ON public.inmates USING btree (is_young_offender);


--
-- Name: officer_duty_rosters_officer_id_duty_week_start_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX officer_duty_rosters_officer_id_duty_week_start_index ON public.officer_duty_rosters USING btree (officer_id, duty_week_start);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: session_attendance_admission_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX session_attendance_admission_id_index ON public.session_attendance USING btree (admission_id);


--
-- Name: session_attendance_inmate_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX session_attendance_inmate_id_index ON public.session_attendance USING btree (inmate_id);


--
-- Name: session_attendance_session_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX session_attendance_session_id_index ON public.session_attendance USING btree (session_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: admissions_inmate_id_is_current_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX admissions_inmate_id_is_current_index ON testing.admissions USING btree (inmate_id, is_current);


--
-- Name: admissions_projected_release_date_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX admissions_projected_release_date_index ON testing.admissions USING btree (projected_release_date);


--
-- Name: admissions_unique_current_admission; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE UNIQUE INDEX admissions_unique_current_admission ON testing.admissions USING btree (inmate_id) WHERE (is_current = true);


--
-- Name: audit_logs_record_id_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX audit_logs_record_id_index ON testing.audit_logs USING btree (record_id);


--
-- Name: audit_logs_table_name_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX audit_logs_table_name_index ON testing.audit_logs USING btree (table_name);


--
-- Name: audit_logs_user_id_created_at_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX audit_logs_user_id_created_at_index ON testing.audit_logs USING btree (user_id, created_at);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX cache_expiration_index ON testing.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX cache_locks_expiration_index ON testing.cache_locks USING btree (expiration);


--
-- Name: cell_allocations_inmate_id_admission_id_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX cell_allocations_inmate_id_admission_id_index ON testing.cell_allocations USING btree (inmate_id, admission_id);


--
-- Name: cell_allocations_unique_active; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE UNIQUE INDEX cell_allocations_unique_active ON testing.cell_allocations USING btree (inmate_id, admission_id) WHERE (deallocated_date IS NULL);


--
-- Name: cells_security_classification_status_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX cells_security_classification_status_index ON testing.cells USING btree (security_classification, status);


--
-- Name: documents_inmate_id_document_type_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX documents_inmate_id_document_type_index ON testing.documents USING btree (inmate_id, document_type);


--
-- Name: inmate_activities_inmate_id_admission_id_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX inmate_activities_inmate_id_admission_id_index ON testing.inmate_activities USING btree (inmate_id, admission_id);


--
-- Name: inmate_activities_unique_active; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE UNIQUE INDEX inmate_activities_unique_active ON testing.inmate_activities USING btree (inmate_id, admission_id) WHERE (end_date IS NULL);


--
-- Name: inmates_first_name_last_name_date_of_birth_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX inmates_first_name_last_name_date_of_birth_index ON testing.inmates USING btree (first_name, last_name, date_of_birth);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX jobs_queue_index ON testing.jobs USING btree (queue);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX personal_access_tokens_expires_at_index ON testing.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON testing.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX sessions_last_activity_index ON testing.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: testing; Owner: prison_user
--

CREATE INDEX sessions_user_id_index ON testing.sessions USING btree (user_id);


--
-- Name: activities activities_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.activity_categories(id) ON DELETE SET NULL;


--
-- Name: activities activities_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activities activities_modified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_modified_by_foreign FOREIGN KEY (modified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activity_assignment_logs activity_assignment_logs_assigned_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_assignment_logs
    ADD CONSTRAINT activity_assignment_logs_assigned_by_foreign FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: activity_assignment_logs activity_assignment_logs_inmate_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_assignment_logs
    ADD CONSTRAINT activity_assignment_logs_inmate_activity_id_foreign FOREIGN KEY (inmate_activity_id) REFERENCES public.inmate_activities(id) ON DELETE CASCADE;


--
-- Name: activity_sessions activity_sessions_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE RESTRICT;


--
-- Name: activity_sessions activity_sessions_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: activity_sessions activity_sessions_supervising_officer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_supervising_officer_id_foreign FOREIGN KEY (supervising_officer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: admissions admissions_admitted_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_admitted_by_foreign FOREIGN KEY (admitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: admissions admissions_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cell_allocations cell_allocations_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: cell_allocations cell_allocations_cell_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_cell_id_foreign FOREIGN KEY (cell_id) REFERENCES public.cells(id) ON DELETE RESTRICT;


--
-- Name: cell_allocations cell_allocations_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: documents documents_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: documents documents_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: external_activity_details external_activity_details_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.external_activity_details
    ADD CONSTRAINT external_activity_details_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: inmate_activities inmate_activities_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: inmate_activities inmate_activities_assigned_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_assigned_by_foreign FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: officer_duty_rosters officer_duty_rosters_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT officer_duty_rosters_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: officer_duty_rosters officer_duty_rosters_officer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT officer_duty_rosters_officer_id_foreign FOREIGN KEY (officer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_session_id_foreign FOREIGN KEY (session_id) REFERENCES public.activity_sessions(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: admissions admissions_admitted_by_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.admissions
    ADD CONSTRAINT admissions_admitted_by_foreign FOREIGN KEY (admitted_by) REFERENCES testing.users(id) ON DELETE RESTRICT;


--
-- Name: admissions admissions_inmate_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.admissions
    ADD CONSTRAINT admissions_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES testing.inmates(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES testing.users(id) ON DELETE SET NULL;


--
-- Name: cell_allocations cell_allocations_admission_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cell_allocations
    ADD CONSTRAINT cell_allocations_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES testing.admissions(id) ON DELETE CASCADE;


--
-- Name: cell_allocations cell_allocations_cell_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cell_allocations
    ADD CONSTRAINT cell_allocations_cell_id_foreign FOREIGN KEY (cell_id) REFERENCES testing.cells(id) ON DELETE RESTRICT;


--
-- Name: cell_allocations cell_allocations_inmate_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.cell_allocations
    ADD CONSTRAINT cell_allocations_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES testing.inmates(id) ON DELETE CASCADE;


--
-- Name: documents documents_admission_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.documents
    ADD CONSTRAINT documents_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES testing.admissions(id) ON DELETE CASCADE;


--
-- Name: documents documents_inmate_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.documents
    ADD CONSTRAINT documents_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES testing.inmates(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.documents
    ADD CONSTRAINT documents_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES testing.users(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_activity_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmate_activities
    ADD CONSTRAINT inmate_activities_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES testing.activities(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_admission_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmate_activities
    ADD CONSTRAINT inmate_activities_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES testing.admissions(id) ON DELETE CASCADE;


--
-- Name: inmate_activities inmate_activities_assigned_by_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmate_activities
    ADD CONSTRAINT inmate_activities_assigned_by_foreign FOREIGN KEY (assigned_by) REFERENCES testing.users(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_inmate_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.inmate_activities
    ADD CONSTRAINT inmate_activities_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES testing.inmates(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_foreign; Type: FK CONSTRAINT; Schema: testing; Owner: prison_user
--

ALTER TABLE ONLY testing.users
    ADD CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES testing.roles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Kk4NARZ2RVYtPVoqgkRi9GC04K9wPFCF38F2kE9bEDvAw5gAcHgTePTwKrl5ehK

