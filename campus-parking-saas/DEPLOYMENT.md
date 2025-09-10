# Deployment Guide

This guide walks you through deploying the Campus Parking Optimization SaaS to production.

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Vercel account (or other hosting platform)
- Domain name (optional)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name and database password
3. Wait for the project to be created

### 1.2 Set up Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL to create all tables, functions, and policies

### 1.3 Configure Authentication

1. Go to Authentication > Settings
2. Enable email authentication
3. Set up your site URL: `https://your-domain.com`
4. Configure redirect URLs for auth callbacks

### 1.4 Get API Keys

1. Go to Settings > API
2. Copy your project URL and anon key
3. Copy your service role key (keep this secret!)

## Step 2: Environment Configuration

### 2.1 Create Environment File

Create `.env.local` with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: External API Keys
WEATHER_API_KEY=your-weather-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 2.2 Update Configuration

Update any hardcoded values in the codebase:
- Campus coordinates in `src/app/dashboard/page.tsx`
- Default parking lot locations
- Campus-specific settings

## Step 3: Vercel Deployment

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Login to Vercel

```bash
vercel login
```

### 3.3 Deploy

```bash
vercel
```

Follow the prompts:
- Link to existing project? No
- What's your project's name? campus-parking-saas
- In which directory is your code located? ./
- Want to modify the settings? No

### 3.4 Set Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add all variables from your `.env.local`

### 3.5 Deploy to Production

```bash
vercel --prod
```

## Step 4: Database Seeding

### 4.1 Add Initial Data

Add some sample parking lots and events:

```sql
-- Sample parking lots
INSERT INTO parking_lots (name, capacity, current_occupancy, location, permit_restrictions, amenities) VALUES
('Student Lot A', 200, 150, '{"lat": 40.7128, "lng": -74.0060}', ARRAY['student', 'faculty'], ARRAY['covered', 'ev_charging']),
('Faculty Lot B', 100, 45, '{"lat": 40.7138, "lng": -74.0070}', ARRAY['faculty', 'staff'], ARRAY['covered']),
('Visitor Lot C', 50, 30, '{"lat": 40.7118, "lng": -74.0050}', ARRAY['visitor'], ARRAY['handicap_accessible']),
('Main Lot D', 300, 200, '{"lat": 40.7148, "lng": -74.0080}', ARRAY['student', 'faculty', 'staff'], ARRAY['ev_charging', 'security_cameras']);

-- Sample events
INSERT INTO campus_events (name, location, start_time, end_time, expected_attendance, impact_radius) VALUES
('Basketball Game', 'Sports Complex', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 5000, 500),
('Graduation Ceremony', 'Main Auditorium', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 3 hours', 2000, 300);
```

### 4.2 Create Admin User

1. Sign up through your app with an admin email
2. Update the user role in Supabase:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@campus.edu';
```

## Step 5: IoT Integration Setup

### 5.1 Sensor Configuration

Configure your IoT sensors to send data to:
```
POST https://your-domain.com/api/sensors/occupancy
Content-Type: application/json

{
  "lot_id": "parking-lot-uuid",
  "occupancy_count": 150,
  "sensor_id": "sensor-001"
}
```

### 5.2 LPR Camera Configuration

Configure license plate recognition cameras:
```
POST https://your-domain.com/api/violations/lpr
Content-Type: application/json

{
  "lot_id": "parking-lot-uuid",
  "license_plate": "ABC123",
  "violation_type": "No Valid Permit",
  "camera_id": "cam-001",
  "image_url": "https://example.com/violation.jpg"
}
```

## Step 6: Monitoring and Maintenance

### 6.1 Set up Monitoring

1. Enable Vercel Analytics
2. Set up Supabase monitoring
3. Configure error tracking (Sentry, etc.)

### 6.2 Database Maintenance

Set up regular maintenance tasks:
- Clean old occupancy history (keep 30 days)
- Archive old violations
- Update predictive models

### 6.3 Backup Strategy

1. Enable Supabase automated backups
2. Export important configuration data
3. Document recovery procedures

## Step 7: Security Checklist

### 7.1 Environment Security

- [ ] All sensitive keys in environment variables
- [ ] No secrets in codebase
- [ ] Service role key properly secured

### 7.2 Database Security

- [ ] Row Level Security (RLS) enabled
- [ ] Proper authentication policies
- [ ] API rate limiting configured

### 7.3 Application Security

- [ ] HTTPS enforced
- [ ] Input validation on all endpoints
- [ ] Proper error handling

## Step 8: Testing

### 8.1 Functional Testing

Test all major features:
- [ ] User registration and login
- [ ] Driver dashboard functionality
- [ ] Admin dashboard features
- [ ] API endpoints
- [ ] Real-time updates

### 8.2 Integration Testing

- [ ] Sensor data ingestion
- [ ] LPR violation reporting
- [ ] Predictive analytics
- [ ] Route optimization

### 8.3 Performance Testing

- [ ] Page load times
- [ ] API response times
- [ ] Database query performance
- [ ] Real-time update latency

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check Supabase site URL configuration
   - Verify redirect URLs
   - Check environment variables

2. **Database connection errors**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Review RLS policies

3. **API endpoints failing**
   - Check service role key
   - Verify table permissions
   - Review error logs

### Logs and Debugging

- Vercel function logs: `vercel logs`
- Supabase logs: Dashboard > Logs
- Browser console for client-side issues

## Production Checklist

- [ ] Supabase project configured
- [ ] Database schema deployed
- [ ] Environment variables set
- [ ] Application deployed to Vercel
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Initial data seeded
- [ ] Admin user created
- [ ] IoT endpoints tested
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security review completed
- [ ] Performance testing passed

## Support

For deployment issues:
1. Check the logs in Vercel and Supabase
2. Review this documentation
3. Check the main README.md for additional information
4. Create an issue in the repository