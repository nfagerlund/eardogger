--
-- PostgreSQL database dump
--

-- Dumped from database version 11.5 (Ubuntu 11.5-1.pgdg16.04+1)
-- Dumped by pg_dump version 11.5

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

ALTER TABLE ONLY public.session DROP CONSTRAINT session_pkey;
ALTER TABLE ONLY public.dogears DROP CONSTRAINT dogears_pkey;
DROP TABLE public.session;
DROP SEQUENCE public.migrations_id_seq;
DROP TABLE public.dogears;
SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: dogears; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dogears (
    prefix text NOT NULL,
    current text,
    current_protocol text,
    display_name text,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: dogears dogears_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dogears
    ADD CONSTRAINT dogears_pkey PRIMARY KEY (prefix);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- PostgreSQL database dump complete
--

