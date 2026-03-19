import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Expected schema definition ──────────────────────────────────────
const REQUIRED_TABLES: Record<string, { columns: string[]; description: string }> = {
  profiles: {
    columns: ["id", "user_id", "full_name", "city_id", "cell_id", "created_at", "updated_at", "onboarding_complete"],
    description: "Perfis de voluntários",
  },
  convites: {
    columns: ["id", "code", "criado_por", "criado_em", "ativo"],
    description: "Convites de acesso",
  },
  convites_usos: {
    columns: ["id", "convite_id", "usado_por", "usado_em"],
    description: "Registro de uso de convites",
  },
  missions: {
    columns: ["id", "created_at", "status"],
    description: "Missões",
  },
  mission_progress: {
    columns: ["id", "mission_id", "user_id"],
    description: "Progresso de missões",
  },
  evidences: {
    columns: ["id", "created_at"],
    description: "Evidências",
  },
  ciclos_semanais: {
    columns: ["id", "inicio", "fim", "status", "created_at"],
    description: "Ciclos semanais",
  },
  crm_contatos: {
    columns: ["id", "nome", "criado_por", "status", "created_at", "updated_at", "consentimento_lgpd"],
    description: "Contatos CRM",
  },
  crm_event_invites: {
    columns: ["id", "contact_id", "created_at"],
    description: "Convites de evento CRM",
  },
  cells: {
    columns: ["id", "name", "city", "state", "created_at"],
    description: "Células",
  },
  cell_memberships: {
    columns: ["id", "cell_id", "user_id", "status"],
    description: "Membros de células",
  },
  coord_roles: {
    columns: ["id", "user_id", "role", "created_at"],
    description: "Papéis de coordenação",
  },
  coord_audit_log: {
    columns: ["id", "action", "actor_profile_id", "created_at"],
    description: "Log de auditoria de coordenação",
  },
  atividades: {
    columns: ["id", "titulo", "inicio_em", "status", "created_at"],
    description: "Atividades/Agenda",
  },
  growth_events: {
    columns: ["id", "user_id", "event_type"],
    description: "Eventos de growth",
  },
  app_errors: {
    columns: ["id", "error_code", "severity", "occurred_at"],
    description: "Erros do app",
  },
  content_items: {
    columns: ["id", "title", "status", "created_at"],
    description: "Itens de conteúdo (Fábrica)",
  },
  assets: {
    columns: ["id", "path", "title", "created_at"],
    description: "Arquivos/assets",
  },
  cursos_formacao: {
    columns: ["id", "titulo", "created_at"],
    description: "Cursos de formação",
  },
  aulas_formacao: {
    columns: ["id", "curso_id", "titulo"],
    description: "Aulas de formação",
  },
  admins: {
    columns: ["user_id", "created_at"],
    description: "Administradores",
  },
};

const REQUIRED_RPCS = [
  "get_db_contract_health",
  "get_my_daily_plan",
  "get_my_streak_metrics",
  "get_my_reactivation_status",
  "get_my_due_followups",
  "generate_street_mission",
  "generate_conversation_mission",
  "can_operate_coord",
  "list_coord_roles",
  "grant_coord_role",
  "revoke_coord_role",
  "list_coord_audit_log",
  "get_caller_coord_level",
  "list_city_cells",
  "upsert_cell",
  "get_cell_ops_kpis",
  "approve_and_assign_request",
  "list_pending_volunteers",
  "approve_volunteer",
  "reject_volunteer",
];

