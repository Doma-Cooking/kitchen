-- Task execution log. One row per job completion (success or failure).
--
-- task_type convention:
--   cron/<schedule_name>  — scheduled task, where <schedule_name> is the cron job name
--   slack                 — triggered by an incoming Slack message or mention
--   api                   — triggered via the HTTP API
--   agent                 — triggered by another agent

CREATE TABLE IF NOT EXISTS task_logs (
  id          BIGSERIAL    PRIMARY KEY,
  agent_id    TEXT         NOT NULL,
  task_type   TEXT         NOT NULL,
  outcome     TEXT         NOT NULL CHECK (outcome IN ('success', 'failure')),
  duration_ms INTEGER      NOT NULL,
  error       TEXT,
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_logs_agent_id_idx  ON task_logs (agent_id);
CREATE INDEX IF NOT EXISTS task_logs_task_type_idx ON task_logs (task_type);
CREATE INDEX IF NOT EXISTS task_logs_created_at_idx ON task_logs (created_at);
