-- 0001_create_bdd_scenarios.sql
-- Creates the bdd_scenarios table in the plugin schema.
-- Run with search_path = plugin_data_com_paca_bdd, public.
--
-- NOTE: If the core migration (000001_init.sql) has already created this table
-- in the public schema, the IF NOT EXISTS guard makes this a safe no-op.

CREATE TABLE IF NOT EXISTS bdd_scenarios (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title       VARCHAR      NOT NULL DEFAULT '',
    given_text  TEXT         NOT NULL DEFAULT '',
    when_text   TEXT         NOT NULL DEFAULT '',
    then_text   TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bdd_scenarios_task_id
    ON bdd_scenarios (task_id);
