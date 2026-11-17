-- Read-only pre-M9/post-M9 identity check. Run with psql -X -v ON_ERROR_STOP=1
-- -v expected_corp_id=<env CorpID> -f scripts/m9-preflight.sql.
-- No Secret/raw profile contents are printed. This does not prove full directory coverage.
\set ON_ERROR_STOP on
\if :{?expected_corp_id}
\else
  \echo 'expected_corp_id is required'
  DO $$ BEGIN RAISE EXCEPTION 'expected_corp_id is required'; END $$;
\endif
BEGIN TRANSACTION READ ONLY;
SELECT count(*) AS users,
       count(*) FILTER (WHERE corp_id <> :'expected_corp_id' OR btrim(user_id) = '') AS invalid_identity,
       count(*) FILTER (WHERE jsonb_typeof(raw_profile) <> 'object') AS invalid_profile,
       (SELECT count(*) FROM (SELECT user_id FROM wecom_users GROUP BY user_id HAVING count(*) > 1) d) AS duplicate_user_ids
FROM wecom_users;
SELECT EXISTS (SELECT 1 FROM wecom_users WHERE corp_id <> :'expected_corp_id' OR btrim(user_id) = '' OR jsonb_typeof(raw_profile) <> 'object')
       OR EXISTS (SELECT user_id FROM wecom_users GROUP BY user_id HAVING count(*) > 1) AS blocked \gset m9_
SELECT count(*) AS orphan_settings FROM user_settings s LEFT JOIN wecom_users u ON u.user_id=s.user_id WHERE u.id IS NULL;
SELECT count(*) AS orphan_personnel_links FROM personnel p LEFT JOIN wecom_users u ON u.user_id=p.wecom_user_id WHERE p.wecom_user_id IS NOT NULL AND u.id IS NULL;
-- Discover actual declared FK constraints; textual UserID associations above
-- are not represented as UUID FKs and must be reconciled separately.
SELECT conrelid::regclass AS referencing_table, conname AS foreign_key,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE contype='f' AND confrelid='wecom_users'::regclass;
COMMIT;
\if :m9_blocked
  \echo 'M9 preflight blocked: investigate identities/profiles; do not merge by name or delete users'
  DO $$ BEGIN RAISE EXCEPTION 'M9 identity preflight blocked'; END $$;
\endif
\echo 'M9 identity preflight passed; reconcile association counts and real directory coverage separately'