interface CheckResult {
  key: string;
  category: "table" | "column" | "rls" | "rpc";
  status: "ok" | "warning" | "missing";
  detail: string;
  fix?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check - must be admin or coordinator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: adminRow } = await adminClient
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: coordRow } = await adminClient
      .from("coord_roles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!adminRow && !coordRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checks: CheckResult[] = [];

    // ── 1. Check tables ──
    const { data: tables } = await adminClient.rpc("get_db_doctor_tables" as any).catch(() => ({ data: null }));

    // Fallback: query information_schema directly via SQL
    const { data: tableRows } = await adminClient
      .from("information_schema.tables" as any)
      .select("table_name")
      .eq("table_schema", "public")
      .catch(() => ({ data: null }));

    // Use raw SQL via postgres
    const { data: rawTables, error: rawErr } = await adminClient.rpc("sql_list_public_tables" as any).catch(() => ({ data: null, error: "no rpc" }));

    // Direct approach - query pg_tables
    let existingTables: Set<string>;
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/sql_list_public_tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const d = await resp.json();
        existingTables = new Set(Array.isArray(d) ? d.map((r: any) => r.table_name || r) : []);
      } else {
        throw new Error("rpc failed");
      }
    } catch {
      // Fallback: use service role to query via PostgREST introspection
      // We'll query a known table to see what's available
      existingTables = new Set<string>();

      // Try each required table to see if it exists
      for (const tableName of Object.keys(REQUIRED_TABLES)) {
        try {
          const { error } = await adminClient.from(tableName).select("*", { count: "exact", head: true });
          if (!error) {
            existingTables.add(tableName);
          }
        } catch {
          // table doesn't exist
        }
      }
    }

    for (const [tableName, spec] of Object.entries(REQUIRED_TABLES)) {
      if (existingTables.has(tableName)) {
        checks.push({
          key: `table_${tableName}`,
          category: "table",
          status: "ok",
          detail: `${spec.description} — existe`,
        });

        // ── 2. Check columns for existing tables ──
        for (const col of spec.columns) {
          try {
            // Try selecting the column
            const { error } = await adminClient
              .from(tableName)
              .select(col)
              .limit(0);
            if (error) {
              checks.push({
                key: `col_${tableName}_${col}`,
                category: "column",
                status: "missing",
                detail: `Coluna "${col}" não encontrada em ${tableName}`,
                fix: `Adicione a coluna "${col}" à tabela "${tableName}". Peça ao Lovable: "Adicionar coluna ${col} à tabela ${tableName}"`,
              });
            } else {
              checks.push({
                key: `col_${tableName}_${col}`,
                category: "column",
                status: "ok",
                detail: `${tableName}.${col} existe`,
              });
            }
          } catch {
            checks.push({
              key: `col_${tableName}_${col}`,
              category: "column",
              status: "warning",
              detail: `Não foi possível verificar ${tableName}.${col}`,
            });
          }
        }
      } else {
        checks.push({
          key: `table_${tableName}`,
          category: "table",
          status: "missing",
          detail: `${spec.description} — tabela não encontrada`,
          fix: `Crie a tabela "${tableName}" com as colunas: ${spec.columns.join(", ")}. Peça ao Lovable: "Criar tabela ${tableName} para ${spec.description} com colunas ${spec.columns.join(", ")}"`,
        });
      }
    }

    // ── 3. Check RLS ──
    for (const tableName of existingTables) {
      if (!REQUIRED_TABLES[tableName]) continue;
      try {
        // Check if RLS is enabled by trying a query with anon key
        // We can check pg_tables.rowsecurity via service role
        const { data: rlsData } = await adminClient
          .rpc("check_rls_enabled" as any, { p_table: tableName })
          .catch(() => ({ data: null }));

        if (rlsData === false) {
          checks.push({
            key: `rls_${tableName}`,
            category: "rls",
            status: "warning",
            detail: `RLS pode estar desabilitado em ${tableName}`,
            fix: `Habilite RLS na tabela "${tableName}". Peça ao Lovable: "Habilitar Row Level Security na tabela ${tableName} e criar políticas de acesso adequadas"`,
          });
        } else if (rlsData === true) {
          checks.push({
            key: `rls_${tableName}`,
            category: "rls",
            status: "ok",
            detail: `RLS habilitado em ${tableName}`,
          });
        }
        // If null/error, skip silently
      } catch {
        // Skip
      }
    }

    // ── 4. Check RPCs ──
    for (const rpcName of REQUIRED_RPCS) {
      try {
        // Try calling with empty args - we expect either success or argument error, not "function not found"
        const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({}),
        });
        const status = resp.status;
        if (status === 404) {
          checks.push({
            key: `rpc_${rpcName}`,
            category: "rpc",
            status: "missing",
            detail: `RPC "${rpcName}" não encontrada`,
            fix: `Crie a função "${rpcName}" no banco de dados. Peça ao Lovable: "Criar a RPC/função ${rpcName} no banco de dados"`,
          });
        } else {
          // 200, 400 (bad args), etc. means it exists
          checks.push({
            key: `rpc_${rpcName}`,
            category: "rpc",
            status: "ok",
            detail: `RPC "${rpcName}" existe`,
          });
        }
      } catch {
        checks.push({
          key: `rpc_${rpcName}`,
          category: "rpc",
          status: "warning",
          detail: `Não foi possível verificar RPC "${rpcName}"`,
        });
      }
    }

    // ── Summary ──
    const missing = checks.filter((c) => c.status === "missing");
    const warnings = checks.filter((c) => c.status === "warning");
    const ok = checks.filter((c) => c.status === "ok");

    const result = {
      ok: missing.length === 0 && warnings.length === 0,
      ts: new Date().toISOString(),
      summary: {
        total: checks.length,
        ok: ok.length,
        warnings: warnings.length,
        missing: missing.length,
      },
      checks,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "internal", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
