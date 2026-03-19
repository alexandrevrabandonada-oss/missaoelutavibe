-- Add volunteer_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS volunteer_status TEXT DEFAULT 'pendente' CHECK (volunteer_status IN ('pendente', 'ativo', 'recusado'));

-- Add rejection_reason column to profiles for when volunteers are rejected
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approved_at timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add approved_by reference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Update handle_new_user function to set initial status and pending role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile with pending status
    INSERT INTO public.profiles (id, full_name, volunteer_status)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'pendente');
    
    -- Assign pending volunteer role (they can't do anything until approved)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'voluntario');
    
    RETURN NEW;
END;
$$;

-- Create function to approve volunteer
CREATE OR REPLACE FUNCTION public.approve_volunteer(
    _user_id UUID,
    _approved_by UUID,
    _cell_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update profile status
    UPDATE public.profiles 
    SET volunteer_status = 'ativo',
        approved_at = NOW(),
        approved_by = _approved_by,
        rejection_reason = NULL
    WHERE id = _user_id;
    
    -- If cell_id provided, add cell membership
    IF _cell_id IS NOT NULL THEN
        INSERT INTO public.cell_memberships (user_id, cell_id)
        VALUES (_user_id, _cell_id)
        ON CONFLICT (user_id, cell_id) DO NOTHING;
    END IF;
END;
$$;

-- Create function to reject volunteer
CREATE OR REPLACE FUNCTION public.reject_volunteer(
    _user_id UUID,
    _rejected_by UUID,
    _reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles 
    SET volunteer_status = 'recusado',
        approved_at = NOW(),
        approved_by = _rejected_by,
        rejection_reason = _reason
    WHERE id = _user_id;
END;
$$;

-- Create function to check if user is pending approval
CREATE OR REPLACE FUNCTION public.is_pending_approval(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = _user_id
        AND volunteer_status = 'pendente'
    )
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved_volunteer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = _user_id
        AND volunteer_status = 'ativo'
    )
$$;

-- Update existing profiles to be approved (legacy users)
UPDATE public.profiles 
SET volunteer_status = 'ativo', approved_at = NOW()
WHERE volunteer_status IS NULL OR volunteer_status = 'pendente';