-- 1. Add coordinator access to view all profiles
CREATE POLICY "Coordinators can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_coordinator(auth.uid()));

-- 2. Fix approve_volunteer function - add authorization check and use auth.uid()
CREATE OR REPLACE FUNCTION public.approve_volunteer(_user_id uuid, _cell_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify caller is coordinator
    IF NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Apenas coordenadores podem aprovar voluntários';
    END IF;

    -- Update profile status using actual caller ID
    UPDATE public.profiles 
    SET volunteer_status = 'ativo',
        approved_at = NOW(),
        approved_by = auth.uid(),
        rejection_reason = NULL
    WHERE id = _user_id;
    
    -- If cell_id provided, add cell membership
    IF _cell_id IS NOT NULL THEN
        INSERT INTO public.cell_memberships (user_id, cell_id)
        VALUES (_user_id, _cell_id)
        ON CONFLICT (user_id, cell_id) DO NOTHING;
    END IF;
END;
$function$;

-- 3. Fix reject_volunteer function - add authorization check and use auth.uid()
CREATE OR REPLACE FUNCTION public.reject_volunteer(_user_id uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify caller is coordinator
    IF NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Apenas coordenadores podem recusar voluntários';
    END IF;

    UPDATE public.profiles 
    SET volunteer_status = 'recusado',
        approved_at = NOW(),
        approved_by = auth.uid(),
        rejection_reason = _reason
    WHERE id = _user_id;
END;
$function$;

-- 4. Create secure admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    week_ago TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verify caller is coordinator
    IF NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    
    week_ago := NOW() - INTERVAL '7 days';
    
    SELECT json_build_object(
        'totalUsers', (SELECT COUNT(*) FROM profiles),
        'activeUsers', (SELECT COUNT(*) FROM profiles WHERE onboarding_status = 'concluido' AND volunteer_status = 'ativo'),
        'pendingVolunteers', (SELECT COUNT(*) FROM profiles WHERE volunteer_status = 'pendente'),
        'totalMissions', (SELECT COUNT(*) FROM missions),
        'completedMissions', (SELECT COUNT(*) FROM missions WHERE status IN ('validada', 'concluida')),
        'pendingEvidences', (SELECT COUNT(*) FROM evidences WHERE status = 'pendente'),
        'totalCells', (SELECT COUNT(*) FROM cells WHERE is_active = true),
        'missionsThisWeek', (SELECT COUNT(*) FROM missions WHERE created_at >= week_ago),
        'newUsersThisWeek', (SELECT COUNT(*) FROM profiles WHERE created_at >= week_ago)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 5. Fix storage policies for evidences bucket
-- Make bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'evidences';

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view evidence images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view evidence files" ON storage.objects;

-- Keep/create secure policies
DROP POLICY IF EXISTS "Users can view own evidence" ON storage.objects;
CREATE POLICY "Users can view own evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Coordinators can view all evidence for validation
CREATE POLICY "Coordinators can view all evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidences'
  AND is_coordinator(auth.uid())
);