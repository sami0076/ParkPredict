# Campus Parking Optimization SaaS

A comprehensive smart parking solution for campus communities, built with Next.js and Supabase.

## 🚀 Features

### For Drivers (Students, Faculty, Visitors)
- **Real-time Parking Availability**: See live occupancy data across all campus lots
- **Smart Recommendations**: Get personalized parking suggestions based on permit type, location, and preferences
- **Predictive Analytics**: View forecasted availability for better planning
- **Navigation Integration**: Get directions to your chosen parking lot
- **Permit-based Filtering**: Only see lots you're authorized to use

### For Administrators
- **Real-time Monitoring**: Dashboard with live occupancy across all lots
- **Violation Management**: Automated detection and management of parking violations
- **Patrol Route Optimization**: AI-powered route generation for enforcement officers
- **Analytics & Reporting**: Comprehensive insights into parking patterns and violations
- **Event Management**: Track campus events and their impact on parking demand

### System Integrations
- **IoT Sensors**: Real-time occupancy tracking from entrance/exit sensors
- **LPR Cameras**: Automated license plate recognition for violation detection
- **Predictive Models**: Machine learning for occupancy forecasting
- **External APIs**: Weather, events, and traffic data integration

## 🛠 Technology Stack

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **Deployment**: Vercel
- **Authentication**: Supabase Auth with role-based access control
- **Database**: PostgreSQL with Row Level Security (RLS)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-parking-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄 Database Schema

The system uses the following main tables:

- **users**: User profiles with roles (driver/admin) and preferences
- **parking_lots**: Lot information, capacity, location, and restrictions
- **occupancy_history**: Historical occupancy data from sensors
- **violations**: Parking violation records from LPR cameras
- **campus_events**: Events that impact parking demand
- **patrol_routes**: Optimized routes for enforcement officers

## 🔌 API Endpoints

### Sensor Integration
- `POST /api/sensors/occupancy` - Update lot occupancy from IoT sensors
- `GET /api/sensors/occupancy?lot_id=xxx` - Get current occupancy

### Violation Detection
- `POST /api/violations/lpr` - Report violations from LPR cameras
- `GET /api/violations/lpr` - Get violation records

### Predictive Analytics
- `POST /api/predictions/occupancy` - Generate occupancy predictions
- `GET /api/predictions/occupancy?lot_id=xxx&hours=24` - Get hourly predictions

### Route Optimization
- `POST /api/routes/optimize` - Generate optimized patrol routes
- `GET /api/routes/optimize?officer_id=xxx` - Get existing routes

## 🚀 Deployment

### Deploy to Vercel

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Set environment variables in Vercel**
   - Go to your Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add all variables from your `.env.local`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Supabase Configuration

1. **Enable Row Level Security**
   - All tables have RLS enabled with appropriate policies
   - Users can only see their own data
   - Admins have elevated permissions

2. **Set up Edge Functions** (Optional)
   - Deploy the predictive analytics functions
   - Configure route optimization algorithms

## 📱 Usage

### For Drivers

1. **Sign up** with your email and select "Driver" role
2. **Set your permit type** in your profile (student, faculty, staff, visitor)
3. **Configure preferences** (covered parking, EV charging, etc.)
4. **View recommendations** on the dashboard
5. **Get directions** to available parking lots

### For Administrators

1. **Sign up** with "Administrator" role
2. **Monitor real-time occupancy** across all lots
3. **Manage violations** from the violations tab
4. **Generate patrol routes** for officers
5. **View analytics** and export reports

### IoT Integration

Send occupancy updates to the sensor endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/sensors/occupancy \
  -H "Content-Type: application/json" \
  -d '{
    "lot_id": "lot-uuid",
    "occupancy_count": 150,
    "sensor_id": "sensor-001"
  }'
```

### LPR Integration

Report violations from license plate recognition:

```bash
curl -X POST https://your-app.vercel.app/api/violations/lpr \
  -H "Content-Type: application/json" \
  -d '{
    "lot_id": "lot-uuid",
    "license_plate": "ABC123",
    "violation_type": "No Valid Permit",
    "camera_id": "cam-001",
    "image_url": "https://example.com/image.jpg"
  }'
```

## 🔧 Configuration

### Parking Lots Setup

Add parking lots through the Supabase dashboard or API:

```sql
INSERT INTO parking_lots (name, capacity, location, permit_restrictions, amenities) 
VALUES (
  'Student Lot A', 
  200, 
  '{"lat": 40.7128, "lng": -74.0060}',
  ARRAY['student', 'faculty'],
  ARRAY['covered', 'ev_charging']
);
```

### Campus Events

Add events that affect parking demand:

```sql
INSERT INTO campus_events (name, location, start_time, end_time, expected_attendance, impact_radius)
VALUES (
  'Basketball Game',
  'Sports Complex',
  '2024-01-15 19:00:00+00',
  '2024-01-15 22:00:00+00',
  5000,
  500
);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api-docs`

## 🔮 Future Enhancements

- Mobile app with React Native
- Integration with campus ID systems
- Advanced ML models for demand prediction
- Integration with payment systems
- Multi-campus support
- Real-time notifications
- Parking reservation system