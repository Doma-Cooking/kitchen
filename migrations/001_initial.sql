-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    context_bytes BYTEA NOT NULL DEFAULT ''::bytea,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger function to notify on changes
CREATE OR REPLACE FUNCTION notify_stations_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('stations', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stations table
DROP TRIGGER IF EXISTS stations_notify ON stations;
CREATE TRIGGER stations_notify
    AFTER INSERT OR UPDATE OR DELETE ON stations
    FOR EACH ROW EXECUTE FUNCTION notify_stations_change();

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stations_updated_at ON stations;
CREATE TRIGGER stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
