-- 1. Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check admin status (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id = _user_id
    )
$$;

-- 4. RLS policies for admins table (only admins can view/manage)
CREATE POLICY "Admins can view admins table"
ON public.admins FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage admins table"
ON public.admins FOR ALL
USING (is_admin(auth.uid()));

-- 5. Drop existing SELECT policies on profiles that might conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Coordinators can view all profiles" ON public.profiles;

-- 6. Create new unified SELECT policy for profiles
-- Users can see their own profile OR admins/coordinators can see all
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id 
    OR is_admin(auth.uid()) 
    OR is_coordinator(auth.uid())
);

-- 7. Drop existing UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 8. Create new UPDATE policy for profiles
-- Users can update their own profile OR admins/coordinators can update all
CREATE POLICY "Users can update own profile or admins can update all"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id 
    OR is_admin(auth.uid()) 
    OR is_coordinator(auth.uid())
)
WITH CHECK (
    auth.uid() = id 
    OR is_admin(auth.uid()) 
    OR is_coordinator(auth.uid())
);