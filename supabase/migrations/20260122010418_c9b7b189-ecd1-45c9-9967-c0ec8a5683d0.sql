-- Step 2: Create scoped permission functions and policies

-- 1. Create scoped permission check function
CREATE OR REPLACE FUNCTION public.has_scoped_role(
    _user_id uuid,
    _role text,
    _cidade text DEFAULT NULL,
    _regiao text DEFAULT NULL,
    _cell_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role::text = _role
          AND ur.revoked_at IS NULL
          AND (
              (_cidade IS NULL AND _regiao IS NULL AND _cell_id IS NULL)
              OR (_cidade IS NOT NULL AND ur.cidade = _cidade)
              OR (_regiao IS NOT NULL AND ur.regiao = _regiao)
              OR (_cell_id IS NOT NULL AND ur.cell_id = _cell_id)
          )
    )
$$;

-- 2. Function to check if user can manage a target city
CREATE OR REPLACE FUNCTION public.can_manage_cidade(_user_id uuid, _target_cidade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.revoked_at IS NULL
          AND (
              ur.role::text = 'admin'
              OR ur.role::text = 'coordenador_estadual'
              OR (ur.role::text = 'coordenador_municipal' AND ur.cidade = _target_cidade)
              OR (ur.role::text = 'coordenador_regional' AND EXISTS (
                  SELECT 1 FROM public.profiles p 
                  WHERE p.city = _target_cidade 
                    AND p.state = ur.regiao
              ))
          )
    )
$$;

-- 3. Function to get user's managed cities
CREATE OR REPLACE FUNCTION public.get_managed_cities(_user_id uuid)
RETURNS TABLE(cidade text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT p.city
    FROM public.profiles p
    WHERE p.city IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = _user_id 
              AND ur.revoked_at IS NULL
              AND ur.role::text IN ('admin', 'coordenador_estadual')
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = _user_id 
              AND ur.revoked_at IS NULL
              AND ur.role::text = 'coordenador_municipal'
              AND ur.cidade = p.city
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = _user_id 
              AND ur.revoked_at IS NULL
              AND ur.role::text = 'coordenador_regional'
              AND ur.regiao = p.state
        )
    )
$$;

-- 4. Function to get user's highest role label
CREATE OR REPLACE FUNCTION public.get_user_role_label(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE ur.role::text
            WHEN 'admin' THEN 'Admin Estadual'
            WHEN 'coordenador_estadual' THEN 'Coordenador Estadual'
            WHEN 'coordenador_regional' THEN 'Coordenador Regional — ' || COALESCE(ur.regiao, '')
            WHEN 'coordenador_municipal' THEN 'Coordenador Municipal — ' || COALESCE(ur.cidade, '')
            WHEN 'coordenador_celula' THEN 'Coordenador de Célula'
            WHEN 'moderador_celula' THEN 'Moderador de Célula'
            ELSE 'Voluntário'
        END
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.revoked_at IS NULL
    ORDER BY 
        CASE ur.role::text
            WHEN 'admin' THEN 1
            WHEN 'coordenador_estadual' THEN 2
            WHEN 'coordenador_regional' THEN 3
            WHEN 'coordenador_municipal' THEN 4
            WHEN 'coordenador_celula' THEN 5
            WHEN 'moderador_celula' THEN 6
            ELSE 7
        END
    LIMIT 1
$$;

-- 5. Create the audit function for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
        VALUES (
            auth.uid(),
            'role_granted',
            'user_roles',
            NEW.id,
            jsonb_build_object(
                'target_user_id', NEW.user_id,
                'role', NEW.role::text,
                'cidade', NEW.cidade,
                'regiao', NEW.regiao,
                'cell_id', NEW.cell_id
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (
            auth.uid(),
            'role_revoked',
            'user_roles',
            NEW.id,
            jsonb_build_object(
                'target_user_id', OLD.user_id,
                'role', OLD.role::text
            ),
            jsonb_build_object(
                'reason', NEW.reason,
                'revoked_by', NEW.revoked_by
            )
        );
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Create trigger for role auditing
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
    AFTER INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_role_change();

-- 7. Update is_coordinator to check for active roles only
CREATE OR REPLACE FUNCTION public.is_coordinator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND revoked_at IS NULL
          AND role::text IN ('coordenador_celula', 'moderador_celula', 'coordenador_municipal', 'coordenador_regional', 'coordenador_estadual', 'admin')
    )
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_scoped_role(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_cidade(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_managed_cities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_label(uuid) TO authenticated;

-- 9. Update RLS policies for user_roles
DROP POLICY IF EXISTS "Coordinators can view all roles" ON public.user_roles;
CREATE POLICY "Coordinators can view all roles"
ON public.user_roles
FOR SELECT
USING (is_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Coordinators can grant roles" ON public.user_roles;
CREATE POLICY "Coordinators can grant roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
    is_coordinator(auth.uid()) 
    AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Coordinators can revoke roles" ON public.user_roles;
CREATE POLICY "Coordinators can revoke roles"
ON public.user_roles
FOR UPDATE
USING (is_coordinator(auth.uid()))
WITH CHECK (revoked_by = auth.uid());