# Clerk Integration Guide

This document explains how Clerk authentication has been integrated into the Campus Parking Optimization SaaS application.

## 🔧 Integration Overview

The application now uses **Clerk** for authentication while maintaining **Supabase** for data storage. This hybrid approach provides:

- **Clerk**: Modern authentication with built-in UI components
- **Supabase**: Robust data storage and real-time capabilities
- **Seamless sync**: User profiles are automatically synchronized between services

## 📦 Installation

The following packages have been installed:

```bash
npm install @clerk/nextjs svix
```

## 🔑 Environment Variables

Add these environment variables to your `.env.local`:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Supabase Configuration (for data storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 🛠️ Setup Steps

### 1. Clerk Dashboard Setup

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Get your Publishable Key and Secret Key from the API Keys page
3. Set up a webhook endpoint for user events (see Webhook section below)

### 2. Middleware Configuration

The `src/middleware.ts` file uses `clerkMiddleware()` to protect routes:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
  '/profile(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
```

### 3. App Layout Configuration

The `src/app/layout.tsx` wraps the application with `ClerkProvider`:

```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## 🧩 Components Used

### Authentication Components

- `<SignInButton>` - Opens sign-in modal
- `<SignUpButton>` - Opens sign-up modal
- `<SignOutButton>` - Signs out the user
- `<UserButton>` - User profile dropdown
- `<SignedIn>` - Renders content when user is signed in
- `<SignedOut>` - Renders content when user is signed out

### Example Usage

```typescript
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Navigation() {
  return (
    <nav>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button>Sign Up</Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </nav>
  );
}
```

## 🔄 User Data Synchronization

### Client-Side Functions (`src/lib/clerk-auth-client.ts`)

- `getUserProfile(userId)` - Get user profile from Supabase
- `updateUserProfile(userId, updates)` - Update user profile
- `syncUserProfile(clerkUser, role)` - Sync Clerk user with Supabase

### Server-Side Functions (`src/lib/clerk-auth-server.ts`)

- `getCurrentUser()` - Get current Clerk user (server-side)
- `requireAuth()` - Ensure user is authenticated
- `requireRole(role)` - Check user role permissions

### Usage in Components

```typescript
'use client'
import { useUser } from '@clerk/nextjs'
import { getUserProfile, syncUserProfile } from '@/lib/clerk-auth-client'

export default function Dashboard() {
  const { user: clerkUser, isLoaded } = useUser()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (isLoaded && clerkUser) {
      syncUserProfile(clerkUser).then(() => {
        getUserProfile(clerkUser.id).then(setProfile)
      })
    }
  }, [isLoaded, clerkUser])

  // Component JSX...
}
```

## 🪝 Webhook Integration

### Webhook Endpoint

The `/api/webhooks/clerk` endpoint handles user lifecycle events:

- `user.created` - Creates user profile in Supabase
- `user.updated` - Updates user profile in Supabase  
- `user.deleted` - Removes user profile from Supabase

### Webhook Setup

1. In Clerk Dashboard, go to Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy the webhook secret to `CLERK_WEBHOOK_SECRET`

## 🗄️ Database Schema

The Supabase `users` table stores extended user information:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'driver',
  permit_type TEXT,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Security Features

### Row Level Security (RLS)

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);
```

### Route Protection

Protected routes automatically redirect unauthenticated users:
- `/dashboard` - Driver dashboard
- `/admin` - Admin dashboard (requires admin role)
- `/profile` - User profile management

## 🚀 Deployment

### Vercel Environment Variables

Set these in your Vercel dashboard:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Build Configuration

The `next.config.js` includes fallback keys for build-time:

```javascript
const nextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder_key_for_build_only',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_placeholder_key_for_build_only',
  },
};
```

## 🧪 Testing

### Local Development

1. Set up test keys in `.env.local`
2. Run `npm run dev`
3. Test sign-up/sign-in flows
4. Verify user profile synchronization

### Production Testing

1. Deploy to Vercel with production keys
2. Test webhook functionality
3. Verify role-based access control
4. Test user profile updates

## 🔄 Migration from Supabase Auth

### What Changed

- **Removed**: Supabase Auth pages (`/auth/login`, `/auth/register`)
- **Added**: Clerk authentication components
- **Updated**: All authentication logic to use Clerk
- **Maintained**: Supabase for data storage and business logic

### Data Preservation

- Existing user data in Supabase is preserved
- User profiles are linked by Clerk user ID
- No data migration required

## 🎯 Benefits

### For Users
- **Modern UI**: Clean, professional authentication flows
- **Social Login**: Support for Google, GitHub, etc. (configurable)
- **Security**: Industry-standard security practices
- **Mobile-Friendly**: Responsive authentication components

### For Developers
- **Easy Integration**: Minimal setup required
- **Customizable**: Extensive theming and customization options
- **Analytics**: Built-in user analytics and insights
- **Maintenance**: Managed authentication service

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js App Router Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Webhook Reference](https://clerk.com/docs/integrations/webhooks)
- [Customization Guide](https://clerk.com/docs/customization/overview)

## 🆘 Troubleshooting

### Common Issues

1. **Invalid Publishable Key**: Ensure environment variables are set correctly
2. **Webhook Failures**: Check webhook secret and endpoint URL
3. **Build Errors**: Verify fallback keys in next.config.js
4. **Profile Sync Issues**: Check Supabase RLS policies

### Debug Tips

- Use Clerk Dashboard logs for authentication issues
- Check Vercel function logs for webhook problems
- Verify Supabase logs for database sync issues
- Test with placeholder data in development