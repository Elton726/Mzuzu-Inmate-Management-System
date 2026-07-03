--
-- PostgreSQL database dump
--

\restrict XrLQq8VOWwFXnLSiviguVjgugHEA4OBcJFQW44MV5Kqd4TijlSfx3R9B1IVgWex

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: check_gatekeeper_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_gatekeeper_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                IF NEW.confirmed_by IS NOT NULL THEN
                    PERFORM 1
                    FROM users
                    LEFT JOIN roles ON roles.id = users.role_id
                    WHERE users.id = NEW.confirmed_by
                      AND roles.name = 'gatekeeper';

                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Only a gatekeeper can confirm a release';
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$;


--
-- Name: finalize_release(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_release() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
                    UPDATE inmates
                    SET status = 'released',
                        last_release_date = CURRENT_DATE
                    WHERE id = (SELECT inmate_id FROM admissions WHERE id = NEW.admission_id);

                    UPDATE admissions
                    SET released_at = CURRENT_DATE,
                        release_reason = 'approved_release'
                    WHERE id = NEW.admission_id;
                END IF;

                RETURN NEW;
            END;
            $$;


--
-- Name: prevent_double_confirmation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_double_confirmation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                IF OLD.status = 'confirmed' AND NEW.status = 'confirmed' THEN
                    RAISE EXCEPTION 'Release already confirmed for this admission';
                END IF;

                RETURN NEW;
            END;
            $$;


--
-- Name: recalc_projected_release_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalc_projected_release_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            DECLARE
                target_admission_id BIGINT;
                total_adjustment_days INTEGER;
                base_release DATE;
            BEGIN
                target_admission_id := COALESCE(NEW.admission_id, OLD.admission_id);

                SELECT COALESCE(original_release_date, projected_release_date) INTO base_release
                FROM admissions
                WHERE id = target_admission_id;

                SELECT COALESCE(SUM(adjustment_days), 0) INTO total_adjustment_days
                FROM sentence_adjustments
                WHERE admission_id = target_admission_id;

                UPDATE admissions
                SET projected_release_date = CASE
                    WHEN base_release IS NULL THEN NULL
                    ELSE base_release - (total_adjustment_days || ' days')::INTERVAL
                END
                WHERE id = target_admission_id;

                RETURN COALESCE(NEW, OLD);
            END;
            $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inmate_activities; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inmates; Type: TABLE; Schema: public; Owner: -
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
    last_release_date date,
    gender character varying(20),
    override_justification text,
    CONSTRAINT inmates_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'released'::character varying, 'deceased'::character varying, 'transferred'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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
    role_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp(0) without time zone,
    is_eligible_for_duty boolean DEFAULT false NOT NULL,
    duty_preferences json
);


--
-- Name: active_inmate_activities; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_assignment_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: activity_assignment_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_assignment_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_assignment_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_assignment_logs_id_seq OWNED BY public.activity_assignment_logs.id;


--
-- Name: activity_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_categories (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: activity_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_categories_id_seq OWNED BY public.activity_categories.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id bigint NOT NULL,
    "timestamp" timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id bigint,
    user_name character varying(255) NOT NULL,
    user_role character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    ip_address inet
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: activity_rotation_queues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_rotation_queues (
    id bigint NOT NULL,
    activity_id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_id bigint NOT NULL,
    queue_position integer NOT NULL,
    cycle_number integer DEFAULT 1 NOT NULL,
    served_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: activity_rotation_queues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_rotation_queues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_rotation_queues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_rotation_queues_id_seq OWNED BY public.activity_rotation_queues.id;


--
-- Name: activity_sessions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: activity_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_sessions_id_seq OWNED BY public.activity_sessions.id;


--
-- Name: admissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions (
    id bigint NOT NULL,
    inmate_id bigint NOT NULL,
    admission_date date NOT NULL,
    admission_type character varying(255) NOT NULL,
    inmate_type character varying(255) NOT NULL,
    case_number character varying(5) NOT NULL,
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
    original_release_date date,
    remand_duration_days integer,
    sentence_days integer,
    remand_next_court_time time(0) without time zone,
    CONSTRAINT admissions_admission_type_check CHECK (((admission_type)::text = ANY ((ARRAY['first_time'::character varying, 'repeat'::character varying])::text[]))),
    CONSTRAINT admissions_inmate_type_check CHECK (((inmate_type)::text = ANY ((ARRAY['convict'::character varying, 'remandee'::character varying, 'murder_remandee'::character varying])::text[])))
);


--
-- Name: admissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admissions_id_seq OWNED BY public.admissions.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: cell_allocations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cell_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cell_allocations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cell_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cell_allocations_id_seq OWNED BY public.cell_allocations.id;


--
-- Name: cells; Type: TABLE; Schema: public; Owner: -
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
    gender character varying(255) DEFAULT 'male'::character varying NOT NULL,
    CONSTRAINT cells_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying])::text[]))),
    CONSTRAINT cells_security_classification_check CHECK (((security_classification)::text = ANY ((ARRAY['maximum'::character varying, 'medium'::character varying, 'minimum'::character varying])::text[]))),
    CONSTRAINT cells_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'full'::character varying, 'maintenance'::character varying])::text[])))
);


