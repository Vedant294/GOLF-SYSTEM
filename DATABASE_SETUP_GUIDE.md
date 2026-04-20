# 🗄️ Database Setup Guide - Fix Empty Admin Panel

## Problem
- Admin panel shows no users
- Can't run draw simulation (UUID error)
- No winners to verify
- Mock users don't exist in database

## Solution
You need to create real users in Supabase and run the seed data.

---

## 📋 Step-by-Step Setup

### Step 1: Create Users in Supabase Auth

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `xxmhaugwkjzilzifkysw`

2. **Go to Authentication:**
   - Click: **Authentication** (left sidebar)
   - Click: **Users** tab

3. **Create Admin User:**
   - Click: **Add User** → **Create new user**
   - Email: `admin@golff.in`
   - Password: `Admin@123`
   - ✅ Check: **Auto Confirm User**
   - Click: **Create User**

4. **Create Test User:**
   - Click: **Add User** → **Create new user**
   - Email: `arjun@test.in`
   - Password: `Test@123`
   - ✅ Check: **Auto Confirm User**
   - Click: **Create User**

---

### Step 2: Run Database Migrations

1. **Go to SQL Editor:**
   - Click: **SQL Editor** (left sidebar)
   - Click: **New Query**

2. **Run Migration 1 (Schema):**
   - Copy entire content from: `supabase/migrations/001_initial_schema.sql`
   - Paste in SQL Editor
   - Click: **Run**
   - Wait for success message

3. **Run Migration 2 (Seed Users):**
   - Click: **New Query**
   - Copy entire content from: `supabase/migrations/002_seed_users.sql`
   - Paste in SQL Editor
   - Click: **Run**
   - You should see 2 rows returned (admin and arjun)

4. **Run Migration 3 (Stripe & Donations):**
   - Click: **New Query**
   - Copy entire content from: `supabase/migrations/003_stripe_and_donations.sql`
   - Paste in SQL Editor
   - Click: **Run**

---

### Step 3: Verify Setup

1. **Check Users Table:**
   ```sql
   SELECT email, full_name, role, subscription_status 
   FROM profiles 
   ORDER BY role DESC;
   ```
   
   You should see:
   - admin@golff.in (role: admin)
   - arjun@test.in (role: user, status: active)

2. **Check Scores:**
   ```sql
   SELECT * FROM scores WHERE user_id IN (
     SELECT id FROM profiles WHERE email = 'arjun@test.in'
   );
   ```
   
   You should see 5 scores

3. **Check Charities:**
   ```sql
   SELECT name, slug FROM charities;
   ```
   
   You should see 6 charities

---

### Step 4: Test Your App

1. **Logout** from any mock user

2. **Login as Admin:**
   - Email: `admin@golff.in`
   - Password: `Admin@123`

3. **Check Admin Panel:**
   - Go to: `/admin/users`
   - You should see 2 users (admin + arjun)

4. **Run Draw Simulation:**
   - Go to: `/admin/draws`
   - Select current month/year
   - Click: **Run Simulation**
   - Should work without UUID errors

5. **Check Winners:**
   - Go to: `/admin/winners`
   - You should see 1 pending winner (arjun)

---

## 🔧 Alternative: Quick SQL Script

If you want to do everything in one go, run this in SQL Editor:

```sql
-- 1. Create profiles for auth users (if they exist)
INSERT INTO public.profiles (id, full_name, email, role, subscription_status, charity_contribution_pct)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'admin@golff.in' THEN 'Admin'
    WHEN u.email = 'arjun@test.in' THEN 'Arjun Sharma'
    ELSE split_part(u.email,'@',1)
  END,
  u.email,
  CASE WHEN u.email = 'admin@golff.in' THEN 'admin' ELSE 'user' END,
  CASE WHEN u.email = 'arjun@test.in' THEN 'active' ELSE 'inactive' END,
  10
FROM auth.users u
WHERE u.email IN ('admin@golff.in', 'arjun@test.in')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  subscription_status = EXCLUDED.subscription_status;

-- 2. Activate arjun's subscription
UPDATE public.profiles
SET
  subscription_plan = 'monthly',
  subscription_start = now(),
  subscription_end = now() + INTERVAL '30 days',
  charity_id = (SELECT id FROM charities WHERE slug = 'cry-india' LIMIT 1)
WHERE email = 'arjun@test.in';

-- 3. Add test scores
INSERT INTO public.scores (user_id, score, played_date)
SELECT
  p.id,
  score_val,
  CURRENT_DATE - (seq * INTERVAL '5 days')
FROM
  public.profiles p,
  (VALUES (32, 1), (28, 2), (35, 3), (41, 4), (27, 5)) AS s(score_val, seq)
WHERE p.email = 'arjun@test.in'
ON CONFLICT DO NOTHING;

-- 4. Verify
SELECT email, role, subscription_status, 
       (SELECT COUNT(*) FROM scores WHERE user_id = profiles.id) as score_count
FROM profiles 
WHERE email IN ('admin@golff.in', 'arjun@test.in');
```

---

## ✅ Success Indicators

After setup, you should have:

- ✅ 2 users in admin panel (admin + arjun)
- ✅ Arjun has 5 scores
- ✅ Can run draw simulation without errors
- ✅ 6 charities visible
- ✅ 1 pending winner in verification
- ✅ Admin dashboard shows real data

---

## 🐛 Troubleshooting

### "No users found"
→ Users not created in Supabase Auth
→ Go to Authentication → Users → Add User

### "UUID error" when running draw
→ Migration 002 not run
→ Run the seed users SQL script

### "No charities"
→ Migration 001 not run
→ Run the initial schema SQL script

### "Can't login"
→ Check password is correct
→ Check "Auto Confirm User" was enabled

---

**After completing these steps, your admin panel will be fully functional!** 🚀
