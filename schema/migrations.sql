--
-- PostgreSQL database dump
--

-- Dumped from database version 11.13 (Ubuntu 11.13-2.heroku1+1)
-- Dumped by pg_dump version 13.2

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
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.migrations VALUES (17, '/20200414223125-remove-m', '2020-04-19 13:06:56.962');
INSERT INTO public.migrations VALUES (2, '/20190916035453-add-protocol', '2019-09-15 23:19:18.136');
INSERT INTO public.migrations VALUES (19, '/20210828204743-tokens-table', '2021-08-30 13:28:18.372');
INSERT INTO public.migrations VALUES (5, '/20190916064723-fill-protocols', '2019-09-16 00:08:54.205');
INSERT INTO public.migrations VALUES (6, '/20190916160019-add-slashes', '2019-09-16 09:04:51.495');
INSERT INTO public.migrations VALUES (7, '/20190916161050-name-and-timestamp', '2019-09-16 09:16:34.562');
INSERT INTO public.migrations VALUES (8, '/20190918010159-add-session-table', '2019-09-17 18:06:59.561');
INSERT INTO public.migrations VALUES (9, '/20190921162004-drop-protocol-column', '2019-09-21 09:28:32.666');
INSERT INTO public.migrations VALUES (20, '/20210904201037-tokens-last-used', '2021-09-04 16:42:52.201');
INSERT INTO public.migrations VALUES (12, '/20190922184344-dogears-id', '2019-09-22 13:10:41.53');
INSERT INTO public.migrations VALUES (13, '/20190922184357-users-table', '2019-09-22 13:10:41.931');
INSERT INTO public.migrations VALUES (14, '/20190923014355-reify-userid', '2019-09-22 18:52:22.488');
INSERT INTO public.migrations VALUES (15, '/20191005195605-tokens-table', '2019-10-05 18:43:02.603');
INSERT INTO public.migrations VALUES (16, '/20200325212141-remove-www', '2020-04-08 12:44:59.22');


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 20, true);


--
-- PostgreSQL database dump complete
--

