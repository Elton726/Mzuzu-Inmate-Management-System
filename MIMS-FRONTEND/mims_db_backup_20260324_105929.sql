--
-- PostgreSQL database dump
--

\restrict zKgsm6VEdHaAZsU6sbspWUjt4M0GkHFs3DCxr8uiLabbTn6X1YJFniaclMdfL37

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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    role character varying(255) DEFAULT 'reception_officer'::character varying NOT NULL
);


ALTER TABLE public.users OWNER TO prison_user;

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
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.cache (key, value, expiration) FROM stdin;
laravel-cache-rate_limit:user:52	a:3:{s:8:"attempts";i:1;s:16:"first_attempt_at";i:1773591550;s:13:"blocked_until";N;}	1773591610
laravel-cache-rate_limit:auth_ip:127.0.0.1	a:3:{s:8:"attempts";i:1;s:16:"first_attempt_at";i:1774258660;s:13:"blocked_until";N;}	1774258720
laravel-cache-rate_limit:user:63	a:3:{s:8:"attempts";i:2;s:16:"first_attempt_at";i:1774258863;s:13:"blocked_until";N;}	1774258923
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
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
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
ImZMsjkhulKmAudj5BQ4ERJj1X1qmFXABTq9ztba	\N	127.0.0.1	Symfony	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZnpFZzRIc3lPQkNSc3ZGU2J5YmZkN1NNSXRpNGtCeGlVWHJzZjVyYyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MjE6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1773591547
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: prison_user
--

COPY public.users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at, role) FROM stdin;
63	Administrator	admin@example.com	\N	$2y$12$NQe83Y9VvhJsqGeBWsEC2.EnOCe8c6Ad8LNiP5jP1mqrscvEVAzM2	\N	2026-03-23 09:35:06	2026-03-23 09:35:06	admin
64	Test User	test@example.com	2026-03-23 09:35:06	$2y$12$U6XJLeNB20q8svRUPq/pOu6rSJaaD/MDYhfBzfEkT2CtEcbSOHfa6	6cGqyw6HKR	2026-03-23 09:35:06	2026-03-23 09:35:06	officer_on_duty
65	Elton3	elton2@example.com	\N	$2y$12$ns2kIbiUATYMnNf4YfAg4O2E0srXj0nkJd4NuYECTHd/C5vft0/bO	\N	2026-03-23 09:41:03	2026-03-23 09:41:03	officer_on_duty
52	Jaren Hegmann	wilma.schultz@example.org	2026-03-15 16:19:10	$2y$12$Aa0SyJEhaoKMcqE40ZwS8eupReBfUq3/GClTQlqUxoKnUDs8oRjRy	tQBXUH4UW3	2026-03-15 16:19:10	2026-03-15 16:19:10	officer_on_duty
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 5, true);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: prison_user
--

SELECT pg_catalog.setval('public.users_id_seq', 65, true);


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
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


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
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: prison_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


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
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: prison_user
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict zKgsm6VEdHaAZsU6sbspWUjt4M0GkHFs3DCxr8uiLabbTn6X1YJFniaclMdfL37

