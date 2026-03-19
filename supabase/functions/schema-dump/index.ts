import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response("unauthorized", { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: adminRow } = await adminClient
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return new Response("forbidden - admin only", { status: 403, headers: corsHeaders });
    }

    // Helper to run read-only SQL via RPC (service role bypasses auth check)
    async function runSQL(query: string): Promise<any[]> {
      const { data, error } = await adminClient.rpc("run_sql_readonly", { query_text: query });
      if (error) {
        console.error("SQL error:", error.message, "Query:", query.substring(0, 100));
        return [];
      }
      return data || [];
    }

    const sql: string[] = [];
    sql.push("-- ============================================");
    sql.push("-- SCHEMA DUMP COMPLETO - Missão é Luta");
    sql.push(`-- Gerado em: ${new Date().toISOString()}`);
    sql.push("-- ============================================\n");

    // ── ENUMS ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- ENUMS");
    sql.push("-- ══════════════════════════════════════════════\n");

    const enums = await runSQL(`
      SELECT t.typname, string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) as vals
      FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname
    `);
    for (const e of enums) {
      sql.push(`CREATE TYPE public.${e.typname} AS ENUM (${e.vals});`);
    }
    sql.push("");

    // ── TABLES ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- TABLES");
    sql.push("-- ══════════════════════════════════════════════\n");

    const tables = await runSQL(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    for (const t of tables) {
      const cols = await runSQL(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default,
               character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${t.table_name}'
        ORDER BY ordinal_position
      `);

      sql.push(`CREATE TABLE public.${t.table_name} (`);
      const colDefs: string[] = [];
      for (const c of cols) {
        let type = c.data_type;
        if (type === "USER-DEFINED") type = `public.${c.udt_name}`;
        else if (type === "ARRAY") type = `${c.udt_name.replace(/^_/, "")}[]`;
        else if (type === "character varying" && c.character_maximum_length) type = `varchar(${c.character_maximum_length})`;
        
        let def = `  ${c.column_name} ${type}`;
        if (c.is_nullable === "NO") def += " NOT NULL";
        if (c.column_default) def += ` DEFAULT ${c.column_default}`;
        colDefs.push(def);
      }

      const pks = await runSQL(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' AND tc.table_name = '${t.table_name}' AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
      `);
      if (pks.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pks.map((p: any) => p.column_name).join(", ")})`);
      }

      sql.push(colDefs.join(",\n"));
      sql.push(");\n");
    }

    // ── CONSTRAINTS ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- FOREIGN KEYS & UNIQUE CONSTRAINTS");
    sql.push("-- ══════════════════════════════════════════════\n");

    const fks = await runSQL(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    for (const fk of fks) {
      sql.push(`ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table}(${fk.foreign_column});`);
    }
    sql.push("");

    // ── INDEXES ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- INDEXES");
    sql.push("-- ══════════════════════════════════════════════\n");

    const indexes = await runSQL(`
      SELECT indexdef FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `);
    for (const idx of indexes) {
      sql.push(`${idx.indexdef};`);
    }
    sql.push("");

    // ── RLS ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- ROW LEVEL SECURITY");
    sql.push("-- ══════════════════════════════════════════════\n");

    const rlsTables = await runSQL(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true ORDER BY tablename
    `);
    for (const rt of rlsTables) {
      sql.push(`ALTER TABLE public.${rt.tablename} ENABLE ROW LEVEL SECURITY;`);
    }
    sql.push("");

    const policies = await runSQL(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
    `);
    for (const p of policies) {
      let stmt = `CREATE POLICY "${p.policyname}" ON public.${p.tablename}`;
      stmt += ` AS ${p.permissive} FOR ${p.cmd} TO ${p.roles}`;
      if (p.qual) stmt += ` USING (${p.qual})`;
      if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
      stmt += ";";
      sql.push(stmt);
    }
    sql.push("");

    // ── FUNCTIONS ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- FUNCTIONS");
    sql.push("-- ══════════════════════════════════════════════\n");

    const funcs = await runSQL(`
      SELECT pg_get_functiondef(p.oid) as def
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' ORDER BY p.proname
    `);
    for (const f of funcs) {
      sql.push(`${f.def};\n`);
    }

    // ── TRIGGERS ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- TRIGGERS");
    sql.push("-- ══════════════════════════════════════════════\n");

    const triggers = await runSQL(`
      SELECT pg_get_triggerdef(t.oid) as def
      FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname
    `);
    for (const tr of triggers) {
      sql.push(`${tr.def};`);
    }
    sql.push("");

    // ── VIEWS ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- VIEWS");
    sql.push("-- ══════════════════════════════════════════════\n");

    const views = await runSQL(`
      SELECT table_name, view_definition FROM information_schema.views 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    for (const v of views) {
      sql.push(`CREATE OR REPLACE VIEW public.${v.table_name} AS\n${v.view_definition};\n`);
    }

    // ── REALTIME ──
    sql.push("-- ══════════════════════════════════════════════");
    sql.push("-- REALTIME");
    sql.push("-- ══════════════════════════════════════════════\n");

    const rtTables = await runSQL(`
      SELECT schemaname, tablename FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' ORDER BY tablename
    `);
    for (const rt of rtTables) {
      sql.push(`ALTER PUBLICATION supabase_realtime ADD TABLE ${rt.schemaname}.${rt.tablename};`);
    }

    const fullSQL = sql.join("\n");

    return new Response(fullSQL, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "attachment; filename=schema_dump.sql",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
