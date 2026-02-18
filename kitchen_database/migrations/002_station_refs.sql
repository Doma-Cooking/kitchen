-- Create station_refs table for ref → station mapping
CREATE TABLE IF NOT EXISTS station_refs (
    ref TEXT PRIMARY KEY,
    station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_station_refs_station ON station_refs (station_id);