--
-- Name: cells_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cells_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cells_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cells_id_seq OWNED BY public.cells.id;


--
-- Name: charity_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.charity_bookings (
    id uuid NOT NULL,
    visit_session_id uuid,
    inmate_id bigint,
    organisation_name character varying(255) NOT NULL,
    contact_person character varying(255) NOT NULL,
    contact_person_phone character varying(255) NOT NULL,
    inmate_category character varying(255) NOT NULL,
    purpose text NOT NULL,
    proposed_date date NOT NULL,
    proposed_time time(0) without time zone,
    duration_minutes integer,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    approved_by bigint,
    approved_at timestamp(0) without time zone,
    pdf_path character varying(255),
    created_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    approval_notes text,
    rejection_reason text,
    rejected_by bigint,
    rejected_at timestamp(0) without time zone
);


--
-- Name: officer_duty_rosters; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: current_duty_roster; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: external_activity_details; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: external_activity_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_activity_details_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_activity_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_activity_details_id_seq OWNED BY public.external_activity_details.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: inmate_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inmate_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inmate_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inmate_activities_id_seq OWNED BY public.inmate_activities.id;


--
-- Name: release_workflow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_workflow (
    id bigint NOT NULL,
    admission_id bigint NOT NULL,
    approved_by bigint NOT NULL,
    approved_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approval_notes text,
    confirmed_by bigint,
    confirmed_at timestamp(0) without time zone,
    confirmation_notes text,
    cancelled_by bigint,
    cancelled_at timestamp(0) without time zone,
    cancellation_reason text,
    status character varying(20) DEFAULT 'approved'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: inmates_due_for_release; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.inmates_due_for_release AS
 SELECT i.id AS inmate_id,
    i.first_name,
    i.last_name,
    i.prison_number,
    a.id AS admission_id,
    a.projected_release_date,
    a.released_at,
    a.is_current
   FROM (public.inmates i
     JOIN public.admissions a ON (((a.inmate_id = i.id) AND (a.is_current = true))))
  WHERE ((a.projected_release_date IS NOT NULL) AND (a.released_at IS NULL) AND (a.projected_release_date <= (CURRENT_DATE + '30 days'::interval)) AND (NOT (EXISTS ( SELECT 1
           FROM public.release_workflow rw
          WHERE ((rw.admission_id = a.id) AND ((rw.status)::text = ANY ((ARRAY['approved'::character varying, 'confirmed'::character varying])::text[])))))))
  ORDER BY a.projected_release_date;


--
-- Name: inmates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inmates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inmates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inmates_id_seq OWNED BY public.inmates.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
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


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: officer_duty_rosters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.officer_duty_rosters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: officer_duty_rosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.officer_duty_rosters_id_seq OWNED BY public.officer_duty_rosters.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: pending_gatekeeper_releases; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pending_gatekeeper_releases AS
 SELECT rw.id AS workflow_id,
    rw.admission_id,
    i.id AS inmate_id,
    i.first_name,
    i.last_name,
    i.prison_number,
    a.projected_release_date,
    rw.approved_by,
    u_approver.name AS approved_by_name,
    rw.approved_at
   FROM (((public.release_workflow rw
     JOIN public.admissions a ON ((a.id = rw.admission_id)))
     JOIN public.inmates i ON ((i.id = a.inmate_id)))
     JOIN public.users u_approver ON ((u_approver.id = rw.approved_by)))
  WHERE ((rw.status)::text = 'approved'::text)
  ORDER BY rw.approved_at;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: population_statistics; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: release_clearance_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_clearance_checklist_items (
    id bigint NOT NULL,
    clearance_checklist_id bigint CONSTRAINT release_clearance_checklist_ite_clearance_checklist_id_not_null NOT NULL,
    item_type character varying(50) NOT NULL,
    item_label character varying(100) NOT NULL,
    is_cleared boolean DEFAULT false NOT NULL,
    cleared_by bigint,
    cleared_at timestamp(0) without time zone,
    verification_notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: release_clearance_checklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.release_clearance_checklist_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: release_clearance_checklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.release_clearance_checklist_items_id_seq OWNED BY public.release_clearance_checklist_items.id;


--
-- Name: release_clearance_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_clearance_checklists (
    id bigint NOT NULL,
    release_workflow_id bigint,
    admission_id bigint NOT NULL,
    initiated_by bigint NOT NULL,
    initiated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_by bigint,
    completed_at timestamp(0) without time zone,
    all_items_cleared boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: release_clearance_checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.release_clearance_checklists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: release_clearance_checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.release_clearance_checklists_id_seq OWNED BY public.release_clearance_checklists.id;


--
-- Name: release_history; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.release_history AS
 SELECT rw.id AS workflow_id,
    rw.admission_id,
    i.id AS inmate_id,
    i.first_name,
    i.last_name,
    i.prison_number,
    a.projected_release_date,
    rw.status,
    rw.approved_by,
    u_approver.name AS approved_by_name,
    rw.approved_at,
    rw.confirmed_by,
    u_confirmer.name AS confirmed_by_name,
    rw.confirmed_at,
    rw.cancelled_by,
    rw.cancelled_at
   FROM ((((public.release_workflow rw
     JOIN public.admissions a ON ((a.id = rw.admission_id)))
     JOIN public.inmates i ON ((i.id = a.inmate_id)))
     LEFT JOIN public.users u_approver ON ((u_approver.id = rw.approved_by)))
     LEFT JOIN public.users u_confirmer ON ((u_confirmer.id = rw.confirmed_by)))
  ORDER BY rw.created_at DESC;


--
-- Name: release_workflow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.release_workflow_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: release_workflow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.release_workflow_id_seq OWNED BY public.release_workflow.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sentence_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sentence_adjustments (
    id bigint NOT NULL,
    admission_id bigint NOT NULL,
    adjustment_type character varying(50) NOT NULL,
    adjustment_days integer NOT NULL,
    effective_date date NOT NULL,
    reason text,
    approved_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: sentence_adjustment_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sentence_adjustment_summary AS
 SELECT a.id AS admission_id,
    i.id AS inmate_id,
    i.first_name,
    i.last_name,
    COALESCE(sum(sa.adjustment_days), (0)::bigint) AS total_remission_days,
    count(sa.id) AS adjustment_count,
    a.projected_release_date,
    a.original_release_date
   FROM ((public.admissions a
     JOIN public.inmates i ON ((i.id = a.inmate_id)))
     LEFT JOIN public.sentence_adjustments sa ON ((sa.admission_id = a.id)))
  GROUP BY a.id, i.id, i.first_name, i.last_name, a.projected_release_date, a.original_release_date;


--
-- Name: sentence_adjustment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sentence_adjustment_types (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    years_to_reduce integer DEFAULT 0 NOT NULL,
    info text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: sentence_adjustment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sentence_adjustment_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sentence_adjustment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sentence_adjustment_types_id_seq OWNED BY public.sentence_adjustment_types.id;


--
-- Name: sentence_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sentence_adjustments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sentence_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sentence_adjustments_id_seq OWNED BY public.sentence_adjustments.id;


--
-- Name: session_attendance; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: session_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: session_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.session_attendance_id_seq OWNED BY public.session_attendance.id;


--
-- Name: session_attendance_summary; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: visit_item_flag_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_item_flag_reviews (
    id uuid NOT NULL,
    visit_item_id uuid NOT NULL,
    visit_session_id uuid NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    resolution character varying(255),
    notes text,
    created_by bigint,
    reviewed_by bigint,
    reviewed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: visit_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_items (
    id uuid NOT NULL,
    visit_session_id uuid NOT NULL,
    item_description character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: visit_session_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_session_events (
    id uuid NOT NULL,
    visit_session_id uuid,
    event_type character varying(255) NOT NULL,
    description text,
    metadata json,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: visit_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_sessions (
    id uuid NOT NULL,
    visitor_id uuid NOT NULL,
    inmate_id bigint,
    visit_type character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'checked_in'::character varying NOT NULL,
    checked_in_at timestamp(0) without time zone,
    checked_out_at timestamp(0) without time zone,
    denial_reason character varying(255),
    denial_notes text,
    created_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    expected_checkout_at timestamp(0) without time zone
);


--
-- Name: visitation_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitation_notifications (
    id uuid NOT NULL,
    user_id bigint,
    recipient_role character varying(255),
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(255) DEFAULT 'info'::character varying NOT NULL,
    action_url character varying(255),
    data json,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: visitation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitation_rules (
    id bigint NOT NULL,
    key character varying(255) NOT NULL,
    value character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    description text,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: visitation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitation_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitation_rules_id_seq OWNED BY public.visitation_rules.id;


--
-- Name: visitor_inmate_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_inmate_relationships (
    id uuid NOT NULL,
    visitor_id uuid NOT NULL,
    inmate_id bigint NOT NULL,
    relationship_type character varying(255) NOT NULL,
    notes text,
    is_approved boolean DEFAULT false NOT NULL,
    approved_by bigint,
    approved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitors (
    id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    phone character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    is_watchlisted boolean DEFAULT false NOT NULL,
    watchlist_reason text,
    watchlisted_by bigint,
    watchlisted_at timestamp(0) without time zone
);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_assignment_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_assignment_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_assignment_logs_id_seq'::regclass);


--
-- Name: activity_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories ALTER COLUMN id SET DEFAULT nextval('public.activity_categories_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: activity_rotation_queues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_rotation_queues ALTER COLUMN id SET DEFAULT nextval('public.activity_rotation_queues_id_seq'::regclass);


--
-- Name: activity_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_sessions ALTER COLUMN id SET DEFAULT nextval('public.activity_sessions_id_seq'::regclass);


--
-- Name: admissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions ALTER COLUMN id SET DEFAULT nextval('public.admissions_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: cell_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cell_allocations ALTER COLUMN id SET DEFAULT nextval('public.cell_allocations_id_seq'::regclass);


--
-- Name: cells id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cells ALTER COLUMN id SET DEFAULT nextval('public.cells_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: external_activity_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_activity_details ALTER COLUMN id SET DEFAULT nextval('public.external_activity_details_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: inmate_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmate_activities ALTER COLUMN id SET DEFAULT nextval('public.inmate_activities_id_seq'::regclass);


--
-- Name: inmates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmates ALTER COLUMN id SET DEFAULT nextval('public.inmates_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: officer_duty_rosters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_duty_rosters ALTER COLUMN id SET DEFAULT nextval('public.officer_duty_rosters_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: release_clearance_checklist_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklist_items ALTER COLUMN id SET DEFAULT nextval('public.release_clearance_checklist_items_id_seq'::regclass);


--
-- Name: release_clearance_checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklists ALTER COLUMN id SET DEFAULT nextval('public.release_clearance_checklists_id_seq'::regclass);


--
-- Name: release_workflow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_workflow ALTER COLUMN id SET DEFAULT nextval('public.release_workflow_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sentence_adjustment_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustment_types ALTER COLUMN id SET DEFAULT nextval('public.sentence_adjustment_types_id_seq'::regclass);


--
-- Name: sentence_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustments ALTER COLUMN id SET DEFAULT nextval('public.sentence_adjustments_id_seq'::regclass);


--
-- Name: session_attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance ALTER COLUMN id SET DEFAULT nextval('public.session_attendance_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: visitation_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitation_rules ALTER COLUMN id SET DEFAULT nextval('public.visitation_rules_id_seq'::regclass);


--
-- Name: activities activities_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_name_unique UNIQUE (name);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_assignment_logs activity_assignment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_assignment_logs
    ADD CONSTRAINT activity_assignment_logs_pkey PRIMARY KEY (id);


--
-- Name: activity_categories activity_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_name_unique UNIQUE (name);


--
-- Name: activity_categories activity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_categories
    ADD CONSTRAINT activity_categories_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: activity_rotation_queues activity_rotation_queues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_rotation_queues
    ADD CONSTRAINT activity_rotation_queues_pkey PRIMARY KEY (id);


--
-- Name: activity_sessions activity_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_pkey PRIMARY KEY (id);


--
-- Name: admissions admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: cell_allocations cell_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_pkey PRIMARY KEY (id);


--
-- Name: cells cells_cell_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cells
    ADD CONSTRAINT cells_cell_number_unique UNIQUE (cell_number);


--
-- Name: cells cells_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cells
    ADD CONSTRAINT cells_pkey PRIMARY KEY (id);


--
-- Name: charity_bookings charity_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charity_bookings
    ADD CONSTRAINT charity_bookings_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: external_activity_details external_activity_details_activity_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_activity_details
    ADD CONSTRAINT external_activity_details_activity_id_unique UNIQUE (activity_id);


--
-- Name: external_activity_details external_activity_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_activity_details
    ADD CONSTRAINT external_activity_details_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: session_attendance idx_attendance_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT idx_attendance_unique UNIQUE (session_id, inmate_id);


--
-- Name: activity_rotation_queues idx_rotation_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_rotation_queues
    ADD CONSTRAINT idx_rotation_unique UNIQUE (activity_id, inmate_id, cycle_number);


--
-- Name: inmate_activities inmate_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_pkey PRIMARY KEY (id);


--
-- Name: inmates inmates_national_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmates
    ADD CONSTRAINT inmates_national_id_unique UNIQUE (national_id);


--
-- Name: inmates inmates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmates
    ADD CONSTRAINT inmates_pkey PRIMARY KEY (id);


--
-- Name: inmates inmates_prison_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmates
    ADD CONSTRAINT inmates_prison_number_unique UNIQUE (prison_number);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: officer_duty_rosters officer_duty_rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT officer_duty_rosters_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: release_clearance_checklist_items release_clearance_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklist_items
    ADD CONSTRAINT release_clearance_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: release_clearance_checklists release_clearance_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklists
    ADD CONSTRAINT release_clearance_checklists_pkey PRIMARY KEY (id);


--
-- Name: release_workflow release_workflow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_workflow
    ADD CONSTRAINT release_workflow_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sentence_adjustment_types sentence_adjustment_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustment_types
    ADD CONSTRAINT sentence_adjustment_types_name_unique UNIQUE (name);


--
-- Name: sentence_adjustment_types sentence_adjustment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustment_types
    ADD CONSTRAINT sentence_adjustment_types_pkey PRIMARY KEY (id);


--
-- Name: sentence_adjustments sentence_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustments
    ADD CONSTRAINT sentence_adjustments_pkey PRIMARY KEY (id);


--
-- Name: session_attendance session_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: officer_duty_rosters unique_duty_week_start; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT unique_duty_week_start UNIQUE (duty_week_start);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visit_item_flag_reviews visit_item_flag_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_item_flag_reviews
    ADD CONSTRAINT visit_item_flag_reviews_pkey PRIMARY KEY (id);


--
-- Name: visit_item_flag_reviews visit_item_flag_reviews_visit_item_id_status_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_item_flag_reviews
    ADD CONSTRAINT visit_item_flag_reviews_visit_item_id_status_unique UNIQUE (visit_item_id, status);


--
-- Name: visit_items visit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_items
    ADD CONSTRAINT visit_items_pkey PRIMARY KEY (id);


--
-- Name: visit_session_events visit_session_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_session_events
    ADD CONSTRAINT visit_session_events_pkey PRIMARY KEY (id);


--
-- Name: visit_sessions visit_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_sessions
    ADD CONSTRAINT visit_sessions_pkey PRIMARY KEY (id);


--
-- Name: visitation_notifications visitation_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitation_notifications
    ADD CONSTRAINT visitation_notifications_pkey PRIMARY KEY (id);


--
-- Name: visitation_rules visitation_rules_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitation_rules
    ADD CONSTRAINT visitation_rules_key_unique UNIQUE (key);


--
-- Name: visitation_rules visitation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitation_rules
    ADD CONSTRAINT visitation_rules_pkey PRIMARY KEY (id);


--
-- Name: visitor_inmate_relationships visitor_inmate_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_inmate_relationships
    ADD CONSTRAINT visitor_inmate_relationships_pkey PRIMARY KEY (id);


--
-- Name: visitor_inmate_relationships visitor_inmate_relationships_visitor_id_inmate_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_inmate_relationships
    ADD CONSTRAINT visitor_inmate_relationships_visitor_id_inmate_id_unique UNIQUE (visitor_id, inmate_id);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);


--
-- Name: activity_assignment_logs_inmate_activity_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_assignment_logs_inmate_activity_id_index ON public.activity_assignment_logs USING btree (inmate_activity_id);


--
-- Name: activity_logs_action_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_logs_action_index ON public.activity_logs USING btree (action);


--
-- Name: activity_logs_user_id_timestamp_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_logs_user_id_timestamp_index ON public.activity_logs USING btree (user_id, "timestamp");


--
-- Name: activity_sessions_activity_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_sessions_activity_id_index ON public.activity_sessions USING btree (activity_id);


--
-- Name: activity_sessions_session_date_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_sessions_session_date_index ON public.activity_sessions USING btree (session_date);


--
-- Name: activity_sessions_supervising_officer_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_sessions_supervising_officer_id_index ON public.activity_sessions USING btree (supervising_officer_id);


--
-- Name: admissions_inmate_case_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admissions_inmate_case_number_unique ON public.admissions USING btree (inmate_id, case_number);


--
-- Name: admissions_inmate_id_is_current_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admissions_inmate_id_is_current_index ON public.admissions USING btree (inmate_id, is_current);


--
-- Name: admissions_projected_release_date_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admissions_projected_release_date_index ON public.admissions USING btree (projected_release_date);


--
-- Name: admissions_unique_current_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admissions_unique_current_admission ON public.admissions USING btree (inmate_id) WHERE (is_current = true);


--
-- Name: audit_logs_record_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_record_id_index ON public.audit_logs USING btree (record_id);


--
-- Name: audit_logs_table_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_table_name_index ON public.audit_logs USING btree (table_name);


--
-- Name: audit_logs_user_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_user_id_created_at_index ON public.audit_logs USING btree (user_id, created_at);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: cell_allocations_inmate_id_admission_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cell_allocations_inmate_id_admission_id_index ON public.cell_allocations USING btree (inmate_id, admission_id);


--
-- Name: cell_allocations_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cell_allocations_unique_active ON public.cell_allocations USING btree (inmate_id, admission_id) WHERE (deallocated_date IS NULL);


--
-- Name: cells_gender_security_classification_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cells_gender_security_classification_status_index ON public.cells USING btree (gender, security_classification, status);


--
-- Name: cells_security_classification_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cells_security_classification_status_index ON public.cells USING btree (security_classification, status);


--
-- Name: charity_bookings_inmate_category_proposed_date_proposed_time_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX charity_bookings_inmate_category_proposed_date_proposed_time_in ON public.charity_bookings USING btree (inmate_category, proposed_date, proposed_time);


--
-- Name: charity_bookings_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX charity_bookings_status_index ON public.charity_bookings USING btree (status);


--
-- Name: documents_inmate_id_document_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_inmate_id_document_type_index ON public.documents USING btree (inmate_id, document_type);


--
-- Name: idx_inmate_activities_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inmate_activities_end_date ON public.inmate_activities USING btree (end_date);


--
-- Name: idx_rotation_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotation_lookup ON public.activity_rotation_queues USING btree (activity_id, cycle_number, served_at);


--
-- Name: inmate_activities_inmate_id_admission_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inmate_activities_inmate_id_admission_id_index ON public.inmate_activities USING btree (inmate_id, admission_id);


--
-- Name: inmate_activities_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX inmate_activities_unique_active ON public.inmate_activities USING btree (inmate_id, admission_id) WHERE (end_date IS NULL);


--
-- Name: inmates_first_name_last_name_date_of_birth_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inmates_first_name_last_name_date_of_birth_index ON public.inmates USING btree (first_name, last_name, date_of_birth);


--
-- Name: inmates_is_young_offender_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inmates_is_young_offender_index ON public.inmates USING btree (is_young_offender);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: officer_duty_rosters_officer_id_duty_week_start_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX officer_duty_rosters_officer_id_duty_week_start_index ON public.officer_duty_rosters USING btree (officer_id, duty_week_start);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: release_clearance_checklist_items_clearance_checklist_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_clearance_checklist_items_clearance_checklist_id_index ON public.release_clearance_checklist_items USING btree (clearance_checklist_id);


--
-- Name: release_clearance_checklist_items_is_cleared_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_clearance_checklist_items_is_cleared_index ON public.release_clearance_checklist_items USING btree (is_cleared);


--
-- Name: release_clearance_checklist_items_item_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_clearance_checklist_items_item_type_index ON public.release_clearance_checklist_items USING btree (item_type);


--
-- Name: release_clearance_checklists_admission_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_clearance_checklists_admission_id_index ON public.release_clearance_checklists USING btree (admission_id);


--
-- Name: release_clearance_checklists_all_items_cleared_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_clearance_checklists_all_items_cleared_index ON public.release_clearance_checklists USING btree (all_items_cleared);


--
-- Name: release_clearance_checklists_release_workflow_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_clearance_checklists_release_workflow_id_index ON public.release_clearance_checklists USING btree (release_workflow_id);


--
-- Name: release_workflow_admission_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_workflow_admission_id_index ON public.release_workflow USING btree (admission_id);


--
-- Name: release_workflow_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_workflow_status_index ON public.release_workflow USING btree (status);


--
-- Name: sentence_adjustments_admission_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sentence_adjustments_admission_id_index ON public.sentence_adjustments USING btree (admission_id);


--
-- Name: sentence_adjustments_effective_date_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sentence_adjustments_effective_date_index ON public.sentence_adjustments USING btree (effective_date);


--
-- Name: session_attendance_admission_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX session_attendance_admission_id_index ON public.session_attendance USING btree (admission_id);


--
-- Name: session_attendance_inmate_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX session_attendance_inmate_id_index ON public.session_attendance USING btree (inmate_id);


--
-- Name: session_attendance_session_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX session_attendance_session_id_index ON public.session_attendance USING btree (session_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: visit_item_flag_reviews_status_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_item_flag_reviews_status_created_at_index ON public.visit_item_flag_reviews USING btree (status, created_at);


--
-- Name: visit_session_events_event_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_session_events_event_type_index ON public.visit_session_events USING btree (event_type);


--
-- Name: visit_session_events_visit_session_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_session_events_visit_session_id_created_at_index ON public.visit_session_events USING btree (visit_session_id, created_at);


--
-- Name: visit_sessions_checked_in_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_sessions_checked_in_at_index ON public.visit_sessions USING btree (checked_in_at);


--
-- Name: visit_sessions_expected_checkout_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_sessions_expected_checkout_at_index ON public.visit_sessions USING btree (expected_checkout_at);


--
-- Name: visit_sessions_inmate_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_sessions_inmate_id_status_index ON public.visit_sessions USING btree (inmate_id, status);


--
-- Name: visitation_notifications_recipient_role_is_read_created_at_inde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitation_notifications_recipient_role_is_read_created_at_inde ON public.visitation_notifications USING btree (recipient_role, is_read, created_at);


--
-- Name: visitation_notifications_user_id_is_read_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitation_notifications_user_id_is_read_created_at_index ON public.visitation_notifications USING btree (user_id, is_read, created_at);


--
-- Name: visitor_inmate_relationships_inmate_id_relationship_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitor_inmate_relationships_inmate_id_relationship_type_index ON public.visitor_inmate_relationships USING btree (inmate_id, relationship_type);


--
-- Name: release_workflow trigger_check_gatekeeper; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_gatekeeper BEFORE UPDATE ON public.release_workflow FOR EACH ROW WHEN ((new.confirmed_by IS DISTINCT FROM old.confirmed_by)) EXECUTE FUNCTION public.check_gatekeeper_role();


--
-- Name: release_workflow trigger_finalize_release; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_finalize_release AFTER UPDATE ON public.release_workflow FOR EACH ROW WHEN ((((new.status)::text = 'confirmed'::text) AND ((old.status)::text <> 'confirmed'::text))) EXECUTE FUNCTION public.finalize_release();


--
-- Name: release_workflow trigger_prevent_double_confirmation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_prevent_double_confirmation BEFORE UPDATE ON public.release_workflow FOR EACH ROW WHEN ((((old.status)::text = 'confirmed'::text) AND ((new.status)::text = 'confirmed'::text))) EXECUTE FUNCTION public.prevent_double_confirmation();


--
-- Name: sentence_adjustments trigger_recalc_release_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_recalc_release_date AFTER INSERT OR DELETE OR UPDATE ON public.sentence_adjustments FOR EACH ROW EXECUTE FUNCTION public.recalc_projected_release_date();


--
-- Name: activities activities_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.activity_categories(id) ON DELETE SET NULL;


--
-- Name: activities activities_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activities activities_modified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_modified_by_foreign FOREIGN KEY (modified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activity_assignment_logs activity_assignment_logs_assigned_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_assignment_logs
    ADD CONSTRAINT activity_assignment_logs_assigned_by_foreign FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: activity_assignment_logs activity_assignment_logs_inmate_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_assignment_logs
    ADD CONSTRAINT activity_assignment_logs_inmate_activity_id_foreign FOREIGN KEY (inmate_activity_id) REFERENCES public.inmate_activities(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activity_rotation_queues activity_rotation_queues_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_rotation_queues
    ADD CONSTRAINT activity_rotation_queues_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_rotation_queues activity_rotation_queues_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_rotation_queues
    ADD CONSTRAINT activity_rotation_queues_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: activity_rotation_queues activity_rotation_queues_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_rotation_queues
    ADD CONSTRAINT activity_rotation_queues_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: activity_sessions activity_sessions_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE RESTRICT;


--
-- Name: activity_sessions activity_sessions_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: activity_sessions activity_sessions_supervising_officer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_sessions
    ADD CONSTRAINT activity_sessions_supervising_officer_id_foreign FOREIGN KEY (supervising_officer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: admissions admissions_admitted_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_admitted_by_foreign FOREIGN KEY (admitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: admissions admissions_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cell_allocations cell_allocations_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: cell_allocations cell_allocations_cell_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_cell_id_foreign FOREIGN KEY (cell_id) REFERENCES public.cells(id) ON DELETE RESTRICT;


--
-- Name: cell_allocations cell_allocations_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cell_allocations
    ADD CONSTRAINT cell_allocations_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: charity_bookings charity_bookings_approved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charity_bookings
    ADD CONSTRAINT charity_bookings_approved_by_foreign FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: charity_bookings charity_bookings_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charity_bookings
    ADD CONSTRAINT charity_bookings_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: charity_bookings charity_bookings_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charity_bookings
    ADD CONSTRAINT charity_bookings_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE SET NULL;


--
-- Name: charity_bookings charity_bookings_rejected_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charity_bookings
    ADD CONSTRAINT charity_bookings_rejected_by_foreign FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: charity_bookings charity_bookings_visit_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charity_bookings
    ADD CONSTRAINT charity_bookings_visit_session_id_foreign FOREIGN KEY (visit_session_id) REFERENCES public.visit_sessions(id) ON DELETE SET NULL;


--
-- Name: documents documents_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: documents documents_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: external_activity_details external_activity_details_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_activity_details
    ADD CONSTRAINT external_activity_details_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: inmate_activities inmate_activities_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: inmate_activities inmate_activities_assigned_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_assigned_by_foreign FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: inmate_activities inmate_activities_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inmate_activities
    ADD CONSTRAINT inmate_activities_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: officer_duty_rosters officer_duty_rosters_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT officer_duty_rosters_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: officer_duty_rosters officer_duty_rosters_officer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.officer_duty_rosters
    ADD CONSTRAINT officer_duty_rosters_officer_id_foreign FOREIGN KEY (officer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: release_clearance_checklist_items release_clearance_checklist_items_clearance_checklist_id_foreig; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklist_items
    ADD CONSTRAINT release_clearance_checklist_items_clearance_checklist_id_foreig FOREIGN KEY (clearance_checklist_id) REFERENCES public.release_clearance_checklists(id) ON DELETE CASCADE;


--
-- Name: release_clearance_checklist_items release_clearance_checklist_items_cleared_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklist_items
    ADD CONSTRAINT release_clearance_checklist_items_cleared_by_foreign FOREIGN KEY (cleared_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: release_clearance_checklists release_clearance_checklists_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklists
    ADD CONSTRAINT release_clearance_checklists_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: release_clearance_checklists release_clearance_checklists_completed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklists
    ADD CONSTRAINT release_clearance_checklists_completed_by_foreign FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: release_clearance_checklists release_clearance_checklists_initiated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklists
    ADD CONSTRAINT release_clearance_checklists_initiated_by_foreign FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: release_clearance_checklists release_clearance_checklists_release_workflow_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_clearance_checklists
    ADD CONSTRAINT release_clearance_checklists_release_workflow_id_foreign FOREIGN KEY (release_workflow_id) REFERENCES public.release_workflow(id) ON DELETE CASCADE;


--
-- Name: release_workflow release_workflow_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_workflow
    ADD CONSTRAINT release_workflow_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: release_workflow release_workflow_approved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_workflow
    ADD CONSTRAINT release_workflow_approved_by_foreign FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: release_workflow release_workflow_cancelled_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_workflow
    ADD CONSTRAINT release_workflow_cancelled_by_foreign FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: release_workflow release_workflow_confirmed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_workflow
    ADD CONSTRAINT release_workflow_confirmed_by_foreign FOREIGN KEY (confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sentence_adjustments sentence_adjustments_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustments
    ADD CONSTRAINT sentence_adjustments_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: sentence_adjustments sentence_adjustments_approved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sentence_adjustments
    ADD CONSTRAINT sentence_adjustments_approved_by_foreign FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_admission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_admission_id_foreign FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: session_attendance session_attendance_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_session_id_foreign FOREIGN KEY (session_id) REFERENCES public.activity_sessions(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: visit_item_flag_reviews visit_item_flag_reviews_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_item_flag_reviews
    ADD CONSTRAINT visit_item_flag_reviews_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: visit_item_flag_reviews visit_item_flag_reviews_reviewed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_item_flag_reviews
    ADD CONSTRAINT visit_item_flag_reviews_reviewed_by_foreign FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: visit_item_flag_reviews visit_item_flag_reviews_visit_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_item_flag_reviews
    ADD CONSTRAINT visit_item_flag_reviews_visit_item_id_foreign FOREIGN KEY (visit_item_id) REFERENCES public.visit_items(id) ON DELETE CASCADE;


--
-- Name: visit_item_flag_reviews visit_item_flag_reviews_visit_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_item_flag_reviews
    ADD CONSTRAINT visit_item_flag_reviews_visit_session_id_foreign FOREIGN KEY (visit_session_id) REFERENCES public.visit_sessions(id) ON DELETE CASCADE;


--
-- Name: visit_items visit_items_visit_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_items
    ADD CONSTRAINT visit_items_visit_session_id_foreign FOREIGN KEY (visit_session_id) REFERENCES public.visit_sessions(id) ON DELETE CASCADE;


--
-- Name: visit_session_events visit_session_events_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_session_events
    ADD CONSTRAINT visit_session_events_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: visit_session_events visit_session_events_visit_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_session_events
    ADD CONSTRAINT visit_session_events_visit_session_id_foreign FOREIGN KEY (visit_session_id) REFERENCES public.visit_sessions(id) ON DELETE CASCADE;


--
-- Name: visit_sessions visit_sessions_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_sessions
    ADD CONSTRAINT visit_sessions_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: visit_sessions visit_sessions_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_sessions
    ADD CONSTRAINT visit_sessions_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE SET NULL;


--
-- Name: visit_sessions visit_sessions_visitor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_sessions
    ADD CONSTRAINT visit_sessions_visitor_id_foreign FOREIGN KEY (visitor_id) REFERENCES public.visitors(id) ON DELETE CASCADE;


--
-- Name: visitation_notifications visitation_notifications_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitation_notifications
    ADD CONSTRAINT visitation_notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: visitation_rules visitation_rules_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitation_rules
    ADD CONSTRAINT visitation_rules_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: visitor_inmate_relationships visitor_inmate_relationships_approved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_inmate_relationships
    ADD CONSTRAINT visitor_inmate_relationships_approved_by_foreign FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: visitor_inmate_relationships visitor_inmate_relationships_inmate_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_inmate_relationships
    ADD CONSTRAINT visitor_inmate_relationships_inmate_id_foreign FOREIGN KEY (inmate_id) REFERENCES public.inmates(id) ON DELETE CASCADE;


--
-- Name: visitor_inmate_relationships visitor_inmate_relationships_visitor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_inmate_relationships
    ADD CONSTRAINT visitor_inmate_relationships_visitor_id_foreign FOREIGN KEY (visitor_id) REFERENCES public.visitors(id) ON DELETE CASCADE;


--
-- Name: visitors visitors_watchlisted_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_watchlisted_by_foreign FOREIGN KEY (watchlisted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict XrLQq8VOWwFXnLSiviguVjgugHEA4OBcJFQW44MV5Kqd4TijlSfx3R9B1IVgWex

