-- Stations table
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    context_bytes BYTEA NOT NULL DEFAULT ''::bytea,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for stations updated_at
DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
CREATE TRIGGER update_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to notify on table changes
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(TG_TABLE_NAME, '');
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Notify triggers for stations
DROP TRIGGER IF EXISTS notify_stations_insert ON stations;
CREATE TRIGGER notify_stations_insert
    AFTER INSERT ON stations
    FOR EACH ROW
    EXECUTE FUNCTION notify_table_change();

DROP TRIGGER IF EXISTS notify_stations_update ON stations;
CREATE TRIGGER notify_stations_update
    AFTER UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION notify_table_change();

DROP TRIGGER IF EXISTS notify_stations_delete ON stations;
CREATE TRIGGER notify_stations_delete
    AFTER DELETE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION notify_table_change();
