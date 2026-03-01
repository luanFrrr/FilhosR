--
-- PostgreSQL database dump
--

\restrict Ghunch6owW3QY1LNJ9JbgUisa2dHfdMBZ9bijrMtADbrE6Y3vr8FTI89Xu0ggbJ

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: caregivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.caregivers (
    id integer NOT NULL,
    child_id integer NOT NULL,
    user_id character varying NOT NULL,
    relationship text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.caregivers OWNER TO postgres;

--
-- Name: caregivers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.caregivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.caregivers_id_seq OWNER TO postgres;

--
-- Name: caregivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.caregivers_id_seq OWNED BY public.caregivers.id;


--
-- Name: children; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.children (
    id integer NOT NULL,
    name text NOT NULL,
    birth_date date NOT NULL,
    gender text NOT NULL,
    theme text DEFAULT 'neutral'::text,
    theme_color text,
    initial_weight numeric,
    initial_height numeric,
    initial_head_circumference numeric,
    photo_url text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.children OWNER TO postgres;

--
-- Name: children_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.children_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.children_id_seq OWNER TO postgres;

--
-- Name: children_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.children_id_seq OWNED BY public.children.id;


--
-- Name: daily_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_photos (
    id integer NOT NULL,
    child_id integer NOT NULL,
    date date NOT NULL,
    photo_url text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.daily_photos OWNER TO postgres;

--
-- Name: daily_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_photos_id_seq OWNER TO postgres;

--
-- Name: daily_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_photos_id_seq OWNED BY public.daily_photos.id;


--
-- Name: diary_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diary_entries (
    id integer NOT NULL,
    child_id integer NOT NULL,
    date date NOT NULL,
    content text,
    photo_urls text[],
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.diary_entries OWNER TO postgres;

--
-- Name: diary_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diary_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diary_entries_id_seq OWNER TO postgres;

--
-- Name: diary_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diary_entries_id_seq OWNED BY public.diary_entries.id;


--
-- Name: gamification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gamification (
    id integer NOT NULL,
    points integer DEFAULT 0,
    level text DEFAULT 'Iniciante'::text,
    achievements jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp without time zone DEFAULT now(),
    child_id integer NOT NULL
);


ALTER TABLE public.gamification OWNER TO postgres;

--
-- Name: gamification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gamification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gamification_id_seq OWNER TO postgres;

--
-- Name: gamification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gamification_id_seq OWNED BY public.gamification.id;


--
-- Name: growth_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.growth_records (
    id integer NOT NULL,
    child_id integer NOT NULL,
    date date NOT NULL,
    weight numeric,
    height numeric,
    head_circumference numeric,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.growth_records OWNER TO postgres;

--
-- Name: growth_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.growth_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.growth_records_id_seq OWNER TO postgres;

--
-- Name: growth_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.growth_records_id_seq OWNED BY public.growth_records.id;


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_records (
    id integer NOT NULL,
    child_id integer NOT NULL,
    date date NOT NULL,
    symptoms text NOT NULL,
    diagnosis text,
    medication text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.health_records OWNER TO postgres;

--
-- Name: health_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.health_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.health_records_id_seq OWNER TO postgres;

--
-- Name: health_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.health_records_id_seq OWNED BY public.health_records.id;


--
-- Name: invite_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invite_codes (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    child_id integer NOT NULL,
    created_by character varying NOT NULL,
    used_by character varying,
    relationship text DEFAULT 'caregiver'::text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invite_codes OWNER TO postgres;

--
-- Name: invite_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invite_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invite_codes_id_seq OWNER TO postgres;

--
-- Name: invite_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invite_codes_id_seq OWNED BY public.invite_codes.id;


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    id integer NOT NULL,
    child_id integer NOT NULL,
    date date NOT NULL,
    title text NOT NULL,
    description text,
    photo_url text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- Name: milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.milestones_id_seq OWNER TO postgres;

--
-- Name: milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.milestones_id_seq OWNED BY public.milestones.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.push_subscriptions_id_seq OWNER TO postgres;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sus_vaccines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sus_vaccines (
    id integer NOT NULL,
    name text NOT NULL,
    diseases_prevented text NOT NULL,
    recommended_doses text NOT NULL,
    age_range text
);


ALTER TABLE public.sus_vaccines OWNER TO postgres;

--
-- Name: sus_vaccines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sus_vaccines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sus_vaccines_id_seq OWNER TO postgres;

--
-- Name: sus_vaccines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sus_vaccines_id_seq OWNED BY public.sus_vaccines.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vaccine_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vaccine_records (
    id integer NOT NULL,
    child_id integer NOT NULL,
    sus_vaccine_id integer NOT NULL,
    dose text NOT NULL,
    application_date date NOT NULL,
    application_place text,
    notes text,
    photo_urls text[],
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vaccine_records OWNER TO postgres;

--
-- Name: vaccine_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vaccine_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vaccine_records_id_seq OWNER TO postgres;

--
-- Name: vaccine_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vaccine_records_id_seq OWNED BY public.vaccine_records.id;


--
-- Name: vaccines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vaccines (
    id integer NOT NULL,
    child_id integer NOT NULL,
    name text NOT NULL,
    scheduled_date date NOT NULL,
    administered_date date,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vaccines OWNER TO postgres;

--
-- Name: vaccines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vaccines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vaccines_id_seq OWNER TO postgres;

--
-- Name: vaccines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vaccines_id_seq OWNED BY public.vaccines.id;


--
-- Name: caregivers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caregivers ALTER COLUMN id SET DEFAULT nextval('public.caregivers_id_seq'::regclass);


--
-- Name: children id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children ALTER COLUMN id SET DEFAULT nextval('public.children_id_seq'::regclass);


--
-- Name: daily_photos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_photos ALTER COLUMN id SET DEFAULT nextval('public.daily_photos_id_seq'::regclass);


--
-- Name: diary_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diary_entries ALTER COLUMN id SET DEFAULT nextval('public.diary_entries_id_seq'::regclass);


--
-- Name: gamification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gamification ALTER COLUMN id SET DEFAULT nextval('public.gamification_id_seq'::regclass);


--
-- Name: growth_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.growth_records ALTER COLUMN id SET DEFAULT nextval('public.growth_records_id_seq'::regclass);


--
-- Name: health_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_records ALTER COLUMN id SET DEFAULT nextval('public.health_records_id_seq'::regclass);


--
-- Name: invite_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_codes ALTER COLUMN id SET DEFAULT nextval('public.invite_codes_id_seq'::regclass);


--
-- Name: milestones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones ALTER COLUMN id SET DEFAULT nextval('public.milestones_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: sus_vaccines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sus_vaccines ALTER COLUMN id SET DEFAULT nextval('public.sus_vaccines_id_seq'::regclass);


--
-- Name: vaccine_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_records ALTER COLUMN id SET DEFAULT nextval('public.vaccine_records_id_seq'::regclass);


--
-- Name: vaccines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccines ALTER COLUMN id SET DEFAULT nextval('public.vaccines_id_seq'::regclass);


--
-- Data for Name: caregivers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.caregivers (id, child_id, user_id, relationship, role, created_at) FROM stdin;
8	23	test-user-edit-marco	parent	owner	2026-02-27 16:31:22.963807
9	24	test-photo-picker-user	parent	owner	2026-02-27 18:43:45.815044
11	26	test-diary-edit-user	parent	owner	2026-02-27 19:09:01.30222
12	27	test-diary-crud-v2	parent	owner	2026-02-27 19:11:36.9203
13	28	20233503	parent	owner	2026-02-28 16:16:16.016491
\.


--
-- Data for Name: children; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.children (id, name, birth_date, gender, theme, theme_color, initial_weight, initial_height, initial_head_circumference, photo_url, created_at) FROM stdin;
23	TestChild_Edit	2025-06-15	male	neutral	\N	\N	\N	\N	\N	2026-02-27 16:31:22.959923
24	TestChild_Photos	2025-03-15	female	neutral	\N	\N	\N	\N	\N	2026-02-27 18:43:45.811212
26	TestChild_Diary	2025-05-10	female	neutral	\N	\N	\N	\N	\N	2026-02-27 19:09:01.295985
27	TestChild_Diary2	2025-05-10	female	neutral	\N	\N	\N	\N	\N	2026-02-27 19:11:36.914792
28	Luan Ferreira Rosas	2026-02-28	unspecified	neutral	\N	\N	\N	\N	\N	2026-02-28 16:16:16.010172
15	Luan 	2026-01-23	male	pink	\N	4	35	35	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAN5AZADASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAAAwQBAgUABgcI/8QAOBAAAQQCAgEEAgEDAgUCBwEAAQACAxEEIRIxBRMiQVEGYTIUcYEjQhUzUpGhBzQWJENicoKxwf/EABkBAAMBAQEAAAAAAAAAAAAAAAABAgMEBf/EACMRAQEBAQADAQADAQEBAQEAAAABAhEDEiExBBNBUTIUInH/2gAMAwEAAhEDEQA/AG1ylcuB1IClSFyA4LlIUoCo7XKy5A6gKVy5A65SFAVggdQpXLkDriuC5SEDrgpXLkE5cuXIDlPwuXIDqXALlyAmlHyuXBASFCkrkBCkLlyA5cuXIJylQpQErlClAcuXLggOXLgu+UBylSFFIDlykLkBClSFKAil1KVyAqpClcnwEF1LgpSU4Lly5ASFKgKUBy5cuCCdS4KVyAkLly5AcuXKaQEKQupcgJXKFKA5cuXICVyi11oCV1KAVNoDqUhda5AcVy5daA5dai1yAlcuC5BOUhQuQEqVy5AcuC5cgOU/KhSgJCnSqpCAldS4KUBAUrlyA5dSkLkBFLlK5MEAuXBckblKhSEBK5cuQHUpAXLggJpQpXFAcppQpCA6lK5cgOUFSuJCAgBWr9qnIKOYtHYF1yjRCoXBvaAIoKp6rf8AqCq6RtfzCOgRpsq2r2UhLkBv8XBD/wCJCP8AlRQGn8qyzG+Ujf2QFb/iMQ2HBH0NFVSTfJwn+TgjDLiePa9v/dAHtcSAhNnZ/wBQVm73ohAEBCkmkEScSeQRGFrm2ClaFrUKF1pyhe11qtrrQSylVBXEoCylVBUhASpC4LggJClQFKA5dSkLkBy5cuQE0upcuTDPCmlwUpGilylcgOXLlyAlcuXICQuK4KUBAUqQFVw2gLWF3+UMlDdOG9oBg6GlQkUlXZ0bQbKRn8tC0m3IDTlPt04LNmyXxG7BCysrzuKL5S8T8bWDm/kMQJ4TWP7o50PWHzbYhTyAUGXz8Dh3/wCV89zfMRykn1NrIn8qWHT1cyH1B3lmP2x1D+6SyfLsa008g/3XzMeblidYeSFWbzb5RQBT9EvcT+ak5H05d/tITeUzCb9QELxv/EHO7JCofIytOpETAerf+QZcWq/8If8A8S5IO15oeSef57Cg5zCds/yn6h6yLz00vf8A/UzD5qdmw81/deKE7D/FxaiR5T4jbX8mo9eh7j/4llHUnE/tP4n5jkQAcwJG/peAHkYpBxfGB+1V7q90E/8A+to9A+s4/wCZY0wDZPaT9rQi81GRyjcC0/tfGcfNjJ45Ao/DkZ/kJsdwGPOXM+rU3Afb8PyTJqpwWgx4d8r4Zh+fyIHBzZDf1a9N4z83c2hOFPqH08G+lK8vgflOLONPC2YfIQyttrgUjaI2uS7JmnoojXgIA1ilwKqKU2gLgqQqBXCAkKVAUhASuXFcEB3yppd8rkBNLlK5MM4KVClI3LguXBASuXLkBy5cuQHBSSqrkBNlc46/aG+UNNJWfN4g0LS6DTnit6SeTkxNB5EBYHlfNenduDV4vyn5E8uIL7Ccz049tn+VwoA4ukBr4Xmc/wDI8IXxFrxub5L1yeyFlyScjYVzIbvkPNRSuPptI/usiXyBddBJvJ+dqnz9K5E0R0z39oZJ+SuIPwuDCeymSvau1prSI2MN+VPIAoAfp/JUUOqRezdri9gHW0APgfhVMbjtXMt6AXcnWgKVXaiy3pF3WwuDE4OBBz79o2re/wCdK91oLrPZQOB08lXBcPlc6X9KvJp7QXFvUIKsJj9oftPSg6QDsGdJCba4/wDdbvjvyTIiLRyP/deUqxpSxxadHaLkdfXPE/ljXta2V1Felx/OROaObhXwvg0c7w4EOorVxPMTRkNe818LO4V7PvGJ5KGXTHC0+xwd0V8QxPPSwPDmOJC9p+PflsctMneA/wDam54Hv2X9q1pHEzIshgLHAkpu0gKOlIKpYpSEBZSFAVggJClQpQHLly4IDOK4LlwSNK4LlyAlcotcSgJAUE0uv6KWyOYshAHLwO0pkZjIxyLgAFleQz/6dpMjw0LxPm/yNha5rZL/ALFOToeo8v8Ak0WM13pkOcvEeW/LcybkI/a1edyfJmUmrv8AZWfLM+Q7KuYBvI8jkzuJllJ/ylZJXE98lVkbnfBR2Q04UE+yKmaXLXHf/hcGEp10J0Shy+z42jo5SxjrtULbKOetnZUBtbTlKxRjKG1z3NauldvSEByO0yWJL+lwHH+Sgnj/ABUUXdoDnO+lAFq4YKXNYS6hoICB+lPQ/aJwoqCRdEWgJAsKrjxC6R9D2oDiT2mVrjJtVMhPSsG38IgjAFoLtCDSe1Iar0PsKfag1a+ApDa7VrAGgrNcD2EBVraUFiLYXCjpLo5AS36Khpc07RnNVCPhHS9RIZiOimoshzXhzXFpWfXE2FdrrFk7R+lyve/j35I+JzWF5NL6N4vzsWQwCRwBXwCDIdDJyYV6Xx3mdAciD92p1j/glfdseZsrLaQQjhfN/wAc/JmxSMilJLT82vd4ubFMwOY8FRfimgFYFDY7ky1a+kgsuU1ShAWXBcuHaAz1y5ckbly74VQ77CAvelTlXaq59X8LM8j5NmLGS4hAaEs8bNveGheV/IvyvGwmvbG8Od+l5L8l/JJX8mxSUF4fJyXzPLnuJP7VTPTrV815/Lz53EvIjPwsN5c9+ySFx7RYoC5ackiZ+hiN1+0JmLGLqtFihcTQPSbiZZpo6+VN00mAuAY2mjaOyMQs5O2VPtY7QsrpncIt7eoaycAc4vtx0B8JV4Mj+R+Ed45Vfah4a0AntOJ0Ve23EqjjxRtW5xSsh5HXSqM6q48iuGlS90FbatEqdfK6z0ApbZNDaM1oZ/KrS6fERxE7KsQANLi/4CGdXZR0cSbDe0Jxoftc8k0o6sntOFVAD2ocSOla/j5XAEpkHbjoK/B5GyrFwA/aoXE/KAt6XHsqpb9KNqRaDcBZ7Vwwf9SitWuolAFaB9ooAAsJdrXIzRQ/aQWbR7VjE0qoKsHAHahUDfFXSC5ha7pOcmlc9oPxpOUWFHgcVWJ7o3aR3tvSXljIKuXqLnjTx81wog7C9z+NfkRiaGvcvmDXFrhS1MLKDG7JtK56T7/4nyrMmFp5BbMcgk6K+H+D89NAKDvavof475tuVQuj8rO54fXsx0uQ4ZWvaCCiX/2Ujqy4dqFKAz1y5RddpKc7pULiBpX1RKxvM+ahwIXEuHJM1/KZIx4XSSOoUvl35N+Res50cL7QPyb8kn8g9zGEhn915ORx532VUyV+LTzOkdtDa0uNKzW8tlMQRcyAFf4UlVgh5GimwyhxHaP6IjaL7RocfnsLO6bZx0OCIkAD+XynDCGRgAf5TWPj8W9IWSQ32N2Ss7rrWThUtbGLGylTyc63LSjxbbT/AJUSwjlz/wClHsfGa9hANpOU8jVprOlL7IWe4312tZOsdVErqHFqWNiwiO1/dVDCXWq4zv1DG0P2itjLlfiGtv5Vb5n6TTxdtM/hsqHAu/l/JQ53wFNlrUlOkpjP2giz2rljn7rSsGAICjQudGXb+kUC1JaGjafS4BQvl9KriSikl2joIVEv10n0uKFo/wAqwbpSfaaC4tLkxxT5V2tVuAA2paLFBLp8RVmlbhSkNIC5t3tHRxw0FAtWJrpc3l2l0+IAJVmss7RANbRAKqlNORVse0XhQUjWyp523SSuBliBJET2mLKq5peiXhXPWdKzidKlua4Jx8YtAkaAtJWWpw1i5nAgXS9h4XynomMxd/K+fk0tbxfkjCWtpFiOvu/495E5UYJ+l6KKQPbS+Xfi3nBHE1rtD5K9z47yDchtxnSxqo3VKFG6wrgoMgdjtRoDu1BcANrK815RmJCeP8qSUD5/zDMLGdTgHL5H5vzM2bK7k48bTf5H5KfKkcXuIbel5eR3L5V5nwOlcSNFCYwg2SrE8kaOMuFKx+ohYZHcQFr4uMGD9qMSANHW1q4sHFhJG/hZ603zgkccveL6T+PDwIFaKYixgxwrbinoIGxvt/axum0yWyGiGD9lJ4uKXXJIP7Wn5wZp+vaF07uLOIFApdVwk8838W9hKZ7hFAbNOPYWoyIMYflxXnfMSepO5jTpVn6jfxmyvJd1r4VXMDBfyUWNmrd0EN1myevhdEctA4e63aU19DSkNdIf0FLzxbXymVCcbNWuawlSxvyVcGigktia0W47UEgnfS7iXFHbCOO1PV8CDjVNGlHA9lEcxnV7Uht0D0jo4o0V1tUlr/caP0ik0eLRtScYgcn9o6fqWHvFAKxaAym7KMGbpgVnM4CijpepVsYU0AUUs1YXekALKfS9S5BJV2gNG1cssilL2BvZR0cDLvpUBdaISa0NKzG8u0dHFGMs9o7G0uaKcVYfKXVOcNKGmlLtmlUD3bS6FzvtSwf9gusKbpI0mqUDrpSNiiuBQAXsN2lpWWnXHSA8KpUWM97FDDwcCEeRqCQtf8Y2crd8Z5X0xwOr+V7X8Q8y92SIWu5NtfLIyWOteq/Cs5sOdyeVFyfX3vDe4jacBXnPD+RblAOa4LdElgLI2dLppJNBeJ/JMqNgeXuuugvT+Xy2wQus/C+TfkPkXZE8gPQ6Sz9UxfJZRmlJH8b6SQBOwrn3G6RI2EmqW/yQlI2EnQWliY7u6tUx4Kdtbfj8ff6Wd01zkXBxS6uQWm6EMAoWUzh45aRYTnotLxYXPdV1SE8aERt5O/melR4c51V7inpG6LjqkOMbLyFKy7Y+Iod/KG2ITSk/7R0m3D3Et+VdjGwR/vtAZ/lC2DG5NFPXk3xhvJ7tkr0nlX+qwl+lgSsLjrpb4y5/Joo9vsr4KB6Ze8Dpqfkja4AOND7Sk04jtsY5H7WrnpeciM01BDTIbTDYJJHFzx2mY8YM/ul05npNsZA62rshJOxS0GxVshWLQ7oJey5gn6TWDaFxc91MGk+IP+vaIyMAewUp6qZJsxWNHJ+yrekD8Um/TvRCh7C3pK6VMl2xMYLP8kN9u72jlt9ja7gRukewuQPTIbbQgvbu3JiSRrfnaXIdI690n1NivHloaUujJFAJhkdEIrW0i0epIxcWg1tB9MudvpaDonPKszFIFlT7U/Ugxm6A0FfiAetfadbDxJ+igSR07i3pVNJ9So28qzDbTpWLOLlAu6+0+l9cRTgVWTskIr+wFQsJKOnYpR0VcHpcGkilDBukEse7XfKsdKHD5CAq8UEJ5tqN/JpCA/QKcKgSiwEAhMSH2hAcdLSVlqAu7TGLMYHcmoBUtKpFe2/GvyF0UzAXnjf2vsHiM6PKxWFjwSV+boXmN9t0vYfi/wCSTYUrGPceKz3mT8Pr0v5h5QEmNjtL53lyGWQ0Vq+dzPWynhpsWsuKO7clmLBjZ99p/Gh+xtdjwWeRWnjRBzwKRarM+rYOIZXg112vT4mCGxXx/sqeIw7IIHa3mx24Afxb2ubenXjJaKHibI0pLRsn/CakY4j9KpYH1Xws+tJCT2F593SrIzQDB/dOywlrb+EM/wAKaE4fChjDBbf5FBmpjeUxr6TUrgwf/cs3MjfkOJcb/SvM+o1+MjNdJkykDTB8pCf/AEuhYWlkytiHCPbvpIjGmndZBAW/eRzanazJy6XTTV/CmDEPTW7/AGtyLxjzREVj7pMNxuBoQm1N2rPj6yocMtFvNf4VhAC+mAlbQhNAOAZ/f5V2QsbdUT+lndtJjjG/prJDjRU/0QGr2thmMH747CIzDe53IM0pumkwxRhuYN7RY8XXu0Fqux5GHYVDGOWx/hT7LuGVNGGaaLQTC0DkRtassdnTdJWRgbfyVXUXLO4DlYaQVWWm2XDZTDy//p0gOZLK7iG6HynKmwkWBxNN2pa34ATn9IWnm40rNiJ6CfU8KiJ3+FZsJJTgx3/4RY4CFN0qZAZDQ2quabI+E1LxY33d/CXPNzbrSJR6gvrhxCXcwMbpOCK1SSL4KqUuEPSvvtUczj32nyzi2vlCERJ2q6i5JltvFhSR7k3JGAz9oEUZJspylwItI7VSOLhSalYEu8e4BUmxV4sqBfSu4UVUJdKOa0g6QZmplrtqsrOQtVKVjNff+EI2m5W0CliLBK0n4iwE9lVB2rO0qO0FbKxYHVI8TyCKOwlSVZrj8I51ErbPKR1n5TsUHBosdoWFHzeD8LXEYeWgLO10Zn0BkVNFLV8Xjl8gFKjIKGgt/wARi8Yw94r6WWtfG2c/T+LD6YaxvZ7WiyI1VaC7Dgr3uCaJ/wBrRYPZXNa6ZChjMjtCmBEZByFAU0JsQkj6agZPL+LTxH/9QfCWW8OeGN/iO0u4uceMbfampI691f4+1aPElyOh6bflEvBZ1j5JDTQ9z0AYeTkac0gH4XrcXxDAf48j/wBRWnH46OIbIJ+1XuUw8Zjfjwq3Cj+06zw4Z/AD/svUGFoP2FZsIPTaSu1TPHno/FM1z7+kYeOib00L0LcQHYG0GWDiou1SPPzeOYRtv/hKO8Ywbr/wvRPaQDRH/ZKzCStV/wBlPsuZYbsJjBycdfSA4Muo2krXfBzNvXMgjZ0P/COn6sR+K6T+RoKRiwtFOIJWzJCK6ScmLGTZJS6XGTNEwXQpJPiaCeILv8LcdigfxFj9oJxy34Cc1wevWC/GJ3xVBjkf7Vvhm9hVc0A/xT9y9GC6H7BVDE34atx7Gn/agvgY7ppR7dHpxlBhA2BSo8HpoWk/F/uqHEdXaqaTcsswkbOyuZjukNnS0DBwOzdq7YjVnSPYvVnyQuH1SEcfn2VpvjBFA2h+mG9hHsXqzzj1pVfFxbrtaHpmtjao6MnsJyl6sx8PIbS8kfDpab2GyEq+OnUflVKm5J+mXbQpGURpaBjLfjSFKy6pXKzsISN2qObaakFHaWJrtXGdnAvmkRvVKj/sLo3C0yBmZTrSbx7ytGUWk8htbCvNZ6hN44uKE9MTAkAhAk03a2zWOoGXKfhDK4OT4h7XBj4tatzDg5EEhIYcfIN10vQYUdR3W1z6rrxlDIh6zRWl6DAg9RwA/iFl4sJfMD8n4Xq8PH9OIEDa5tadOYuGhjAEeGABvJwUwxFzgT19JqRtkAdLPrXnSWQdUBR+kOLGdIQZNLQhxy93JwspyKIf7hZ+EGQhweX+3SY/p2soa/wnCHAUNBQyEAknZQA42EarSKWMHbbRWNPVKeAbs9pKhV8YP8Y1ZkZrekZ2+jSir1RQYRsDTlRzOQ2mBCP7KHt467U04SkiAGkuWE9hPSChpL8L/SlRR0W+gqmIfQTZZuu1UxJBnPiP0l5IzR9trVdGftLvbukKZUkTv+ikB0Y+RS0ponE96SsrOI0UdHCbowOlTgSd0mQN+4K5a2tNQCT4wPpBdXwE89n6VDG36QOEC2xsIUjPgJ+Rv0EAtF9J9LhL0fvagw/Z0nSPgBVLPtPpcJmJg6slDMJPSdLa+NKj2Ai7pHS4Tczj2hOYf8Jwt3tUkj0VUpWMxzNlAdHbrT7mUUF7NEqpU2EZAelUsHFHe030qvZSuVnYzshnaQkC1pgDaQmitaYrHcKapUHtcpeC19HpWoELRksac1AlZYKMzYIUPGkf6VZ0raFJSUWFoyjZSkopa5rKwk4KiLIEI6W8YX4+o4EQDgD0tvHYeN110s3BiL3gL0bIeIY1o/uuDdejifBvGY5MjX12vURssAUkfHQhpbra127dTe/lYVtmJhZxBNaUsYbNhFAscR0ESNhcP2pq5VWC9N0jBvH+6u1gGyNqzxZHEJhDIy/tWMXGvlEIportWbZQIHwICjjy7Ri3kaU+nxbQRwy5YAoOugmBGD2VxYK0lYZY72ShvKO+MX+1VzQApsOFS1VLBSI4C9ITzqlK4GWVsKOBd2rNBVqQC0rT8JZ7O0+4j6QJhopHGdKHdJd0dnadkQHNH2pVADE1DLN0jkV/uUUK2dpmA6P9IL2Jwg/aG8BBEuItCcwWmZG0bCENnpAA4Uqlod32jutCc0naBwIstCdGCUz0P2guG1UqbCzhtUejuq0J4VSpsKvaLQJBV0mHjaE/SfS4VkGggydlMSD9ID+lUqLCczbSTwVoOCWmbvS0zWWozMhiG0EBOSi3UgFpWsrKwBpolEFEKOABK6k+/U8Ambbik52J+X5S8jQ5t/KuVnYy5Ql39pydtJJ/a6Mubcfa/ExXIF6vHxwWtJWX4DGbJEHV8r0cMYFBedvT08T4Ljs9M8im8cW4uQGVu/hPwtaIuR7Ky61kXi1d9o8TflCij2CmWiygcWaCSiMFgqGtN/pFaBYAT4FeNOFq4G9BWA2praCQWkbpceR6bpXumqrDs7TNQsPyFXQRCWkbKl3HpBgOaP5IEoBTZ49faVl0ddKaqUsaF0gOG0d9XpUc6h0osVKERpSwEqvKyuIpJS0gHwk5zdgJon2oDxs2lwSkpGlAeK2UzMKOigPtSqAOF7pRf6Vn+3YVQ4nZR03cv0hSCiiWL2uLrTBaQWEDhR7TbztAcwWguAPH0h2QmDQ0hPYjhl3HaikRwoISZBvq9IEiZcECQWE4mlnAIBqymJG0EtIaVJUeAlZW9pjkhSmwqhWFHJeUWLTLu0vINK8stQk8WVSVlNtHc3RVHj2q5WdhVo7tVIRms7UOFKpU2FX9uQKsEJqVt7S5FK5WdhHKbQWXLorbnZyasjIFOK6cVzeSP0j4NgbjgAdrXDQCKSXjGhmO3WwtGNl7K8zV+vSzORdrLcK2nmgFgB1SBC3so7NhQoaK66RmNNIcQsJgNVQ0gVoG0Zum1Xao0btGFFUSGNVy0KRQC7r/ACglS0UhhlXaI4VtULrCDjgAAbah39rnuJ0FUhyDT3tBeaPSIXEBCkJIU04DI35CXd+yjvcT2lJO+1K4jQPe1BcqnSGXpKghcAaVJaUNDnOtdL1SRQu8Am6Q31XSK/SWkJUrgL6BVQ0EXa54JVACEjQW0elR4+R0iF1IT7O/hECDRFoB2dIv8jpDeRdBMBuoEqhcpLhsFDdoWmSru/0gSEXpELz3WkGR1nSAglBeSiEoT1RUGQ6Sz+jaNIUJ2wmkuUFxRnILuyqiaC/tAkukw7tBkCqI0UPW1V3SM4IZ2VUqLAiKCG9MPHVIEg2qlKwFw/WkF7QmnDSA4KpWdhKXTSsfKHuK25m6WRmN2V0eOuXyx+m8MD06T8YtoSOGQSa6C0Yqpedp6MEHtAA3aZiHtS47TMbtJRQsftaLTDbJA+PtCjby7R29a6VQCtA4qRoFQ3ZVnbTQ4LidKzXClBIRAqN9lQ4jpVe6kIm+01RHT9G1Ln/tVdTdoJvkl0+LPsntRdBdyCo5I1H7u0BzQjuIpKyk/CmqgUvSVN2ikmzaE80pXB4bA2VWRxJOlVp1fyuDuXekEG4aQXNCOd/KA8bKVhl5NIZNC0VwQpBpJShIKE+7/SsUJ5daIEPsIMpoWCpe4/KC82mA3O/7qln5OlxIsob3lIlyfgdIEl3pSHVaGDbrTCTdITkR1oLzrtUQUgtBeeOvtFeUCQqipeU0UIlGfvaE7pOIoZ2hyFXJVD0mmgu6VQ0Dau4bVSE4mwJ/aE8JhwsID1UKhOFhLu+Uy4CqS7xRVdZ0tKFlZgu1ryjSy8z5W/ic/m/H6OweyB8hacPSycF/FxC1cc8guDTukMstMsS40AjMclDptmhvpMMdbaCVYf8AsjA10rgHaQFa9UEBpV7pMuLElc0k9lV5Kr3VSAmSgEBzrFKz3traC5wN10laqRL3a0qOcEIv91KAUuqXvahzihl/upW7CXQq9xA0l5CSEw/pLvOkhAPu0E1atKaQXHSlcXb3pXcdbQWGlcmwmFSPkIZ+VcuoIMhPwigN7qQHOsbRJDTdpV7rbpSqOJFqr3IYdelzukQUGRxQXaRnDe0KSkwA6u/lCJ3tWkI+EJxTTalx+Fx60qkjgFQk0qkLqziKQHnSl7kFzkjQ4oMhsKzzaE7oqiqnwhlXtDKcRVSAhvCuVDkwCRpVKI4aQ3JwqGTooTgER3SE46VRNgTuylpdlMOS8ipnYFMRSycw7K1JSKWXmVtb+Jy+b8fozFbeQVpYzuT+P0k8YU5zimsEgucVwO+HxrSNGAAgDdFEadpRRmMo16S7P10jbpVE1cG+wiNcOq0hsbfZROIHzpOQuoca6VCSe0Qj6Q5OlXB0KQoD5N0jkWErI2ibU2KlVO1VziFx/So9/wBqbFdWBPaI038pN8rq0ujkN7KQOPdrSVkd9olgj+SE6h2mZaWiUtKeKalo7CUlKS8VLXEorbOkq19OpMNfr9pFVXmyQhEgO2rvIG7S73gFBxSR4JISshq6RXO9xKXleEjUYbcmK0lWO9+k38IIvJraUlIJKcmGis+b22gdBkItAf8AYUPJJKGXkKpCEab7UPdelQPCrfu2qT1DzQQi9c8koRKOBL3ITnKXOQpCTVI4TiVV5XHpVd0mTvhVcaXHpVeQgIuwqFtqAdrrITINw2hPCOUGROFQCl5No7+ku7tXGVLS6Wbk7JT8xNpKYdroxXN5I/SGOOTCB8pzEZVj5QfGsJNn4Tzm8TYC4HdE8qFIkVkqgbeymI2hIUVg2mGjSpGAG0jAWqiasAuVr0hOeFpIXUuNKpNhV5cugpaKB5EJ8LqhOkF7QdlHL2AbKXkdZ9oS4cocgoaCXdZOwmgCRtAe0hLipQHNFoD3cXI72kutAewuOlFi5YJHIrEcglWB3OloBn+nvtLl4LScooJCZ1ErRnBAKy8gG7pKxWaC2Q+qmmuJWcySptp5klmvj7SVV3jSVl7TTz7Uo7tAgEiWldQ2m3VtIZTwLSUnGcHSUtFzBwWV41wdOtgD2bTidUjP+lnzuNm1pZBAJ+CsmZ1uO0yJySe5DsKkpJkP0hucR0q4VojnUUJ8qqeu0I7KqJtWLiVQkjakdbU0XN6RwdDO1ZotFbHrYVxEK0aQOlXCkMhNOj32gvbRSHQuI+0N4RiFR1IKgVS5XNKjimFX9ID0UuQZCnIVAf2gP7RnlAedq4ypOf8AklZh8pqX+aWyOlvhz+SP0/gsodJtzNKcdlRikR7bFfK4XbAQBSIxRGyiQdolBuuygUZlUiB7W9pDJyY8ZnKZ4YP2e1h5n5DFf+k8f2+1pMs7p6SXLjb0dJKfyMLT3YXkpvL5c59nCNn/AOSXf5IxH3Pt32NrSRFr2P8AxIkeyg1Df5JgO3WfleP/AOJOkNMeSfrpCflTNBLpKH0U+F17VmY2V3sITYcCLLha+eReTfCOZIr+6I38nDTR5f3AS9TlfQmyMH8iulLXDRXhIfyTmaADv/yNLTx/Nh2jxH/7IsV1uuPE32pDmtF0sxueHkGwR/dSco8gG9KLFStCMNdJypNO4lZUeTwNnr5Vv6+Mk7oJDpnKDRdLBzpOJNFNZOaw3xNrDz8m/lRW/jirpbeCFowHkwfawGSe8C16Dxw5BpKmRehXAhu0B7rITORY+Ei40lYUDe6rWXmPtPTE7orLyjTjZRIpPiJKzaXpCb77XjvGy15NgvRK9cbIBVcZ6KZjdE/Kx57BK2st2t9rLnj5HpEg6y3tJJpCcwgbWoIQB/Hag4vLZV8RdMdrXWVxida0zjhrjar6QvtVInrPbESaKMI+I0EdzBe1DnV0lyn2KVpVdQCs9449pWaUAdo5Suo5/faHIgPmH2qCe+yj1omoK46Q3AKHPBVS6+inMn7IIQ3dK6o+0rC6A80hONlGcPtCLVUKhOCXeNpl/SWcqiaWmb7rSs4sFOvGtpScU0rTN+sNT4/V8LaYFLoyNosLNKzmWFyOrpTYulTIkZDAZHHYR38W/wAvleV/I8qWZ3oRaH6TkK1k+e8gMuZzXkn6AKx44n8rfGQPhaMXjpI5uT4ib/3LTgwWvNtJv/7lrLxlZ158tPbiQF3oOmaQzjX9l6s+NBFODD/dVHjBHtjY7+7VexcePfhvYb5lh/QQ6nDqkIcz7K9rLjmqcxpCzp8GB7jyjop+w9Hm5oZC08OJafilnOicyQtktp/XS9BkYj4XkMNMSGVjl7CLv6KOn6lsaEF2qenI2xkcTya7+6yGiaGTi67+CnGSuLNnaVokp4MnhFxzEj6WlhZzwQJO1iQZGuDjopvFyGh1HpTaqZrdlyXBtg9pR07r0LCCZG0S09oHq1ai1pIce80T0svKlt1K0k/wSk5nWdFRWmZwaB4dO0L2HjwGxNrteN8dGX5AcerXtcFoawfaX4u1GYSGrPe7W1pZR0syU92laITyHfSyc0m1p5JABWNluGz9IlV+Rn4s3p+SjJ+17aCe4wvnea8skEo+CvT+MzeeMHXtacZXTYyHchZWXK+n6KJPk+3tZE05EhIciRNrXbM0Cj2qOyOJ/SxZMp7h30lpMx7a2r4zrdnnbXJKPy2D5WTLlSPGilJpHV7nJyIumtPncjooL81vEhxpYckpDdFLF73ArT0Z+7Zk8gATxdaTmznOJ+FmSGuygPkI3elUwV8laf8AUk/K4ZJHysoSB2wdrmynkeSfqn3rZZl38ojJ/wBrF5gGwVdmQR2lcn/Y3mv+VPK1jxZTuQvpaOPKHhZaxxvjfRXNQyKCKddKjt9qI0paTtAITMg2glVEUCQaSM40U7Ik5x2tM/rLc+P1wwbUvoBEA+EKQEWuaRuyvJPPpkN7+/pY0MQu3jm77WrnsD3AG+0OCNrD7RaZcCihaaLXX/cJo4rON0Cf1pE9MdgUpIIVSlYoIuTfeAP8IMkDKPd/3RzLxG0pJKS6wjokCkjDWkG1nzwBw06k/JP8FIZM4H0l1XGXkQ9h2wsrIAisALVnlDrWdkFtmwjtORmScXiiP8oNAdBNyFvw1V9p6ajp/CZIAutqPW+CKTTmD9KphaQlaqRVmQ5o7sKTkEq4xxWlBxjekunwvJIXO7pU5G6BtNuxnOoEIkGJwf1anqjni4eNX2vU4wLWNsLFwoiGg0tqIu9MWFNorp9hZ8ze07M6gs+Z52l08s/LborFy2gArXynaKyMo2CnP1V/GLmN5NIHSr4vLdEeDzQRMo1dLLnJD7Yt5OufV435cywQSkpMizpZnrP+VzZHEqpGdrQfMa9qDI+xspUyOVS9xVJt6YkmLW6Skkhk7XEOOlX0nfAVdRYoXG/0oLj0AjNhcfhFbik/Cfsn1IuhLtlQ3Gae1qsxftMMxW1oI9x6MM4oHTdIb8bVNXoThfNKjsSvhH9g/reddC5o6QzGSvQOxR8hLyQN/wClE8kF8bEt7TQGk5iZJaaKYdjXZDUo+BzbNKrZSzLGzFLzbau79rMw5HN0Snw7ksNT66M34q8bQiKTDghyDSSuE5Qksjop+RvaQydWtc/rLyT4/Xo2QqP+bRmjaFIDtc7Rm5TLOglo2uDthPyNNlLuBB2l/prdJeeQD5pRO/j/ALlh+V8i2FpJKLqRWcdNZea1nZWB5Dz0WPdvF/3XnvJeUycx5jxrF/KyMiGHGHPPm5P+rTzm09SY/Wzk/lPJxELXPKycr8lyATyZxH7K895Dz8UJMeHG0H/qXnM3yU8983kn4AXVjw9ce/5HPx6yX8sms0Nf3Scv5PO8/wAqC83BhZWU8emCNXSpkYuTFuRtBbT+Pn/jnv8AK1/16L/4gnLq5piPzuSNkBw/uvGF8jXfpEiyJI+nEpXwZ/4ef5Ov+veQefsj1GV/la2L5CKcAhwv6XznHzw8hsg7WxjkgB8Lv8LDyeGT8dXj83s+gxPBbpMw0SvL+I8gX+yQ0V6KAm2kFc1zx1500WRcvhHjxwHA0uxDyNLVxoOZ6UKtDxoTY0tHgOP9kaDGP0mHY3tRIi6ZM0YIWZkx8VuzQFt0srLY/dBLn1pLOMDLHayMkaIWzmtkF6WNkF2wQifot+MrIb2kXsWhkNJSTzS2lY2f9AMW9rgwNRHPFKgNlaMasIuXSuzG/wC6KwgNtUlzo4hZIsKftV8gjMW0VmML2P8AwsmTzBv2NNqWeVyT1Grmam6jZbigfSK3HH6WQPKzN/nGrs84wEB7KRMa/wBL3z/jZ9BoC70wOgs9nmYHdmk1FnQSD2vAUXFi5vIrmlV4j5VzK0j2uBVDvaXKqWUN7AeggyQ38AJlDkBJU9PhJ8daS8kIcCCFoOb9oTmD4VzSLlkPjDDoIkLjaamZfwlxGQ60dEnBzsKjhasz9qzhSlpCcwoLMy+iVqzhZWYPaVtj9Y+X8fsDa51VtWAVXjSwUTlq0pORxT8jFnZo4NJSqs/rH8g7i0kGz9Lx/msiGMF2TJr6W55iSQ8uGivC+Tgmy5C0Bz3KZnrea4xfK/kYjtmG3/NLy2RlZXkJqLnOJXsh+KyyuMkreH6RcPwDMfJa/iNHpdmLHDrxb1O2snwv4m/I984NfRWR+R4kWB5NkQADWdhfcPFYjHxABoBpfJv/AFMwjB5gvrTul151I8/cs16r+LmwCBIJgx4+NLM87MzJldHERxH0vPDTQTbTV6RGPc0nZJK09+sr4+FchvE0OgoiIrpXmsuo9lViFKen61V7adYC3PFh/wDTiQXSy6ae16nwmO0YNOHay39b+LsExvcWvj04L2Hii6eJoIPIfK8e5joJmln8R2voP4ixmTByAFrj3Ho+PXw/gxODgvS+OhvaQhxS12l6Hx2N7Rax41uh4YLGgjjGJG03DFTVZ5oEKuM2Pk41A6WNlwXfwvSZB0bWPmtBulnprl5XOhFFedzm8bXrc5oo2vN+QjBJpRL9aPN5fys6TpauYxZM+gVvllv4WkKvCd76QnbXMNMK14wt+uzMsRigs9rH5D7ddIkjebrd8IUmTw9jO1eMo3rh1ogx2cn0a+CkcnzPwwNZ9UkfIulbCHPJAcVuf+n/AIfFzsiafyDecTOha68eOVweTy2MGTyk5PvDgOukB2c4mzsFez/OGYQlMWJC1tb0vBOHEkEdLTWJGWfLaabmfYTEWWD/ALiKWcACNKtOabrSz/rlazy16PG8hM2uEhI+lq43lpBXrN19rx8PqH3Rk6T+JnuY4NnFj9rHfh46fH5a9ti58M+mOF/tG72vMRBsoD4HcD+insbOkjeGzrm3jjsx5PZrOaShHRpEZLzALelRwt1rKxpKG8WgPaUy7tUeBSY4XY2irPVwFBCXQTlG9rKzQACtiYLHz+itvH+sfL+P2BSuGqArArKKUcwFJZePyBT9qC0FPnT7x5bM8UJiQWqMfwEUTb4i/wCy9O6IWo4ftL1P2edf4WF4rj2sPyX46YiXxDYXvab2QhS8D/IAhVxEr5nBlOw5alaWAfKyPzLxcXm8MSwHlK3ql9NzvGYeQDzANrz+d4JsVHFkDR9LXO/VG8e3x+fczxmRhyFuVE9tdGkkWgDsn9r7zmeKGQOE8Ubx90F5vP8AwrEleSQWX9FaTzRhf49fJiGXu0NxZdgF5/S+on8GwIh7nOP/AOyNj+B8Xi6MYcf2n/8ARIU/ja/x8ywvHZeU4GOFwb90vY4PjcpsDWhptepBxoRULGgD9IP9U6yIx/4WO/N7Onx/x5P1mw+ElkI5mge17P8AE8AYembCzsHDyctzdEBe68Ngf08bQ4bKyu2vpM/IJj4/OWlt48QY0BDigDKI7TQGlnaa910UJ3I/KMAK2FR7hVAJUZhDJJorIy7rS2MkAhZeSKBWdrbMYGa2wbWFms7Xoc2trBzB39KZ+tOMDMj7WPlxL0GV0sydl/C6M3jHcYj4z0VEcQc0p2WPukKNpY48lrNMNZef8lIYnFo+UHx0DpZgXnS3cnAjndbu1EfinxkOi2ujHk5OOTy4tZv5LAIseOhbVj4WdPiuH9O8xj+69T5PFlmxix7DyHS8m7GkgeROwj6XTnccdxRpM6XIldLO7kSk5wT7q7RwxrSVR0bnAE9fSr2qLmAN0rHavwpdx1+0u1Unz4d8LEZJCK0n87xoc0kdhMeAxTHEZHtq+k3kE0aGysda+unGbY8vDNLiScd1a3cPNjyG8XkApDJxS93JwpCZjlptpIU65qNMZuK9PjF0f8TbU7yttjtYOFkPYAHGwtaCYEaXJqcdmL0bRH7XVpXIFWPlV+FDUMaKo9yKQqED5QCcw0sjP/i5bU49qxfIGmuW3h/WHm/8v2C1Taq3pSspVLA/akOCGbK5pT6Fydqkjq6VnEAKvIH4R0cKyEjpZ+VMQCLWsePyLSmTBG+9Jdp8eeyclwunrKny5CT7yvSZPj2OBoLLm8ODZBIWd9uts+s/WDNkPIPuWdkZMo/+ovQTeF5A09Kf8CZdveSU/p9y85PkucaLiUuGySu/02lerd4zGjO22qtx23ULd/2R3/py8/HnoPHTP28aW/4rwYJBc1bni/FOeQZevql6THwo4mjiLQi3rM8f49kAADBa14otgUisjA+E1DF8ntPnU3kUENNXBldpos4tu7QJSizn6mffwK0J52iHQ0gSE70s7etJOF5iDaz8hoLSnZiVnZD6BWdrWMnMaKKwM3VhbuY72lYGcTvaUXz4ycnY6SEtUnZzrtITG1rKzsLPaChOj2mD0q0rlZWFZIjQI+E746QE8XBUa3e+lxYWP5MWk0z1hs+nG5oEjAWpLyXg4Mtlxhp/SNiZPJlHZ+UwD6YtporSeSsv6p/rwfkvxmaMkxgrKd4rKZomh+19TEwdqZgKq/ExJtloV/32Iv8AFl/Hy+PwmRIdyMAT2H4GKKUOlkDz8AL358VjEe3SofF47ehv7Rf5HTz/ABZHnPTpnFjaA6S78eeQdUvVnFiaKpVMcYFUsr5OtZ4uPKHx7696o/Ba1ellY36SkkQJ6S/sqr44wm43F3ScijrpOPgH0uaxK66M545gIG1JVq+FxAUNFCqvqld3SE/aYJ5B9iwvInRW7kfxpYHkzorbw/rDzf8Al+wmnSIOkFjgjNIWC0j5VD2rkg9GkNxr9phDzqlQkALnOvaETaDkWc79oD3+7tEI+0CRlmwkcisklBKSzCqKPIzW0lMyutotVIBLKASB0k5n7pt2mxjve5Nx4LQAXDajq+MiLDmnN1pa/j/Gxx7I2nYIWt6TLW7FBVPpW8XiiAbodIwaQLPSoLHfStJKOCpn96uwgu2moAXE/SQiIc4LQEgjj9urVT/qNfqk7wLASrzah7+RKhu1lu9aYnFmMLl0kVDafxYeTdrsmEtH6VenC9+vPZfttZGSbBWxntPIrHnFWufbfLKygeJWHmx20lb2UaaVjZYtiI1/x5/KbVrNlNLVzhQ0sbJdRWmWVV5q7DaTLzy7TEbhpXIzMAXpHYwBtfaAxwTcQukHzpd0ToXcmJmCQvHu7R/SsIL4C023Sfsi4ELgOxa4fYNKsbvhwtF9MO2NI6fECUj5VvVJ7UeifhV4OHYtI0SFBv8ASP32FXiEunwu7+ypws9Jp8etKpFFOUiT2bQ+FFOvAQHNR0F67VCKKKRtVcLCOmE5BcjuGkF4oI6CWQV5/wAodOW7lHSwPKu9pXR4Z/8Apy+e8y/YDHapEBQI7JB/aKbWDXghVCaU2aCo4ooirjaGXUVbje13AoNQutcLOh2jMiJHSI2KkuCUk6IntQ3GBO1o8GgILjR0hcpb0QzYCkkV0jkCrKBM7iNJGoHV8IrO+0BpAFlcZ2t0E5SNSPAHaTlnooORk8RpJHIsG1F0qZacORb9FaTZC5m15/A/1Jh9L0QYKAHaud4jc5QaspmCO6Vo8cl10nGNDBtPOe/qdXk+G8aPiwIOc720uOWAKtZ2XkhxO1vqzjLGbazc7srCyr3S1cuYElY+U9cW/wBduJyMrJdo2svJdorQyndrLyXaKmNP8ZGadlYmWNrcyPdaycmOytM1nYyZLBtXjf0jyQ6SxBa5axlfjSgI+VoQUVj48lFauM4UpqpT8Y+EUx2OlSH4KcjbyCzqoQfj/SgDjorVMbT8ID4QTQT9juSzDrSkg10ukiLHKWv1RT9up9QuN9hDezVjpMEfSq+w1A4BWkKQUjhx2gPJtMi8hpBJ2izWhHpIg3Haq46VlV6ag39WlpdhHel5TpOQus/LPtXmvKu2QvQ5pAavMeSdb12eDPb1w/yr84/ZLHUAPlHa6wko3EklNxdbXG6RgLCq5qI3pXa0FUXQGsTDIhSvQA6Um+OkDqvAAaUAa2pB0gucfhAS82dITgP8q79NQidI4qByEJSZzfvSPIdFZ2U80QOlOmkWMt9HSVknA+dpSSUjspWWf9rPrSZMT5BKWbMXGkpLNZ7V8W3OspS9O/HqfCxfJ+V6fDhbZc/ped8QQ2NPz5hjYaK0mrlhvPt+NaXIjjadjSy8nyGzxK8r5nznoNJLul4bJ/8AUeHGzTG9pLQe0/fW/wAV/X65+vqrsxx6KHJkch2vKeF/JMLyrOWPO3l/0krTdkX2eJ+h8qddhSQxkS2TtZmS81orppe9rOyJ+9rG9rUHJkIu1nTSAq2VNYO1nPlHXI2qzlftx0xHwlXQ8kbnv5Vrs7FK/So95az5IqPSSyIt6C2JmE9dJOZguijN+ludZEZLZKK1cSTqyszIbwm18pvEdsLSsY9DjHlVLTjFBY2E/YW3A4UFFjSVelRza2mKCgttQslIzklnx/S0XNQHRjaBxnuLm/GlUvsbTcjQB0lXjZpOUWAPfXSC5yJIEF1hUngcptBJRHHaCTtBKlVd0pJVHHSYDeRSVnOkd50k8h2lUTWV5B5IIXm8w8pFu576JXn5jbyu/wAEeZ/J31+y8f8AiCU4wdJGB3I/2TzR0vPy76YYaRGoHyiNdSqUrBSaCgusdqhcCpdsaVDjt0o+NqBr5Q3HfaSpESGvlAJJJpEedID3cQa+UK4WnfsgFZmS82RacmcAXX2srJd2s9VeSmRIL7WfLJ3tXyn7KzpZCXGlk2grJC+Ra2LGQAsnBZykGl6fEgtgCuZY70a8fkBltJQvJ5ga120rPHJDJyaCk813rROs05GpecPxWfrxf5XnvcHNBO189ycN8zy6iST2vofk/HSyyGhyBQYPFQ45D53Afoq/DLGnl3mzlYH45+P5ZmbLE57a+ivomPLkwRNZOeVDtZMHmYMf2wtoJxvloJW+47K01m6/XDPJP8Hmza+Vnz5Y3vtJ+SyGOsxlYkmS4E2bUf1t55ZxpZGY1tlzl5/yn5CMcO9NvIoGXmFznNIWa+Fs4NgLXx4k/WXk8ts+E8j8nz5Xn0zwC1/B+fyXvDJ/cD8rMPiQTorS8fhCIguq1tv15yRz+PW+/a9hDM2RgIPaFkuAPSUxpAyOidIWXmsa0gFcVz9d018+lsg8pkeDVJOAmV5cVowx9K/xDTwHdLfxiCAvP4rSKW5hgrOrh9jf2rdKWBc4fSnioC4WUvNpNFqXkbaS4UebHSWf8p14bSTkGyUQwHiyl5KCO80l5O1UKwu/vSE4UjyaQX7TTQXV9qp6Vne1UPSaQX9FIZRppKdkNArLzJKaVeZ1nu8YnkZKsrHJtxTnkpLfSTavT8eeR4/m128fsbGdu7WkHaBCxMWUPDa+Vqtd7QvLj1TIep5WUIFVDiXJKMlWa5CJ0q8lUoEe5Dc7S4bUOCXQpyv4S8ziLpXkcR0lpXE9otXCs5sEntZWS6rtPTu2kMlvIlZ1cZGUTZPwk2tcXaWnNFekJkJaUSC64Y8dDsGtr0uG0NaL7WVgxGgtrEYHfy6W+MufeumDjskabGj8rz3m8VmLGZHODW/ZXo5siOCIm/4i183/ACvLkzRJJPKY4XGmtBWkx1jPLc/GTn+Wkh3C4P5asfC8xneQJlcZpXPf9DoJjOyGB3CHTGjZPysHILHh55cW/XZK1z45GW/LacizzJpugjtzSw0SsBj+IPEkK7J++RV3DLOq3jm+r7QaKFI/2mtuWS2YX7U5HKNX8qfTh3dIZcruRAPuSf8AUvY6zf8AdOZ8BZLzvtI5TajApVMdR/bYbgzr+U1/VHsFeeBLPlMQSm6JS14+NM+ZtjJld/EmkWGJ8ht20hBMBQJ7WxikEA2ufWeOjPk6axoiKFUFqwRihpLQVQWjji6WdbyjQNqtLUxDSTjZtO44pZVpKfj6V2i0OLpGaksJ4pLydJuRLSiwpqoSlFpZ+gm5NJSU7KIopMEu5MzdJZ3SoqE7aE8IpQ3hOJpdyG9Ff2hPTTSkxIBWPnOoFa2S6rWB5GTtb+OObyVhZZ5SFDZ1tQ428rgvS/Hj290/V/h5SWtv5W+zbV5Xws9xRn4AXpsV9sv4Xk6n16+L8Ms0Nq5O0Hnq/hEhPMWk0l+CB2l1qhO1N/CCX5gBDc4FVcfpUJNbRVquq7SuQQekw6qSkvZU0Ep/lKS9JyYXaTn0xJXSh2VaJlu2oYCSoL+BJJVSI1pq4vGwOQH7VvI+TZg454N5S/7G/ax5s+LChL5Tyc7+LR2sLN8o5mMczKcPWdqOPvS1yw1psZHlJpo//mOIvpg+V5H8hyA93OQ9Cg36QW+WEcZ9pLzZ5E9WsTKyTI55Li/kbsrfMYb0Tyj/AKwbfK9kpNrG+o8n+LUzLQZzb/JJyO/0iB/u7W2Yw6UypaefT/ilBKQ5MgNEZaT7kg80TSpPsdgeJL+0z6r2tH6SGF7dp5xtllIdXlc6UAnsJPIPJgvsIzHkG3dJeUg2nCtJzU4cvpcD/uUPGiPhRHv2qilPYsoeRa9BhPYWCl5SJ3F1BamHlcSNrn8meujx749biu5LWxCAQCvK4ebTxZ7XosPIa6ja5tSx2Y31txgaTkQ0kIZAQCE7G8ALHTf9NtoNVg6kux5Llcus6U2Lgj3ID3KxcgPcFLSATJR52mZSUrKUzBmNpZyO/pAfpOFVChSK7iFRw0mmgOGkCQ6R3/SWm0CqTaQy3U0leb8nKTa28yW7+l5ryT7dQXZ4MvP/AJGiA2UeNiE0AGkcGgF2WuDMfoP8ZzRLhNHz0va4E7RCATtfJPxfLMcLGl3yvb4OWTkNaD7fted5M/XoeLXx61j+Rr4TLXBraCzMacOZYTTX+2ysa3hhzthcXe4Jdr+Ss53ykuCbCj1B0q8i4bQydp2mvIRXaRmemJQftKTuDdFTQC7YKVksX8okjwGkg6WTm+QDLAO08y1OrxOVktgJLzSwc3yL2kEO9x6H0s/yXkxJMW8i5ZWRlOBLnfPa3zhhrcaQneZnPmls98vgLPzckSFz3Dk26aSkpcm4wxp9nyEjJk83hp/i34W2cMdaM58zBTWO2BZSBmtpCHNJZIcf7IBeQ3QtaycY6vVnSEtIQJD7O1HI7NaQnOq+XSqREBdVl96Scjg6yEac6odITWWNBOlBsYkuATsgIjP6SkA4SNNWtSUB8DjVFR/rT1+dIFx9MFCduyflFJuGvpAkB0FfYysBkHwFRmnWpcKk7VCaT6XOJ5U4lFDjQLSl3apEYeLgL7SsEtjQgyTQs7C3fE5/Qc5eVaaeU1HMWcXBY7w3xuvpWDmNLQCVpRTcjo6XhsDMuNova3MPNGgTtcu8O7Hk7Hq45B2rh1n+6ysfIDwBac56FLGzjpzemOVfKE9yHyP2qvdYUtYq91hKyojjSBK5I+hP6QXopNhDemVoR6VXHSs4UO0OU0FURS73bS0zhwcjS6FrOyZDxKrM6z1efWVnvoOK83kv5vK28+Uem4FYTyLJXo+Gcn15X8jXb8WiZe0YhRj7Ffadw8V+TMI2tJJKrVZyPY+ByQHcCaXvfDPLm8gbK+X+Pd6cxs7B2vd+EzPTbHugVj5M/G3i0+hYsoZA0fKZZPyZQWPj5LJMcuvaYxZQWWXUfpcnHZK1YpOMQJRGyXtZpyPaBWkwx49Pv/CmxpKc9YUhmS+kAEdIjWAC1JiPuhtZ+TZJFpt7yAbWZPJ7nE9BMMzzOd/SY5F7K8ZmeQdKHe6kf8szfUyHM5UPheYzcgeo1jditro8eXN5NiT5Isn5+0lLlF7KehzvNkDpJZEhee9LaRzXRh85azRSrZbtxVXO9iC91DSuIt6bD7aHFGhbyaSaASTXFwaG9fITBMnENa0gJ9KS2gyW2TjWkGaN731WlrY+MXtaXt19pw48DACaJUXfHRnxdecOO89tUsw3ucKG16tkMEn0jx+Oj5W0BZ3yVvn+PGFjeOBAJ2VfJxw1paAt/GxAyQn4Vp8WAkk0Conl+tf6JzjwcjXNtoHyqyktbsL02ViQcjxAWfk4PMWCt8+aOLyfx7Px5x290qu6C08jBcxtAJKSMt7C1m5XPrxayARZC4j3WruaavqlUjSvsRzi4ItXL7iQWhcXUKvSVg7xoYeS5nZ0tPEzTz2V5+N2gESORzH96WV8fW2PJx9A8ZmgkbW9FNyA2vnXj80tIor12Blh8I3tcnkxx3+Lydb/ACHFDfIAl/V9o2q8gbXO7JRHvtAebKhxIVbRwdQ86VHFS8oZP2jhWodsID0UupBl7VSJtK5D/hY2dLVhaWS8e4/S8/5GU8r+Ft4s9rn82+Rm+QfZ77SUMD5pOLG2iZcnJ+itTwhMc7SBdrun/wCY8vV9qN4vwGTkyNbwIH2voX47+NxYXvkAc8fKZ8I+MYgsAOW1AQW035WWqb5I54ZlSV9r1PisgGOIEry/k4HY+S4H7T3jJuJaFpudg8euV9GZl8MVoi24ra8TLePym7XisPKIAA6W9j5IawR8/wCS4tZ5XdnT0Hq2+zQCZikHydLzoyKjpzrI6KcxZ2tiHN3ucorWVvhzXbU+p9LOZNyIo6TbCDVdLNfRpiSxZPk3ejivefpaTjerXn/yeUxYRa0XyVSFa+d+Vc6fyQLz7ViyuDsl5Z/ELS8rMf6nTd0siR/o8ge12eNw+X9DlmPF32gUasoLprJcVQzukGltIzEkPtIvapG2+1VsMkguijNxpiKoqew5m0xC6KOy8hWk8m3+MbP/AAhQ+PcTb7WpjeLa6tKNWOnHjZwzpnAaoIzcqWv42tuLxTA4CkzJ4YcbYFFrrxhgQZr2O20rZx89hZ3Tv2oPjHCtaUv8YygR2oaycDmzywmis2fyLiTZTGT49zb+lmy4hLqpKZnS11JzATZKJHnR9EpZ2E4DpBdi0elczGOs1rCeKQfCXm8d6x5NqlnmJ7OiiR5s2MdOsKp8/GWs9/VMnBLd/AWfPAW/C3h5GKZtSiiflL5DI5BcbgrzqubyeKMMgigquYatOSxUUB4+CtZXNc/4GzTVYG22ua0usDpSdNop9T+DwycGgr1PhMjnG0WvIxe4gLb8BIWucP2sPLn46vDq9e1bZaFdpIKBG4ujarGU9LgvyvTzfgzjpDtVc6xaEJPcUH7COO1UlDc7a7lRTLvVXk2hSvUzv1aSlm0qz9TrXC2Y/jY+153Pk/kFr5cnJpXn/IOpdfhz9cPn32Eez+16X8ax3OnaXdLzuJt5JXpPGZPos9q324c36+h+M9JjAHkLXjlYB7CKXzyHyZb8p2PzDxW1jY0F/LsFrS6RoNWvLRzU22na+o/nmG2PEPpiyNlfKJG8SPja6PVlK9L4vMLoaLtntbeDlGNpJ9xXhsfKbBsbtbWLncmijQKx3j66Mb+PSnyTfVDADrtb2M9srGufo/C8SH8ZGv7BW94rLJBc46HS59ZdWdPUMyg32gJlkxDdE2fgrEgyogbd/JMx5RltznUB8LL1aTTcimB7qwFieYkErZC7+PwhzZgixiWm3lZ7pZJmEyab2iT6q348V5Rjv6mR5034Xn53hxJcd9L0fn5zMXMYKDfleclh4gE/K6sOPyfaVeyx+kfDxuTgANIsOOCQStvxuHbhpG98POei+P8AHAge0Lcg8RE9nW0xg4nENsLYgYGVQXLryXrqx45GEfBEGw3SPF4ox7LV6WFw0CE3wjLeglPJW0kechw2XsJkY4bqhS1JIWAaCCA1p2FXu1lZeRiDgQ0LLnxg1pHyvRTFpKUnYwtOkvdpLHncqIGOis/+naBdWvRTxsc0gAJN0FM0Ee7T5xm+gwwkkbWTkQgnQW7PE4tPws98f2Fc2y1IyJIbalJIr+FszRn4CSkhJ6CvO3Pud/GS+EXtAdA+/aSFtjDLlcYddq/7I5tZ6wTFKB9oLmuv3BejOLYSs+Hq6VTydYa8TKjaB0q5LRx12jSRljz9IU/SufWNnFGU1jSO1seHHGYH4KymstoC2/GNA4n6U+S/Gni/Xq8RwdGFZ4FlLYsnsACZLxS4dT69HN+I2G7S7tXStK+0tK/iLTzC1VuRs2qGajtAfMCP2l3ScSLK09Ue/Dksn2s7KlFGipyJTYIKQyZKjJtVjDLeys89B21iZchkfpMZEps7SLyS5dnjzxw+TfRoQQn4pyxoA7WfHfEIocVWp1llojIIOijMyjrayhIVcSH4U+q+vv8A5mEzMke88hxql8k8pB6crxXZ6X29wifjP57FL5l+TYHKR0kTTxW2mGa8QaYCAbC1vGSMewA9hZMjSwuY4btTiz+iaHaixrNPUslDv9PQb9okWYYSWB2gsKOdxbyJ2p9V3IOPysNZdGd17HFzC8Fz/wDCcxslxad7K8vjTktAv2haeLkii7/ssdZbZ023T3ITV18IWblcISAdkdfSSblNayR7ysLyXkS51tOlGcL15ORXLlbKDE0+69lKzBhIA3SSfP6by+/c5EhPMg2tpOMPbtP4eMZZACKC9V4/F4gaWFgOAcAO16fAeABaw8nXR42hAwhvSNRH6VoSC2x2peVz/XTOcTFJVknpRLlHsHSA7ZpZ+XI5vIN6Tk7R+Q7keT4NrkFlT+cLLs2Vj507ge+lh5GWXza6W+fHKx15bHp5PPu42kZfyB5aSsCWZwCUdMdgrSeLP/GV/kbn+t9vnnm7Ro/Ptr3ryTpjzoBSXfBV/wBOf+F/9O/+vaM8rFMNdKXZEDhoryED3N/idJoTFoBBWevFz8aZ/kW/teic6MhDLWfACyYsokbTDZyeln62L/t6aIH0hkb6UBznIrR9pfhoa0V0hyRCimGhVloBEpWfPrA8hCORpZMzXcuPwvRZjQ6ysWZmybXX49OPy5TC0UtDDk4UsyCSzSdaabaNwYr0WHIA2+0yJO/2sfBl9qbdN7HUdrlufrrzszI4JWeUNG9oDciweXaWkk5XyPSrOU626d9HldBLvm5O/SXllL3FvwgepwYb7W0yxuzcs16CzsycFhbao6YhpcEofeSXFa5xGG91WQUyygM25GyXhzWhvwohb0VtPxhftXLaCrf2miAQgPYppxQK1oa4FMP0nA22Fj/lZXn8E4vj/VIth+FrjctD7Tv5DjCTwxjdWha2455XwTyUTzO55FAnSzCKk6peu8zhuMhoaC83kNDHEOFFRY0lWieCdm1f1qlA/wBoSbNONHSm/kqLGs01GZQAoaBT2FktJa0HS84XuKPBmCIX8hZXK87ehz5uMJHLteflnHFWysp0rBRSL7rdp5wWt2pfJycLKcx5eOyVmuHSM0XW9qrn4WdcrfwMlxksL0mFkltcyvH4hMTQbWvizuk7XNvLqxt7fCyAQCD/AITxfyb0vO+MkoCtrchtzFzWfXVnXwN7i0k2kMyw0uB7T7oiXWeghy4x4knYKUn1ffjyedE73X0VljE2SNr1k+C+Rxa7+KWkwmRigts74x1jrys8LuVcdfaSni91N2vQ5MLnSkNrisyeLi48Ra2mmW/Gx/TLXbXPBq09LAT8FUdASxaTTL0KtcQ3XSLHNftpT6Za0AgqDAQbCV1CksHY5wP6TkEm+kvBGePuTkbR9LHdb4hyJwNBMBmrSkY40Ux6o4rKzrbvBCQ0JWSTe+l0ktJKeVEwi7Vy3WDx6WNkA7Ts0qz8iRdHjy5vJoGE09NslvRKRafcpa6jdrXUZ5rax5uIoGkyZi3s9rGa80DacEwMW+1jctpoWWXibBS+RNbbDqJS75rJS00oNAK85TrY3qkN/aXmk5KrnHpBc+lrMsdbS59MIS7nkaBXPfapVq5GV04GymGdhAA2jN7RU9HBN9ooAI2gNO0Zh0pqpQpYq6QCa1S0KsbQZIhRKan6Eicf61rD8lbvlW8sQNf1SyJYiM1jvm16PKhbNhAHulu5XzSTCZJkvDul4/z/AI1zcl7jFUY6NL6Hn4/ozPaNFYvkMSSaItkIIKVaR8wkbqwa2hFx47cvTeV8QYASGil5+SG7AHSzq4HHyePadKzYwXbQmF8J4kGimGCnWp6rjmjid9KksnYHSuXl1/QSpcS410EcHXOIKuz7Hwgg+73dK3qDQb0iwSnsd5e2z8LWwZDzHI6WJC73gN6WhEXBtHtZ6z1edcerxcpkQprqtbOFnmcgM7HyvE4+6sml6DDyQyMBlAfJWGvG6seR6qIh597q+080RCIl3XwvMYEhklJc/wBv7WxLmNMJY0WAO1jc8bTXVpHRsaZCe1lTtbM86pqFk5g9O3WL6CCyd0kJFUUeqpolmxNa4ln0swspgJ+1pSPbsXZCUaWySMaegdrTjO6A9E83k9ID8f8A1L+CtR45Pc1tV0lJHAS8T0O04mlpIL07r4QPR4mlpS8XNG9fCBNx4FyVipSbw1qNE4EJOZ3zelEM4Gidp2dTNNHkKIQnykdJYzj7S75yLJ6UzJ3Zqaccf2knz3YPSXlls2Cl3yFbTLDXkGklPXwlJ3/S58mv0hOIIWuYxukk2FUOpVDhSqSrsRKcZJqgrGUggFJxvLSpkfZBUevV+3B+YBcUv6gCG+Taq59jSqYTdrvkv5QSbUVfypAV84jvVasq4aKV2ttSW0n0KAIrAqsbtGYFNDmtsozWgKGt6+0VjQTXypVEE0uvSo80UaNttQb9EZIIcHnQC3YXF+GCD8LFzfeQ0dLX8bxOJx+guhyvG+YEhza+CUL02j2yLZ8rG0TX+0i6ISNsdhKql/15rzOCZ+Qb/BoteGmiEeW++gV9TmhL3VWvpea874WOQn0gQ8/Sz18/WubK8pn+PAjbJ8drJmPu4tK9IRLiNMGazQ6JWDnMY/JJg6WcaWcJl3JpaO0L+APJEMbo5N/KrOAR/ZaMqECCocQCKXBwA6C4tJp3wlThiOSqrtOCVxeD8LPYOLr7TMLg47NBTVZrWjkc+i3oLRjle1gFFZONMGEAbb9p1uR80s62zW1iTEgCyCtCaZzY2hjv7rAikJbzukzJOODQN/tZWdrXOvhzKkaXMJNkIhnuMhg3SymTNL7VxKSTx0Clxc0XL3Nc8uKtAQW8iUpkS8XubevtVim4Rb6T9ajrUicADR3SQyHEym9GkbDeJJweglc53/zT66Cch2/HNc5waLVHvfT2/CDDIef6Cu5/80rB0rkHQFpYAtd2izHV10hDfyrkTa50ha4Whvl+CumIcQl5CSU5lnrSHPJJ/SoSql1Wqmz3payMeueUEmvlWcN9lDcq4SeSjnSo46VAbT4XRud9KLI7VQocbIT4XUuKra49qaQEC0yyOwhsanYhYSpxVkdNQ36TQG6QJW7SMJgTEbbVGMTcUfttHScyLQKkjjtGa08dKsg9mwpUX4ciiNaegpawgWjtj0CO0G/RHolzS49ovhHlkr43fKfEI9H3D4WUzlBlB1/K6HKL5bHB5UNhYMTjG4tIXtMqIS45kDRsLyWayn+0UUf6c/CcjiJiQNFI57eDw+lruhLow/5QZsN07dqNzq8Xhd3hsbzGIOYHqNHa8R5v8afiucIRtpv+6994iT+lyfQf0St/J8ZFlf6hY12vn5XBdXN+vQmZqfH5wljlD3h4/igngWtDuyvqH5L+KD1JH47eN9heCb4cnNMMh48fldGPJLHPvx2ViSxtB0htkr2/AWj5DG9CZ0YddfKRMZHS1+VjZYkkcbCPEN/pAH8apGDuDGHsEG1KocjsEBqcdLxYAFlxOJ6cmJHewb2ps6uVpR5HMBpNBaEkjGMaAb0vPRSa32tASNLIy7v5U+qpsQSVL3pNSzhkYLVjyzW8cT8o7pmloaUvVfu6Y82k/KhzwccN+UN7w20FrtEk0E/UvY7jzFpABVXyATEk3aRZMPUsdBQ99vJ++keo9jJmAkIb0udNVhJAkOu6VvVsEBL1P2HdToibS5HFEdYgS0k26TmU3SJHfXaBI4hS91OQpX2rkZ2uJsWh8je+lLiKVOVhVEOv3Ksi4fao91phHTVRWontQdaT6XEqG6KsOlHZR0cQ7tXaNrmj7RmtStAsTNJmNtBDhbpNMbaRxDRpAlHuTZZrWktI2jvaSqmEWaTbWapAgjJNhOtbQQUcBxaAhPHJ1BHIcW38Bdjx2eRSCGxDiEdkVUUUxg9KaIFfCFP0fTnMH0kZoOUx10tVxaIGhALOQ0F0uVXCm9SP0lm+SwuErimXl2O4uajTMdlY3O9osHePPMa4O4/CJkRuEft0rvAgJLv5KzniSNI2FmjiRIP5D5XovBZjcrHAvY7WTlw82loGlnYmS7x2U1oNNJ2uPz+Prs/jb5+vZ52CzIgdGQLcNEL55nfjz485zOF/RK+h4WUJomyNNq2bix5UXIak+Fx+1z8d1k19fn/8mwXwTvZ6fuHyF5ri4O40vvfmPx+DKxZBVTVsr5P5P8fniyZhEC1rDd/a6vF5HJ5fG83NE5otMiNv/DbO3BwXelO+Z0bmmzpVgJY57JCf8rf45uWAA8NBHafbZKWeS5+ugUVpZx9x2qCwko38WjGUySENOgEnyaLForS2No4nZSMWT27tU9Q92gzuo1aA120uDrQEnJvInSh7+TdHSScSxoBOkQuBDS06Rw+ilwjbQ7KqHE0T8IcsjQ39qjXGgQjg6O9/M2NKWO2gvdxC4W/TU+D2GnmdxodJYuHGr2plIaKOyguNORweyeWiL2huK67JK7je00Vx6CrWlcdqHC3IEV+FAZZVwDy0jenxbZU2rk6XcKUCO9orgXFXY2gldH6l3Npc1qK5pJRY4CVUvUX4FHHaNxoJlsIA2pEYQAYzSdhjJCD6YtPwgOjaEvw5A3MoJSRnv2n5GgBwSxAc6iESir440m2M5IGO33aCaAIJNIogcwI4sHymoIRG0AoER5y1S1mxh0YCQLSMDv4qgYR2mTHw+VwafgJn194Er+LQm8eYcaPaUa0AgpiGHkbC6HMBmvDgfpL+Oyyx7o3n2/C0pMYPB/SxPJwPhIdF8IJfycBkcXNCUxaa/i/pafjp25GJT/8AmLLy4ZYXOc4a+ElQzkRhzP8ASCwvJYRe0kfyW5hyW2nKMuIOY5zRanWfaH7XvxheA8iYZDBKTrW167HkD2g3/ZeI8hiPDvUiBDgtbwvkfaI5T7gvN83i49PweX5yvTSRxyNIcKKwPNfj8WVG4j2u/Xyt2OUPaCETkKNhYzsb3lfIPMfjeRjSRzxRXxO6XmPOYbHzXDEWk92KX3+aEOYeTWkH9LzXlPBY0w9zAHErbHl5+sdeOV8CzMd2O4Cj+0vRPwvpX5d+NSQgPx4+TB3peKkxZGO4vZxK6M+Trm342QCQ8a0rgj1Ld0mczFfFThu0qA47IW0vWPOfEye5xPwh9KznIZsphYuJ06qVrphDQg1Z7RBI1jUDqnG9u6V2EnrpUJ5nSlzuIDR2gCyDmWtCmd/pDg2rQ2u4jfao8B+ydoDgdX2VDbPa5oN0EXgPhHRzoTWEWpCIW0FZsRO6U3S5gEMtFjitNMx7baI1gjZZ7Wd20njLiEMFlCeS818Isji80piirtT7K9A2MHyueAPhMcRas2K3Cwqz9Tr4FFFYshMNZQRomfFK3pnlpaxjb1WOLkN9KXRtqky1pa3aDM8MdtMgjCiQODeIPwrudzYKVGMPNTVQaYt2QlnAXpOPjtqWcwhyUIbHHEXSbdXpElDxWg6KtlnYY1XwlcJv+oXVpaTXEmggY0XCMUNp2GAuN0lwdBjiLjtOxQCkQRFnYV2u3QG0jj7UyAuZ1tNwt4N2ESEW0I8YHyF0OcAvb9LOzGBxJrv4Wq5rS46qkhlMt3t6QHnHtfi5XIWGrWlLMrGB7dXSnIgEoohYcmU/ByuLv4JAR9xuqqKcie306dRtXe2OeL1QNpQDgfce+kH+BzQ21xa0FeczseSCT1Y7sHYXqgXXXwlsxkfA2Bf0o3iajTG/W9K+E8u2QBklBy9E2QOaN6Xh5/Hva/14bbW6Wl4ryjgQycURpcHk8Vjv8fllenLvvpVkDH7LQUFkzZaIOlJJb0ue/P10T7+A5cLJYnMc0UV8+/Ifxl8s5kh6+l9Ec+/7pWZjCd9lGd8GsR8hyPFNbcUlhy8/meOfHI5rNj9L695DxcM0p5DZ6pecy/xxzZXSRvv9FdOfNY59eGX6+YT4j47sOsIbYTxB+CvbZvj5IS98rA4u1VLPHig5wL2kX8LWeWMb4a8o5gF92qloLd9r2M/hmCNxqjSzT4gemXH4Vf3Qr4awo43WDWlL47kpaD4PSZQCAYXuJLWp+/Uf10u5gGhtcGgd9piPFkPxtN4+A4gc2pXySLnitZrGG7rSNHE76Wl/Qm6+EYQ8TVLO+XrTPh5+sxmM5xsigm2xANpNFoaEvK76Wd1a2mMxR5DRpKSFzj+kdzS4hSI0S8+0evfwsyPaO1tIrGgIjYuZ0q/9fiLZn/0AyIuPSZbF9hMxRBvYRDHy03tdEzxyb10uI0X06o/ATDcc8bPwlcmUt/02btWyDyJCBraSkYZRyNhPw4xrk83+lLmBvYoIXAMOn+xOGAg2lMctZk6WsPclRKWG9UquhsWm2xEv6Vo4uUnFLgBxYOItyvDB62TsaCdLAKaO09g4haOVdp/SUhxhyGimzEGAapOY8Qqj2iOgOy7pAIGiNqOMYHL5R5IxWkD0j89KOrj7jCwgCjpED+JK6L2s4n6VXDtdLmCfLzdQ0gSygO41tVc/jIaS/qj1CSgLZHqVbRpY/k8QZMZJ/n9rXGQZAQOkP0rBJQGF47Ikhk/p8g+37Kfmx2yPDmOsD4VM3EbMDwBDh8qPHyGD/SlH+ShS8lsZ7TtKGP1Nu7C0ZIuTrbsFAkgLCXHr6R3n0ud+BNhDme4aWfnYTDb2Cnfpa497AAKVZIjdVpLWZpWdXNYMGTNjafZb+1r4+a2RmjZQsiKJ3tcNpQ4TmtuFy5d/x+urx/yONYuB2hPO+1ljKkhIbJZTDckOG9Lj14/V2Z8k1Evb7iUjktF/x2tDTgCEN8beyo40ljCmxGyElw19JWbEjsHiLC35Ir2BpKSw/pT2xUkeczMUvPtFBIv8eQP/APF6l0FjYS74B9KpqwvleUk8SD/tCj/hrGt/gF6J8RspWRnwq/spekYgwmN3xC50YGqWnJHpLOYl7Wn6yM57P0hStTz2bQJWhMfrOkbYQXRp5zUMtVSo50nwrVKOIamSz67R8fDMhsrXM9viN69CccBcbrSeixwB0no8biAANIoiNaC6ceP1cHk8nuRbFfSPjwUCSFoQYreNkKuY9kDNLWxlL1lZsoiHFvZQcfG5NdI4bKYjxvUl9STpMuj4AkfxUikdAVSXynBrbctV0LXRlwWF5OWzxHwhcZ4kP9Td6XpsJocwOG15lkJebC9J4I/6Ya5CTrmk1xCEYy08horVMQ4gs7QsmHjRPZRwA+OifNPbm6C9EIuIAaKSnj4CI+QFLWgADCXBPhEuBaS4qr5jI3iCjyH1HFo6QZoDCwO+0HC8jXDYJpBdI4igKTj3s4Vq0m8gWFlWsfcD3QVJA8D9IxY7kDSHkkhhXU5GbOCLIKy5spoeG2n5peDX3u1hykGTkQlf0NqB7QwV2VoMAfFQG156Kay3gd/tbOJlltCrKY4I5gY2uCR8hi+qzkwU4dLTdIZT0q+nbXfaDYeLO6B3CbpN22V3JjhQS8+K+SU2NIX9NJAHOYdIMd9gGvtDmnMWiVEc7XR8HmnKMnHc8lwpzK7CRlnxep72nagsdG2v9ys1hYQLICtZLrd2ikA+JkwArfygS44qm9ptzeJ9vyqSNcyyatTc9Oa4zXGaLQulLcwOFPFFGbM2WTifhBmY101ABYa/jd+t8fyefBBK13ype5rglnw8CaJIS/qPD6C59fxnXj+UadQS8lFClkkHYKoXvrpZXwajSefNUkak3sG0wZHuJAGwl38z/tKn+vS55clpAACk5flOvikLq4m0s7FlcelU8WivmzCD6tLTELX/AOFyuF0KXDxI/wB5VTw2/qL/ACJ/jB7+FLIHOOhpbv8AQRMN9lWGNyIDG0ts+DrDf8hlxYYaQXC7TkWPxNt0FojFDWe4IjYC5oDRpdGc+s45teT2vSLIwbaBaPFilrbIWnBjNjNuA39pPyuc2JpZGN/pUzs6WyZ44WEHv4WY3GlynmSX+Hwm8TBkzJA+bTFsPxmsjDWVxComI9gDA0DQVS1pZQ+FozRtDuNbKWfjlt/SirjLzX+ljuLV5aR5leSPtbPnZ+BMYKysaM60lDpnCica0tvFxnRkEatB8VGL2F6OHF5t92lSaPiRNZEC7doToXT5rR/sWhhsaGOY/wCtI2Dil5c7X6QFyxsYAYOlB5VpMywlrdhdG3kABVpwiLmvjJdXaHI50jaIWnlQmwEk+ItdoqdKZmRFdFo2EuYyA5zztaM/sc4Vv4WVnPdwsGq7WWq1zH36ebizlXSysvJLgaTuS4OFNOll5h4a0uvrkISuLr2s2VwDqcnJyGmw5Z2ZIOJPyp6qQVrmc2lp2tjEdykaW7C8tiuPqkkaK9P4l/AbGlUPjehjadlDyHtjNBWY7nFrSDkQ6G7QkEPY51BVyOHpltbXRwiN/IkoMkhdkUBpAZc2OHXQIKViyZoJPSNlgW+W+42AEjNj/wAyGg38pGA2aOdruRAI6VGD0wS839IMuC8ttlgqgc+EBstkIA0UjnPNjSpkH1HkAqfXY97S0UAhBpc9z2mwl9P4iPEAHK9lD9CpCVcuc2qJJ+kN0r2guI39J9pci0UZLXl3Xwkgwtc4kJoyOLR8BEfJG1rQ8dpAgXBwIb2k3l4a6+03LTpLiFBW9NoYQdk/aRkI7YS4jtGLQYg4Daa9FojLu/0rxRtMY0lyH7Uk8gFtAWqPhDjyA7T4hZyc4/CBDI0ylpboIh9oDgA3aAWAuP0nMipQeIqlUwEx0Owj4m9/wmMdgsuVRxfqMdJuSCg3k6rQ2mPHcQSK+0d4P/6NFj8mAuGh2qvlhgsurSXPlAGuY0aPRCVdizZjx2GlMcUy852VIGY4NouD4txJfk7v7Wz43xcMHEnbgtIYw5EnYQPrKGOxsdMFIGRjljCVpTtLX1VBAyHtIDSdIojEfGOz2ks2b0ojS1s3gDYK8v56bjE6jSzq5HmfJyGbIJ/aL45hLhpLQMMji4m7Wz42Ah7ddpRVa/jcYuIoL08UIbGlPHQcGggLVcA2IX2r4i1jZzzEfb8rY8a708VhPZWL5aVvqsZ8krQc7hAwA6AQDeflgM+NJPBzA6UALKypS9xPI/2TPji2xX8kQceld7zZ7KQyWhjySVp4URdFyd2snysThISD/hLQjKllPq76WT5aQEEN1a053DhZXnPIyl8lDpY/ronx99mmLQaKy8mV0ti+kaRxPJpNJVzQDorrccLyC21e1k5BeJCKsLWnHEAt7Sj3D/c3alUCwuPP3aW5jPAIAIpef9vqEp7GeXHiNKhXq45A6OgaRYjyFO2FmYllvEmytPHb6bCDtNDslo9P2BKNjJILgmHOcW9oMhIoc0BScC+6Q2NsEdhUymvJH0iRtMcX2kaA1tEBKzQtOnNtHZfMnoKwsON7QGTLiAXxFFJf000QdR7W84F79N2quh5O95pAedjmkEoaWfxQ5Miy4PFLalx6kJaO/lLs8eyR5MgB/ukZSL0zjM5OAcfhCy4eT2AOTOb4xpp0Rr+yz58XLaRTjpBjQRlg9wRDE1zT8FLsbkiMEjaGJMklzaKQGAoltqOfEED4QGx5DTyIXenO4k8dIBlzWuj/AJVaFDCI5HDkKS39PlPJoGktLFltc7uykZ5mTCwyA7Sc3kWNieG/yQofHZBJdIaBRsfxzAy5Kcf2gM6OXIyHC74p1uAZLdI+k6wRxkNAACoHtpwJu0AOHGiaz2gEhamJHbAOKrg47OAJWzihgIoKpC6pBiU3kSrNY7kRWlouaHAV0hzO9NntajhdYXkGO5U0LKyG8WHl2t7Me0d9rB8k9oaSSptVIxPISON8T0vH+VyDI8x3sL1WdkNYx1rxuQA/Jc77KzrSJwoSCvSeMhtzDSy8SMe2l6rxUcbGt5bKchWtnx8egE5PHyHWkOCJzQHNukXIm4xkfKtDyPlAH+UjjH2tSdwjjAJ+FhyS8/yAcjoJzys7Wl1O6UdXwlkzgck54LlLO2ul5jLyi6Smm17r8I8e8xCaQWCqibXpmu9LHA/S895KbkTteg8k0+mQDVLyue5oaQe0tUZjL8jM1sZaDtefIJeSU5nvL5bHSrGwPqllxva+z5bqcXD5S7pWltfK6aSyCUpK4A2umuWKSveHaOkrly6RHye132s583Ycp6qRT1v9VoXosBzHcQO15dm5brS3cAkEcVUpV67Dho9JpoPuBBSni5zwp61GSMdqu1SCT2NAGylckBrr3+lrTxB0YISM7QaB+EAo4PcyyqNnAZRRpXcd3YCzzyL7DdBJS39WDJxqleOQl2wky0lzpCOkeKQt2QgcN+qGg0KKCJBNdmiFL5GviOtoULQWn7QOCsrYPwoaGuBHS703iMn4ChgtuuygE5Wlrxv2rp+BaL0i5UfFzW1sfKVLgSWu2kfA5Q1oFFDYGhxcunrkK6VD7tNU9HF3u5dDSlszGt40LXNoCidoEcVzkk6QBnSU320lsinM0RyCjKsAhpSji9rO9lBo9UuPEu/7Ip40B8JANewlw7KYBcY9oCciIaINqIMVsjwrDoADZT2LDxs1soAmPGBI1g6W1DA1hBolLeKwy9/MjQW01gaKA0riL+hlrTH7dJTKBEJ3taU7WCMEaKycwkBLo4xstjnCyVj5rGkEuN0tTKc+yCdLD8jKGEhpWVrXP15j8hla2wxYEY5bK0PMSc5iEnCNhStq+MjDntFL1mFj8XNNLC8Uz3NIC9j46PlRcFpGdPQNc2Ia0kc0ex5Wt6pZHRbpYflZvY/j9J0o8PLIf+LPcPhB8tl+x9lQyTjmTcvkrF89ORIQ35WfPrS0TxnLLzWNHVr7X4gtwvFRtrdL5n/6e+L9aQSyN6K+k5UrWROYB/ELX8Z36zvK+Qc99NNBed8tkBrfslFzcjlIbHSxs2b1ZKCy1WmMlRb3kOTWIGsJtDga5zulpRY/KiWpRVr6Bml7H6qgs6ed3QT01vskrPmLIiSTa1tYyAme6Bu1R/pkEuO0B0oe8lvwhyWXJGax+MjqatOB5icKCzMSAj+K18KMvdxcFUS3PDSl7hyK9PAxho6Xm/HRAHQW7BJxAFK0HZAxsVWsbMcORI6T8r+A5EaSkxY8WAgM0NPpk9m107SYw5or7RJw5v8AEaUPl4RU4bSVCjYy5jtpd5p1E6TYstJGkqIWvP8ALaDF9rWWHWubLx+ESCEcg09favmxNZCSO0AIZhNtNAKplawcgQlGxh0ZLzRQZG8m8Q5BGZ53yBpNJZ9xu7FuXbgjo7pDkeHFrqUqgMriP2FeK2i/hcS0DaqXeo0hqQCleWu7VY5i11k6Qix/O3dKsoBFk9IBgkSAkFAc25aJQGPoEWrtdTmnsIAlj1eNWFd7AGjipY0uJcwLQhhYf5dIBKKJxe2gFrYzPgtJKHBGA4kBaOIC116VSJtaGAA2Oi2lV0vB5FaKu0vAulWQgj3N2mlWd4c00Vk5TnXTulou4RxvcR2sjNygK9u1KozfI0ARa8rngBzvct3yL3yvNaXmfIxvaHklZ6a4jzWfuc/3XRNLSNaVZCS9xO07iM5gKV2PQ+Fa0saQF63AbyaK0V5jxcZiYCF6Dx85209rTLOtB7uR9P5WF5xnBrgwg0tRwc23fKyvIvqOQvHwnUx4B4/15XH7WFkh2R5JsbfdZWt5CYCWWtKn4jinI8uJHC2gqIuvpX4xhDC8azQDiFfNlLS4ucBasZHRsNGmtHSxPIT+q42VVRJ9L5kjfeQQsYm3lyZyq41e0DHgc40FFjWfDmMOQ0trBjuuSUwYAyg5bWLD6hDWDaqRFpt072k30s7Ie97yT0mZZQZNDSVlcXuoBFKFw2QPtoFfK0GQ21rihxtHGu/tOxASMDGA2E4KYh9rWho2trCioBxFLPxYva0EbW5BDcIJ0rkR0zjNrpaLHgMr5S2JFpNxxDkCVSUzOuL9pNoIJ5J+Vo5AjoJaVoc8n4QAXNtp2EnyDnkPCZJaHEFZ+by5n00lR0jw11f7UHgPU5N6QpPUe2idoYc6NnEnaRnWyOB3ofaplS2QOQpAGQOFFKy+9/KygDPPIkD4QHtN70riSh7RtWY4kW9qCLyF7wQdBUiaQd7ATlNe36KGWhppBkpmuB0CbUtHpR2NkpmVxL6DUMnkaraQKvJe0/BS7YybDjpNcCXkFUfH20XZSADoW1opjDx6ou2p9AU1u7T8MXBoCcFTHAa6oH6TTIfYBWkSCJ7hsaWjBjOAbyGk5C6VgiY4FgG0eKAsN0SnG48bXGjSMz2njVpkFFerVckdcaRSByIukk/k6RwB6QAPIB3ptuqWHmn1HgdV9LWy5CWcXHpY+VQNgqaqMXOfxkNFee8rLcb9re8oxrTYK8x5R1A/Sy01yw+Q9wT2E0njSTawF60Mf2iglBevTYNNY3drWxgOXLaw/H8ixpK9DgcS2jS1iKOXuIsjSyPMS84XtaNrWnc4NIFUvP8Ak3hsZI7SpR828u9zciVrtFej/BY/TiLz2V5rzP8Aq+TcDq16z8fH9PiMISU9FkOcQfpYubyZ7habmzS88W6SGXOXMLUHIRNyyWtTCg9trPw2OJ2t7CaaAS4LRcfHcSCSV6TxuMRxIH+UHExBQK3ceJzWABulpIivFPls0Cu4PsEFLuicHdprGeeioM7hwFxJIq1p4WOYnEhvaHA4CIFP4ry8jS0kTaYhjJY08QDa14YqjAKVjaS5tLSiiLqAKpC0Jc11AaTcbdEk2gR/6ZpwtGjkFkH5QFi0/PSXlbxBNo5cHatJ5IsgByAVfTTZ3aDkANaHasq72kkhxoBISu5yWXaCFRQnbuwUNjWOB5UXfa71y8u4t6SjeXq2TQUmK0BjnNPaXLqk30pld/qgA9piPHBFuItAVDw0WGqXTXVjSK3gCWkKCGmxXSADKSCC0UCuLQ/s0VdpDu/hDlDS72koCJHmMe47+0KQtNEH3LnQ8qPK0T0OQHwkA4q4mxv7XemX7Hx8o7cYuaR0rthe0ANQAIoyHAuG0+yMyOAaFLYHAAupaMEDWsa4nZVRNRHE9rACU9A8ObRKvFjh7btE9Bost+ExAWhoslXhcKKgxc4yelRp9NhtIKSEciSl5SBJ7dfau+3C0CZtbSpxmeSmaxwb8lYmXOHE0eu1rZ7Q/i4g2FhzcWyO1oqLVxlZ8nMHsLBz6c0AiytvNd/quAApY+Wb1Sz00zGdHCP8pvHZxINWhNjOyCnMWyKSh6beGA6IUKT+N7T2s3AkDfaVoMaXg8VrKzsGyJyW0sfyXviJFJ+aw0gmisnKf7S03Sm0ZjwOe0nyx5bC9X4stbjAH6Xm88Nb5UnsLXx8gNiACXVH5pWg23tJOLnvXB/JNYkXN4Tgv4Z8bCS8CtL02NgEkECgkMDH40vU4MLjEKCuRlaNg44jALjY/a1GZIDaA0qtxxGwcigZk0cQplEq6UeAjc5zwD8rUxsa3tFdq3j8Hm4FwultY2MGOBcFMh2qRQBtNqwtSFjY2AcUbHx2uBPymG4xsK4mphZdcdJxhcxwo7VWxgVx7RWsIdZQSxkLiSBtCbzc8lFa5rXe6lEsrGglpQAiXC0qXOfNQKP67XWHWljwY8ua5FAGfYNOdQSYLBGRdpvIcHG37CUlawj2aClUAY/gDSlwa5pS8wcNNQfUdsBBiTxlrQ5vwixF7WDl38IAn5NDT2PtEbM51AjYQDgjc5oJG/lFEbeNFTBLbPcNqo28knSAG8NYXUFEUbXNP2mx6YZsWl2MJksfxQA2saDoIvAuIFUjPjceghuY5uwTYRwdWmZx0DtXgidwB7UwROmJcQaCegjIbRRC6XYx0x4kdJmNh5U4aCJw4HXZViXNF1pMh4XluiNKYT/qSAnRQ2uLmXoD9q12LbQPygVBnaG8L6QpZWOICWyXXJ7O1MgDKLkqcgrng00LPynmN5t1hVlym8jxNLMlmL5DZKmnx2ZkNugsTKe7g4taE9kC3EkilmS2Gut2ipqpGTJZkJKz8pwaSaWhO3iSQkJ9hwcFnprkmHEmwm8RwDjY2k4yWyH6TMLSX2nPwVrYz2A7G03HOWn2pLEY3lb1oBrRSqIocxLvc5Z2Y8XQWjOdfpZWZQP7TOPF+UPHyBKYglBrSR8nIDnu/ujwHbaQK1mO+gtXAa4i62seIkuAXovB48ksrWtBIRJ9Tq/G74TGfM4WNL2eIxkMQHylfE4rceJocAHVtNZDo4+zv9LSs4XzsmmOHL5Xn8rJLXuJOlfy045ENJ7WHNkBxIJNKbVTL1vh2hracFrvxg+IOaKVcLEDWBxTbrADWjSviLUxwlkYrtGgcaohc72sbtExmF5v4TIaOg2z2up0h9qtpo3Sq7IbC3lYQCs4PqVSXynFpArSac8Te9p0g5IBbo25BlnvokAbpAbG/iXHpdLKRIKRpZS6Di2kUAvLBHs7ScsjSNK7GE3ZsoM1noa/SRhOaBvkpZBzHJqkcKpwH+Vd0lR/6fX6QYP9M0ut2kfAxnSSENGghwycx7gVrYVRCwe0AnOwtmDfrtSWjmAmix0kj3ECgoYz3g8QglHwkNHHpQAa/a1YmsokgaXNjiLrIAQGXzdzpGhZzfspxuNHzLgqej7zx0EELjgRtIpWiaTKL6XNjfxv6VbdYI7CAba23kHpQ/2A6sIM01MHYKE6QlunH/KAOS2RhA0l2TOssIQudPILyFUTN9W3mkGiWVsLjY2ln5Imc6+grZha8lwN0kQ5ga6jtKnCmQ9hJN9IA2wm1aVjeL7SfuaNO0pql5mOdEKKRyaEVHtGmnc018JPIdyFEdqaojI8OWdlHZAWgY6SWRHbrWd+rnxmlruekxjOc07U0A7aO1oqwnBTMLxYspuVznNaGdLPBAr7TcUvHRqlURRMiRzIR9rHyZi67WtL7hays9oZG4/QTtOPD555eQcUzjPqikcl3PNdX2n/ABuO/Jla1gJ2grW54iGTLyGta00SvrfgPEsw8Zr3tHKlifi3io8PFbLI33a7XqJ8uN0TfTd18LTMZ6vRpntZ7j0sfyWWHC2IfkMym0x9/YKwczLLxxaa/slbBJQc/JcX8Se0mYyTxHZUmGSWQdrQZiuDQSNhRyr6+pOgBa0NND5UMIY/jVorP4oP/wBRbMV5IxI+gUwIXRMBb0gQf813+FoS/wDt0Bn5AJAopTIYCziSmpP4pKf+aAryEUPBlqsczZKb/uCh3+5K4n/uCka2VHRNHZQqcA0X/dMZP/NCE/8AmEGC+4Q4/aVhbO4l/bU5l9BExP8AloNl5DHyGqIVoLY3if8Aynpf+YlpewgCQRuI+KTTpCwBtKmN8K2T2EAu/Mka7j0CjxiZ1Fp0ksj+TVq4H/KCCEEj44zbSf2uje6QA0UzJ/yChY3wgl2uLWbKs11f3KiRR/vagDSTFjaVIn8naUZXQQYf+YgC5MoDgDSXyZmgNA7tRlf80Jef+bf7o6I7JeC/23dJbIeRu0SX/wBx/hL5n8UjDfk0KSb3OFuugpk+FTI/5SmqgLpfaR3aq4CSOh8IcXaPH05IyUzHOcKOkCXviSnD2UhP/wA0qaotOePSzp5XboJ6ftJSqVEJJTy6VmSvJHwFSX+aI34Tgp2FoeLvpHAaQLKBh/xKueyqSJkSAMppWP5SXjC+z8J6XtY3mv8Akv8A7JG8iwPnzCGdkr6R+KeM9JjHvbsrwPhf/fj/APJfXfC/+3Z/ZVEVvMFQcQdUlow6NzuRPEpiL+BQsj/lq/8AEMvNlYJCAbJS0cHJ1cSShz/+8/ytTC/5wU1UXwcYf/UFFaDsa2e0e37VH9hamP8A+0TD/9k=	2026-01-25 15:09:34.585771
\.


--
-- Data for Name: daily_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_photos (id, child_id, date, photo_url, created_at) FROM stdin;
\.


--
-- Data for Name: diary_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.diary_entries (id, child_id, date, content, photo_urls, created_at) FROM stdin;
\.


--
-- Data for Name: gamification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gamification (id, points, level, achievements, updated_at, child_id) FROM stdin;
11	70	Iniciante	[]	2026-02-27 16:34:14.992	23
12	50	Iniciante	[]	2026-02-27 18:43:45.822	24
3	80	Iniciante	[]	2026-01-25 15:10:09.413	15
14	50	Iniciante	[]	2026-02-27 19:09:01.314	26
15	55	Iniciante	[]	2026-02-27 19:11:45.224	27
16	50	Iniciante	[]	2026-02-28 16:16:16.024	28
\.


--
-- Data for Name: growth_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.growth_records (id, child_id, date, weight, height, head_circumference, notes, created_at) FROM stdin;
\.


--
-- Data for Name: health_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_records (id, child_id, date, symptoms, diagnosis, medication, notes, created_at) FROM stdin;
1	1	2026-01-25	Febre	\N	Paracetamol 		2026-01-25 09:55:47.301418
7	15	2026-01-25	Febre alta 39°	\N	Paracetamol 		2026-01-25 15:10:42.450617
8	15	2026-01-26	Cancer	\N		Morreu 	2026-01-25 15:11:00.756677
\.


--
-- Data for Name: invite_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invite_codes (id, code, child_id, created_by, used_by, relationship, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.milestones (id, child_id, date, title, description, photo_url, created_at) FROM stdin;
1	1	2026-01-25	Primeiro dentinho 	Maravilhosa 	\N	2026-01-25 09:54:43.431256
2	1	2026-01-25	Primeiro dentinho 	Maravilhosa 	\N	2026-01-25 09:54:46.251857
3	1	2026-01-25	Primeiro dentinho 	Maravilhoso. Lindo	\N	2026-01-25 09:54:56.09847
25	23	2025-12-25	Primeiro Natal Especial	Primeiro Natal em família	\N	2026-02-27 16:34:14.98436
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
jYP5mFB0IDD_jU0X9-OnyneSmB_oDOdo	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T19:08:54.487Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772222934, "iat": 1772219334, "iss": "https://test-mock-oidc.replit.app/", "jti": "1b81b3c4448201714f46d3c4a30c7eee", "sub": "test-diary-edit-user", "email": "diaryedit@test.com", "auth_time": 1772219332, "last_name": "Tester", "first_name": "Diary"}, "expires_at": 1772222934, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcyMjE5MzM0LCJleHAiOjE3NzIyMjI5MzQsInN1YiI6InRlc3QtZGlhcnktZWRpdC11c2VyIiwiZW1haWwiOiJkaWFyeWVkaXRAdGVzdC5jb20iLCJmaXJzdF9uYW1lIjoiRGlhcnkiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ.Mpu5JIhWGfIshueLdGGpBvPeU5Q6t0zlwHhpl0Or60GRPgCOGaJMsVQZp8LPsRZBGSDldsWSu7zVFDWr22tXYnWdhJsPgWtqaWH0KreEVdxGTw5IW60_2l9d7xo_QTVLKKvCLHMkeAzh_oTRSuWVPAhv6g1d5FnrF4ZVJH-A7w93T1MMFDP_B1Q0IgIcSyuUV9lwyPOAO7T3Jfw3JtWP6zlLKxNl2whkvN3JeTyfHlKzyIj459pf0bNhiy4jinscXaaSvaOYBmgUU3ieGplsoj_46QMUUUrqbDOg3oiKFkUQFIKqBMBffxORKcqGRDo-ndc0fZTwl--Mmy4nYSuObw", "refresh_token": "eyJzdWIiOiJ0ZXN0LWRpYXJ5LWVkaXQtdXNlciIsImVtYWlsIjoiZGlhcnllZGl0QHRlc3QuY29tIiwiZmlyc3RfbmFtZSI6IkRpYXJ5IiwibGFzdF9uYW1lIjoiVGVzdGVyIn0"}}}	2026-03-06 19:10:20
A_Vs9RSH8WaxsPprwdUMfKqV7NyNFcl6	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T18:43:39.213Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772221419, "iat": 1772217819, "iss": "https://test-mock-oidc.replit.app/", "jti": "fc4a57436829443374166dfc391b4dd6", "sub": "test-photo-picker-user", "email": "photopicker@test.com", "auth_time": 1772217819, "last_name": "Test", "first_name": "Photo", "profile_image": ""}, "expires_at": 1772221419, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcyMjE3ODE5LCJleHAiOjE3NzIyMjE0MTksInN1YiI6InRlc3QtcGhvdG8tcGlja2VyLXVzZXIiLCJlbWFpbCI6InBob3RvcGlja2VyQHRlc3QuY29tIiwiZmlyc3RfbmFtZSI6IlBob3RvIiwibGFzdF9uYW1lIjoiVGVzdCIsInByb2ZpbGVfaW1hZ2UiOiIifQ.M02wzqv_pz18WtdBV4nS3AdyvQt3QXTdjlZkgwZOOVHEsi3u0JWc_wjNDjyIBBB0koMw2BCEabevn1zkyfvABhDIDB88wpHFA6dCNgkec_39z429lvcpKDXOo-SYLstRJce_dWsPb9DmNl3jcXznXy2UwDH-DOnQxIB9uC5liAfNKegza690sf5HpGCFMlL08_MveteOBGeVAHFdcno0IKKuPup8pElGDbm-1mu2Amn9-52vduV-LkWIxTWqTplVkYiWOYW66syvpNvoF6MbBobUp-UT1nWfcEyYAsASjgVZZyR9i9vnStBPNRnj4t-b00B-0FrDlpuHPl1hpBDrug", "refresh_token": "eyJzdWIiOiJ0ZXN0LXBob3RvLXBpY2tlci11c2VyIiwiZW1haWwiOiJwaG90b3BpY2tlckB0ZXN0LmNvbSIsImZpcnN0X25hbWUiOiJQaG90byIsImxhc3RfbmFtZSI6IlRlc3QiLCJwcm9maWxlX2ltYWdlIjoiIn0"}}}	2026-03-06 18:45:06
rAAqdE8X5MNtqnsa8NrUZXct39c-baKD	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-08T20:59:55.763Z", "httpOnly": true, "originalMaxAge": 604799999}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772402395, "iat": 1772398795, "iss": "https://replit.com/oidc", "sub": "20233503", "email": "luan.ferreira.rosas@gmail.com", "at_hash": "jUl97ofwrqlSBTKnl9VPdg", "username": "Luan-FerreiraFe", "auth_time": 1772313686, "last_name": "Ferreira", "first_name": "Luan Ferreira", "email_verified": true}, "expires_at": 1772402395, "access_token": "y-y6Lmy2RiW8sBFH6Tyb_rt72wBKmB4tmmbosObmgfH", "refresh_token": "jGciW-GTjF4No0z21HGEopvsG-xoph_kg1aqtt0HdCH"}}}	2026-03-08 21:06:29
CZJUYwK-dl79U_Dm07DJ-gTRm69fsE0g	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T14:38:01.666Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772206681, "iat": 1772203081, "iss": "https://test-mock-oidc.replit.app/", "jti": "e84268f3236c87288d2d67b0164010ab", "sub": "test-user-push", "email": "pushtest@test.com", "auth_time": 1772203081, "last_name": "Tester", "first_name": "Push", "profile_image": ""}, "expires_at": 1772206681, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcyMjAzMDgxLCJleHAiOjE3NzIyMDY2ODEsInN1YiI6InRlc3QtdXNlci1wdXNoIiwiZW1haWwiOiJwdXNodGVzdEB0ZXN0LmNvbSIsImZpcnN0X25hbWUiOiJQdXNoIiwibGFzdF9uYW1lIjoiVGVzdGVyIiwicHJvZmlsZV9pbWFnZSI6IiJ9.jHqdj_u0-kFZLgttn4MMjq1LjTiBJHc6R18xhH7XbyEYYEP1w7-it-QLGa07Ga-Ht3PvtCaO54lsHMRrVCCdmkkqOLkbkmKZOSqw9k8JizCuVrY5GmjTKi7HLWFbeuV03wbMwau2nJA8ZXcW4D4V2u2_J3vr9lZRCqDjNice4NswwLMBa_sBoFj_FgHyb4eHOcBxGP1nzP5t3su3MTChRdWUqeMGjwuU8rLRIs6nozHjc7QUy0vZh3rqjxei9JmvHMSpWQZ4K34QU2tTigTfVIdUasawstj5XMZ_DAfyPItdD7D20t1etsJ7jWopuVHSRL2Mfqw7UHauskFrDGepIQ", "refresh_token": "eyJzdWIiOiJ0ZXN0LXVzZXItcHVzaCIsImVtYWlsIjoicHVzaHRlc3RAdGVzdC5jb20iLCJmaXJzdF9uYW1lIjoiUHVzaCIsImxhc3RfbmFtZSI6IlRlc3RlciIsInByb2ZpbGVfaW1hZ2UiOiIifQ"}}}	2026-03-06 14:38:11
kwEilI96-Y7cWKyDj311N9hJOQNXnk-p	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T16:18:06.639Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772212686, "iat": 1772209086, "iss": "https://replit.com/oidc", "sub": "20233503", "email": "luan.ferreira.rosas@gmail.com", "at_hash": "68QIcVtaK8KM_TI6GJAjNA", "username": "Luan-FerreiraFe", "auth_time": 1772209086, "last_name": "Ferreira", "first_name": "Luan Ferreira", "email_verified": true}, "expires_at": 1772212686, "access_token": "PRurjnLVQ1VLJjttsckwhqSQ0wDGth_I4RPeo1i5h-v", "refresh_token": "Hoq4WBptF7JnwEezpcCVqCtvLhL5d_4M27u5q8zE8Hj"}}}	2026-03-06 16:22:50
20dgzzQqf1QUPTmi7rq6FTj4dQiwARpn	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T19:11:29.714Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772223089, "iat": 1772219489, "iss": "https://test-mock-oidc.replit.app/", "jti": "7e168476c410772f8e16fddd204e190b", "sub": "test-diary-crud-v2", "email": "diarycrud2@test.com", "auth_time": 1772219489, "last_name": "Tester", "first_name": "Diary"}, "expires_at": 1772223089, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcyMjE5NDg5LCJleHAiOjE3NzIyMjMwODksInN1YiI6InRlc3QtZGlhcnktY3J1ZC12MiIsImVtYWlsIjoiZGlhcnljcnVkMkB0ZXN0LmNvbSIsImZpcnN0X25hbWUiOiJEaWFyeSIsImxhc3RfbmFtZSI6IlRlc3RlciJ9.cyEMNcpDg3gNqW5yVnP7CFs7EgHlXqOUgSwqG3L29QJVt2BYRJ_7RuQZYD_MyJS1dQVm2dGECUwreamq2Tciy3iRxG-MSbbJpCN0ZLe-4elNwDZ6lRRi1kvSpVMfqP4UrkkIOHp5b67HwV4Atsj_Vf7VZQcjfrYq4-gOPrfTgVoyiiyGjhg6T5EFHWellxsdzoSdgnvIErzUMGiN_B59w2D9Jo50ghtY6-Jwh-WXwUd4lBnRi_n_1u9a1cAq9qiYOYfBzci_bp6zOWcBno-qJC21BFz-LbYdy3btqDda2gQNfCHqAKrxxgKcLWtOANqFeyuC_3dpt1X0gYhrpc9xew", "refresh_token": "eyJzdWIiOiJ0ZXN0LWRpYXJ5LWNydWQtdjIiLCJlbWFpbCI6ImRpYXJ5Y3J1ZDJAdGVzdC5jb20iLCJmaXJzdF9uYW1lIjoiRGlhcnkiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ"}}}	2026-03-06 19:12:58
iLtgEZWuPVmUYujapmYSAx2gWMH4tYOE	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T16:31:15.892Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "c376a60e-80d3-43a2-bfbc-358d249435c4", "exp": 1772213475, "iat": 1772209875, "iss": "https://test-mock-oidc.replit.app/", "jti": "aa3f48743355f4cd9ae9ae6f36dba91f", "sub": "test-user-edit-marco", "email": "editmarco@test.com", "auth_time": 1772209875, "last_name": "Tester", "first_name": "Marco"}, "expires_at": 1772213475, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzcyMjA5ODc1LCJleHAiOjE3NzIyMTM0NzUsInN1YiI6InRlc3QtdXNlci1lZGl0LW1hcmNvIiwiZW1haWwiOiJlZGl0bWFyY29AdGVzdC5jb20iLCJmaXJzdF9uYW1lIjoiTWFyY28iLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ.HHaidfKI3kqpERkWCGTTc43iZzTfxLKo6Wdc_kzMUK5XiZ20ZQ6EnMrLn27OmXjPejy4BUdvPn8ywxIPEKunYkHrK3IYNQLnSwYO0yjGAVacMI8qgFaAkqQFfXBBich1U18nbtcAqb3HGH4kEkf9SIqe6VXYwgR3CGEW0qe9BOSjdkxOjMcp1a7BO1nk21MdXO2utpvbqsjJ1WiupHvVB4aaaqBrQa8-mZ_2Vn1gFixELfZLbhC4yiEsrN23tRfw1YtnByGpkjGuQSSPClH2TbQ_nYSfmhVGsXoJrrbyART8bjwNiCnwsQb4z7aTL3CaCGvGMlzGX7VgGSBJfgIjvw", "refresh_token": "eyJzdWIiOiJ0ZXN0LXVzZXItZWRpdC1tYXJjbyIsImVtYWlsIjoiZWRpdG1hcmNvQHRlc3QuY29tIiwiZmlyc3RfbmFtZSI6Ik1hcmNvIiwibGFzdF9uYW1lIjoiVGVzdGVyIn0"}}}	2026-03-06 16:35:19
\.


--
-- Data for Name: sus_vaccines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sus_vaccines (id, name, diseases_prevented, recommended_doses, age_range) FROM stdin;
33	BCG	Tuberculose (formas graves)	Dose única	Ao nascer
34	Hepatite B	Hepatite B	1ª dose	Ao nascer (primeiras 24h)
35	Pentavalente (DTP+Hib+HB)	Difteria, Tétano, Coqueluche, Haemophilus influenzae b, Hepatite B	1ª, 2ª, 3ª dose	2, 4, 6 meses
36	VIP (Pólio Inativada)	Poliomielite (paralisia infantil)	1ª, 2ª, 3ª dose	2, 4, 6 meses
37	Pneumocócica 10-valente	Pneumonia, Meningite, Otite (doenças pneumocócicas)	1ª, 2ª dose + Reforço	2, 4 meses + reforço 12 meses
38	Rotavírus Humano	Diarreia grave por rotavírus	1ª, 2ª dose	2, 4 meses
39	Meningocócica C (conjugada)	Meningite e infecção generalizada por meningococo C	1ª, 2ª dose + Reforço	3, 5 meses + reforço 12 meses
40	Influenza (Gripe)	Gripe e suas complicações	Dose anual (campanhas)	A partir de 6 meses (campanhas anuais)
41	Febre Amarela	Febre amarela	1ª dose + Reforço	9 meses + reforço 4 anos
42	Tríplice Viral (SCR)	Sarampo, Caxumba, Rubéola	1ª dose	12 meses
43	Tetra Viral (SCRV)	Sarampo, Caxumba, Rubéola, Varicela	Dose única (2ª SCR + 1ª Varicela)	15 meses
44	DTP (Tríplice Bacteriana)	Difteria, Tétano, Coqueluche	1º reforço	15 meses
45	Hepatite A	Hepatite A	Dose única	15 meses
46	Reforço Pólio (VIP/VOP)	Poliomielite (paralisia infantil)	1º reforço	18 meses
47	DTP 2º Reforço	Difteria, Tétano, Coqueluche	2º reforço	4 anos
48	Reforço Pólio 4 anos	Poliomielite (paralisia infantil)	2º reforço	4 anos
49	Varicela (2ª dose)	Catapora (varicela)	2ª dose	4 anos
50	COVID-19 Infantil	COVID-19	Esquema conforme vacina pediátrica	6 meses a 4 anos
51	HPV Quadrivalente	HPV (Papilomavírus Humano) - prevenção de cânceres	2 doses (intervalo 6 meses)	9-14 anos (meninas) / 11-14 anos (meninos)
52	Meningocócica ACWY	Meningite meningocócica A, C, W, Y	Reforço	11-14 anos
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) FROM stdin;
ycqwYL	ycqwYL@example.com	John	Doe	\N	2026-01-25 19:11:00.773377	2026-01-25 19:11:00.773377
test-user-push	pushtest@test.com	Push	Tester	\N	2026-02-27 14:38:01.653604	2026-02-27 14:38:01.653604
test-user-edit-marco	editmarco@test.com	Marco	Tester	\N	2026-02-27 16:31:15.872761	2026-02-27 16:31:15.872761
test-photo-picker-user	photopicker@test.com	Photo	Test	\N	2026-02-27 18:43:39.099243	2026-02-27 18:43:39.099243
test-diary-edit-user	diaryedit@test.com	Diary	Tester	\N	2026-02-27 19:08:54.477685	2026-02-27 19:08:54.477685
test-diary-crud-v2	diarycrud2@test.com	Diary	Tester	\N	2026-02-27 19:11:29.680145	2026-02-27 19:11:29.680145
20233503	luan.ferreira.rosas@gmail.com	Luan Ferreira	Ferreira	\N	2026-01-25 19:12:51.25047	2026-02-28 21:54:01.446
\.


--
-- Data for Name: vaccine_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vaccine_records (id, child_id, sus_vaccine_id, dose, application_date, application_place, notes, photo_urls, created_at) FROM stdin;
30	15	33	Dose ao nascer	2026-01-25	\N	\N	\N	2026-01-25 15:09:58.403955
31	15	34	Dose ao nascer	2026-01-25	\N	\N	\N	2026-01-25 15:10:09.359226
\.


--
-- Data for Name: vaccines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vaccines (id, child_id, name, scheduled_date, administered_date, status, notes, created_at) FROM stdin;
\.


--
-- Name: caregivers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.caregivers_id_seq', 13, true);


--
-- Name: children_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.children_id_seq', 28, true);


--
-- Name: daily_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_photos_id_seq', 18, true);


--
-- Name: diary_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diary_entries_id_seq', 8, true);


--
-- Name: gamification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gamification_id_seq', 16, true);


--
-- Name: growth_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.growth_records_id_seq', 22, true);


--
-- Name: health_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.health_records_id_seq', 10, true);


--
-- Name: invite_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invite_codes_id_seq', 1, false);


--
-- Name: milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.milestones_id_seq', 25, true);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.push_subscriptions_id_seq', 1, false);


