-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('driver', 'admin');
CREATE TYPE violation_status AS ENUM ('flagged', 'cited', 'dismissed');
CREATE TYPE route_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE occupancy_source AS ENUM ('sensor', 'manual', 'prediction');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    permit_type TEXT,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parking lots table
CREATE TABLE public.parking_lots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    location JSONB NOT NULL, -- {lat: number, lng: number}
    permit_restrictions TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Occupancy history table
CREATE TABLE public.occupancy_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
    occupancy_count INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source occupancy_source NOT NULL DEFAULT 'sensor'
);

-- Violations table
CREATE TABLE public.violations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
    license_plate TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    officer_id UUID REFERENCES users(id),
    status violation_status DEFAULT 'flagged',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campus events table
CREATE TABLE public.campus_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_attendance INTEGER NOT NULL,
    impact_radius INTEGER NOT NULL, -- meters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patrol routes table
CREATE TABLE public.patrol_routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    officer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    route_data JSONB NOT NULL, -- Array of lot IDs with timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status route_status DEFAULT 'pending'
);

-- Create indexes for better performance
CREATE INDEX idx_occupancy_history_lot_timestamp ON occupancy_history(lot_id, timestamp DESC);
CREATE INDEX idx_violations_lot_timestamp ON violations(lot_id, timestamp DESC);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_campus_events_time ON campus_events(start_time, end_time);
CREATE INDEX idx_patrol_routes_officer ON patrol_routes(officer_id, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_lots_updated_at BEFORE UPDATE ON parking_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupancy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_routes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Parking lots are publicly readable
CREATE POLICY "Parking lots are publicly readable" ON parking_lots FOR SELECT TO authenticated USING (true);

-- Only admins can modify parking lots
CREATE POLICY "Only admins can modify parking lots" ON parking_lots FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Occupancy history is publicly readable
CREATE POLICY "Occupancy history is publicly readable" ON occupancy_history FOR SELECT TO authenticated USING (true);

-- Only system can insert occupancy data
CREATE POLICY "System can insert occupancy data" ON occupancy_history FOR INSERT WITH CHECK (true);

-- Violations are only visible to admins
CREATE POLICY "Violations visible to admins" ON violations FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Campus events are publicly readable
CREATE POLICY "Campus events are publicly readable" ON campus_events FOR SELECT TO authenticated USING (true);

-- Only admins can manage events
CREATE POLICY "Only admins can manage events" ON campus_events FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Patrol routes are only visible to assigned officer and admins
CREATE POLICY "Patrol routes visible to officer and admins" ON patrol_routes FOR SELECT USING (
    officer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Insert some sample data
INSERT INTO parking_lots (name, capacity, current_occupancy, location, permit_restrictions, amenities) VALUES
('Student Lot A', 200, 150, '{"lat": 40.7128, "lng": -74.0060}', ARRAY['student', 'faculty'], ARRAY['covered', 'ev_charging']),
('Faculty Lot B', 100, 45, '{"lat": 40.7138, "lng": -74.0070}', ARRAY['faculty', 'staff'], ARRAY['covered']),
('Visitor Lot C', 50, 30, '{"lat": 40.7118, "lng": -74.0050}', ARRAY['visitor'], ARRAY['handicap_accessible']),
('Main Lot D', 300, 200, '{"lat": 40.7148, "lng": -74.0080}', ARRAY['student', 'faculty', 'staff'], ARRAY['ev_charging', 'security_cameras']);

INSERT INTO campus_events (name, location, start_time, end_time, expected_attendance, impact_radius) VALUES
('Basketball Game', 'Sports Complex', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 5000, 500),
('Graduation Ceremony', 'Main Auditorium', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', 2000, 300);

-- Create functions for predictive analytics

-- Function to predict occupancy based on historical data
CREATE OR REPLACE FUNCTION predict_occupancy(lot_id UUID, prediction_time TIMESTAMP WITH TIME ZONE)
RETURNS TABLE(predicted_occupancy INTEGER, confidence DECIMAL) AS $$
DECLARE
    historical_avg DECIMAL;
    lot_capacity INTEGER;
    event_impact DECIMAL := 0;
    day_of_week INTEGER;
    hour_of_day INTEGER;
BEGIN
    -- Get lot capacity
    SELECT capacity INTO lot_capacity FROM parking_lots WHERE id = lot_id;
    
    -- Extract day of week and hour for pattern matching
    day_of_week := EXTRACT(DOW FROM prediction_time);
    hour_of_day := EXTRACT(HOUR FROM prediction_time);
    
    -- Calculate historical average for same day/hour
    SELECT COALESCE(AVG(occupancy_count), 0) INTO historical_avg
    FROM occupancy_history oh
    WHERE oh.lot_id = predict_occupancy.lot_id
    AND EXTRACT(DOW FROM timestamp) = day_of_week
    AND EXTRACT(HOUR FROM timestamp) = hour_of_day
    AND timestamp >= NOW() - INTERVAL '30 days';
    
    -- Check for nearby events that might impact parking
    SELECT COALESCE(SUM(expected_attendance * 0.3), 0) INTO event_impact
    FROM campus_events
    WHERE prediction_time BETWEEN start_time - INTERVAL '1 hour' AND end_time + INTERVAL '1 hour'
    AND ST_DWithin(
        ST_Point((location->>'lng')::FLOAT, (location->>'lat')::FLOAT),
        ST_Point(
            (SELECT (location->>'lng')::FLOAT FROM parking_lots WHERE id = lot_id),
            (SELECT (location->>'lat')::FLOAT FROM parking_lots WHERE id = lot_id)
        ),
        impact_radius
    );
    
    -- Combine historical data with event impact
    predicted_occupancy := LEAST(lot_capacity, (historical_avg + event_impact)::INTEGER);
    confidence := CASE 
        WHEN historical_avg > 0 THEN 0.8
        ELSE 0.3
    END;
    
    RETURN QUERY SELECT predicted_occupancy, confidence;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize patrol routes
CREATE OR REPLACE FUNCTION optimize_patrol_route(officer_id UUID)
RETURNS TABLE(route JSONB, estimated_time INTEGER) AS $$
DECLARE
    violation_hotspots JSONB;
    optimized_route JSONB;
BEGIN
    -- Find lots with highest violation rates in last 24 hours
    SELECT json_agg(
        json_build_object(
            'lot_id', lot_id,
            'violation_count', violation_count,
            'priority', CASE 
                WHEN violation_count > 5 THEN 'high'
                WHEN violation_count > 2 THEN 'medium'
                ELSE 'low'
            END
        ) ORDER BY violation_count DESC
    ) INTO violation_hotspots
    FROM (
        SELECT 
            lot_id,
            COUNT(*) as violation_count
        FROM violations
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status = 'flagged'
        GROUP BY lot_id
    ) hotspots;
    
    -- Create optimized route (simplified TSP solution)
    optimized_route := json_build_object(
        'stops', violation_hotspots,
        'start_time', NOW(),
        'officer_id', officer_id
    );
    
    -- Estimate time (10 minutes per stop + 5 minutes travel time)
    estimated_time := (json_array_length(violation_hotspots) * 15);
    
    RETURN QUERY SELECT optimized_route, estimated_time;
END;
$$ LANGUAGE plpgsql;