--
-- Name: sus_vaccines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sus_vaccines_id_seq', 52, true);


--
-- Name: vaccine_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vaccine_records_id_seq', 42, true);


--
-- Name: vaccines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vaccines_id_seq', 1, false);


--
-- Name: caregivers caregivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caregivers
    ADD CONSTRAINT caregivers_pkey PRIMARY KEY (id);


--
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (id);


--
-- Name: daily_photos daily_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_photos
    ADD CONSTRAINT daily_photos_pkey PRIMARY KEY (id);


--
-- Name: diary_entries diary_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diary_entries
    ADD CONSTRAINT diary_entries_pkey PRIMARY KEY (id);


--
-- Name: gamification gamification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gamification
    ADD CONSTRAINT gamification_pkey PRIMARY KEY (id);


--
-- Name: growth_records growth_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.growth_records
    ADD CONSTRAINT growth_records_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);


--
-- Name: invite_codes invite_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_code_unique UNIQUE (code);


--
-- Name: invite_codes invite_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: sus_vaccines sus_vaccines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sus_vaccines
    ADD CONSTRAINT sus_vaccines_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vaccine_records vaccine_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_records
    ADD CONSTRAINT vaccine_records_pkey PRIMARY KEY (id);


--
-- Name: vaccines vaccines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccines
    ADD CONSTRAINT vaccines_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: daily_photos_child_date_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX daily_photos_child_date_unique ON public.daily_photos USING btree (child_id, date);


--
-- Name: push_subscriptions_endpoint_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX push_subscriptions_endpoint_unique ON public.push_subscriptions USING btree (endpoint);


--
-- PostgreSQL database dump complete
--

\unrestrict Ghunch6owW3QY1LNJ9JbgUisa2dHfdMBZ9bijrMtADbrE6Y3vr8FTI89Xu0ggbJ

