export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anuncios: {
        Row: {
          celula_id: string | null
          ciclo_id: string | null
          cidade: string | null
          created_at: string
          criado_por: string
          escopo: Database["public"]["Enums"]["anuncio_escopo"]
          fixado: boolean
          id: string
          publicado_em: string | null
          regiao: string | null
          status: Database["public"]["Enums"]["anuncio_status"]
          tags: string[] | null
          texto: string
          titulo: string
          updated_at: string
        }
        Insert: {
          celula_id?: string | null
          ciclo_id?: string | null
          cidade?: string | null
          created_at?: string
          criado_por: string
          escopo?: Database["public"]["Enums"]["anuncio_escopo"]
          fixado?: boolean
          id?: string
          publicado_em?: string | null
          regiao?: string | null
          status?: Database["public"]["Enums"]["anuncio_status"]
          tags?: string[] | null
          texto: string
          titulo: string
          updated_at?: string
        }
        Update: {
          celula_id?: string | null
          ciclo_id?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string
          escopo?: Database["public"]["Enums"]["anuncio_escopo"]
          fixado?: boolean
          id?: string
          publicado_em?: string | null
          regiao?: string | null
          status?: Database["public"]["Enums"]["anuncio_status"]
          tags?: string[] | null
          texto?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncios_lidos: {
        Row: {
          anuncio_id: string
          id: string
          lido_em: string
          user_id: string
        }
        Insert: {
          anuncio_id: string
          id?: string
          lido_em?: string
          user_id: string
        }
        Update: {
          anuncio_id?: string
          id?: string
          lido_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_lidos_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "anuncios"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          brand_pack: string
          id: string
          mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_pack?: string
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_pack?: string
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          error_code: string
          id: string
          meta: Json
          occurred_at: string
          route: string
          scope_city: string | null
          session_id: string | null
          severity: string
          source: string
          user_id: string | null
        }
        Insert: {
          error_code: string
          id?: string
          meta?: Json
          occurred_at?: string
          route: string
          scope_city?: string | null
          session_id?: string | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          error_code?: string
          id?: string
          meta?: Json
          occurred_at?: string
          route?: string
          scope_city?: string | null
          session_id?: string | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          bucket: string
          created_at: string
          created_by: string
          id: string
          kind: string
          mime_type: string | null
          path: string
          size: number | null
          status: string
          tags: string[] | null
          thumb_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          mime_type?: string | null
          path: string
          size?: number | null
          status?: string
          tags?: string[] | null
          thumb_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          mime_type?: string | null
          path?: string
          size?: number | null
          status?: string
          tags?: string[] | null
          thumb_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      atividade_rsvp: {
        Row: {
          atividade_id: string
          checkin_em: string | null
          id: string
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          atividade_id: string
          checkin_em?: string | null
          id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          atividade_id?: string
          checkin_em?: string | null
          id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_rsvp_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          celula_id: string | null
          ciclo_id: string | null
          cidade: string | null
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          fim_em: string | null
          id: string
          inicio_em: string
          local_texto: string | null
          recibo_json: Json | null
          responsavel_user_id: string | null
          status: Database["public"]["Enums"]["atividade_status"]
          tipo: Database["public"]["Enums"]["atividade_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          celula_id?: string | null
          ciclo_id?: string | null
          cidade?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          fim_em?: string | null
          id?: string
          inicio_em: string
          local_texto?: string | null
          recibo_json?: Json | null
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["atividade_status"]
          tipo?: Database["public"]["Enums"]["atividade_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          celula_id?: string | null
          ciclo_id?: string | null
          cidade?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string
          local_texto?: string | null
          recibo_json?: Json | null
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["atividade_status"]
          tipo?: Database["public"]["Enums"]["atividade_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      aula_materiais: {
        Row: {
          aula_id: string
          created_at: string
          id: string
          material_id: string
        }
        Insert: {
          aula_id: string
          created_at?: string
          id?: string
          material_id: string
        }
        Update: {
          aula_id?: string
          created_at?: string
          id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_materiais_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_formacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aula_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_base"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas_formacao: {
        Row: {
          conteudo_texto: string | null
          created_at: string
          curso_id: string
          id: string
          ordem: number
          status: Database["public"]["Enums"]["conteudo_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo_texto?: string | null
          created_at?: string
          curso_id: string
          id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["conteudo_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo_texto?: string | null
          created_at?: string
          curso_id?: string
          id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["conteudo_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_formacao_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos_formacao"
            referencedColumns: ["id"]
          },
        ]
      }
      candidaturas_chamados: {
        Row: {
          chamado_id: string
          created_at: string
          id: string
          mensagem: string | null
          status: Database["public"]["Enums"]["candidatura_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: Database["public"]["Enums"]["candidatura_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: Database["public"]["Enums"]["candidatura_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_chamados_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados_talentos"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_assignment_requests: {
        Row: {
          assigned_cell_id: string | null
          bairro: string | null
          city_id: string
          created_at: string
          disponibilidade: string | null
          id: string
          interesses: string[] | null
          notes: string | null
          profile_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_cell_id?: string | null
          bairro?: string | null
          city_id: string
          created_at?: string
          disponibilidade?: string | null
          id?: string
          interesses?: string[] | null
          notes?: string | null
          profile_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_cell_id?: string | null
          bairro?: string | null
          city_id?: string
          created_at?: string
          disponibilidade?: string | null
          id?: string
          interesses?: string[] | null
          notes?: string | null
          profile_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_assignment_requests_assigned_cell_id_fkey"
            columns: ["assigned_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_assignment_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_assignment_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_memberships: {
        Row: {
          cell_id: string
          decided_at: string | null
          decided_by: string | null
          id: string
          is_active: boolean | null
          joined_at: string
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          cell_id: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          cell_id?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_memberships_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      cells: {
        Row: {
          cidade_id: string | null
          city: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          meta_json: Json | null
          name: string
          neighborhood: string | null
          state: string
          tags: string[] | null
          tipo: Database["public"]["Enums"]["cell_tipo"]
          updated_at: string
          weekly_goal: number | null
        }
        Insert: {
          cidade_id?: string | null
          city: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meta_json?: Json | null
          name: string
          neighborhood?: string | null
          state: string
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["cell_tipo"]
          updated_at?: string
          weekly_goal?: number | null
        }
        Update: {
          cidade_id?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meta_json?: Json | null
          name?: string
          neighborhood?: string | null
          state?: string
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["cell_tipo"]
          updated_at?: string
          weekly_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cells_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_code: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_code?: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_code?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_talentos: {
        Row: {
          created_at: string
          created_by: string
          descricao: string
          escopo_cidade: string | null
          escopo_id: string
          escopo_tipo: Database["public"]["Enums"]["chamado_escopo_tipo"]
          id: string
          mission_id: string | null
          mural_post_id: string | null
          skills_requeridas: string[]
          status: Database["public"]["Enums"]["chamado_status"]
          titulo: string
          updated_at: string
          urgencia: Database["public"]["Enums"]["chamado_urgencia"]
        }
        Insert: {
          created_at?: string
          created_by: string
          descricao: string
          escopo_cidade?: string | null
          escopo_id: string
          escopo_tipo: Database["public"]["Enums"]["chamado_escopo_tipo"]
          id?: string
          mission_id?: string | null
          mural_post_id?: string | null
          skills_requeridas?: string[]
          status?: Database["public"]["Enums"]["chamado_status"]
          titulo: string
          updated_at?: string
          urgencia?: Database["public"]["Enums"]["chamado_urgencia"]
        }
        Update: {
          created_at?: string
          created_by?: string
          descricao?: string
          escopo_cidade?: string | null
          escopo_id?: string
          escopo_tipo?: Database["public"]["Enums"]["chamado_escopo_tipo"]
          id?: string
          mission_id?: string | null
          mural_post_id?: string | null
          skills_requeridas?: string[]
          status?: Database["public"]["Enums"]["chamado_status"]
          titulo?: string
          updated_at?: string
          urgencia?: Database["public"]["Enums"]["chamado_urgencia"]
        }
        Relationships: []
      }
      ciclo_missoes_ativas: {
        Row: {
          added_by: string | null
          ciclo_id: string
          created_at: string
          id: string
          mission_id: string
          ordem: number
        }
        Insert: {
          added_by?: string | null
          ciclo_id: string
          created_at?: string
          id?: string
          mission_id: string
          ordem?: number
        }
        Update: {
          added_by?: string | null
          ciclo_id?: string
          created_at?: string
          id?: string
          mission_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "ciclo_missoes_ativas_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclo_missoes_ativas_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclo_task_links: {
        Row: {
          ciclo_id: string
          created_at: string
          id: string
          meta_key: string
          task_id: string
        }
        Insert: {
          ciclo_id: string
          created_at?: string
          id?: string
          meta_key: string
          task_id: string
        }
        Update: {
          ciclo_id?: string
          created_at?: string
          id?: string
          meta_key?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciclo_task_links_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclo_task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "squad_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_semanais: {
        Row: {
          celula_id: string | null
          cidade: string | null
          created_at: string
          criado_por: string | null
          fechado_em: string | null
          fechado_por: string | null
          fechamento_json: Json | null
          fim: string
          id: string
          inicio: string
          metas_json: Json | null
          status: Database["public"]["Enums"]["ciclo_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          celula_id?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          fechamento_json?: Json | null
          fim: string
          id?: string
          inicio: string
          metas_json?: Json | null
          status?: Database["public"]["Enums"]["ciclo_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          celula_id?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          fechamento_json?: Json | null
          fim?: string
          id?: string
          inicio?: string
          metas_json?: Json | null
          status?: Database["public"]["Enums"]["ciclo_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_semanais_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades: {
        Row: {
          created_at: string
          id: string
          nome: string
          slug: string
          status: string
          uf: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          slug: string
          status?: string
          uf?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          slug?: string
          status?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          oculto: boolean
          post_id: string
          texto: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          oculto?: boolean
          post_id: string
          texto: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          oculto?: boolean
          post_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          asset_id: string
          content_id: string
          created_at: string
          id: string
          ordem: number
          role: Database["public"]["Enums"]["content_asset_role"]
        }
        Insert: {
          asset_id: string
          content_id: string
          created_at?: string
          id?: string
          ordem?: number
          role?: Database["public"]["Enums"]["content_asset_role"]
        }
        Update: {
          asset_id?: string
          content_id?: string
          created_at?: string
          id?: string
          ordem?: number
          role?: Database["public"]["Enums"]["content_asset_role"]
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          created_at: string
          created_by: string
          cta: string | null
          description: string | null
          hashtags: string[] | null
          hook: string | null
          id: string
          legenda_instagram: string | null
          legenda_tiktok: string | null
          legenda_whatsapp: string | null
          parent_content_id: string | null
          published_at: string | null
          published_by: string | null
          scope_id: string | null
          scope_tipo: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cta?: string | null
          description?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          legenda_instagram?: string | null
          legenda_tiktok?: string | null
          legenda_whatsapp?: string | null
          parent_content_id?: string | null
          published_at?: string | null
          published_by?: string | null
          scope_id?: string | null
          scope_tipo?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cta?: string | null
          description?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          legenda_instagram?: string | null
          legenda_tiktok?: string | null
          legenda_whatsapp?: string | null
          parent_content_id?: string | null
          published_at?: string | null
          published_by?: string | null
          scope_id?: string | null
          scope_tipo?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_parent_content_id_fkey"
            columns: ["parent_content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_signals: {
        Row: {
          content_id: string
          created_at: string
          id: string
          signal: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          signal: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          signal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_signals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      conversa_mission_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          mission_id: string
          notes: string | null
          outcome: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          mission_id: string
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          mission_id?: string
          notes?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversa_mission_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversa_mission_contacts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          ativo: boolean | null
          campanha_tag: string | null
          canal_declarado: string | null
          code: string
          criado_em: string
          criado_por: string
          escopo_celula: string | null
          escopo_cidade: string | null
          escopo_regiao: string | null
          id: string
          limite_uso: number | null
        }
        Insert: {
          ativo?: boolean | null
          campanha_tag?: string | null
          canal_declarado?: string | null
          code: string
          criado_em?: string
          criado_por: string
          escopo_celula?: string | null
          escopo_cidade?: string | null
          escopo_regiao?: string | null
          id?: string
          limite_uso?: number | null
        }
        Update: {
          ativo?: boolean | null
          campanha_tag?: string | null
          canal_declarado?: string | null
          code?: string
          criado_em?: string
          criado_por?: string
          escopo_celula?: string | null
          escopo_cidade?: string | null
          escopo_regiao?: string | null
          id?: string
          limite_uso?: number | null
        }
        Relationships: []
      }
      convites_usos: {
        Row: {
          convite_id: string
          id: string
          usado_em: string
          usado_por: string
        }
        Insert: {
          convite_id: string
          id?: string
          usado_em?: string
          usado_por: string
        }
        Update: {
          convite_id?: string
          id?: string
          usado_em?: string
          usado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_usos_convite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
        ]
      }
      coord_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["coord_audit_action"]
          actor_profile_id: string
          cell_id: string | null
          city_id: string | null
          created_at: string
          id: string
          meta_json: Json
          scope_type: string
          target_profile_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["coord_audit_action"]
          actor_profile_id: string
          cell_id?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          meta_json?: Json
          scope_type: string
          target_profile_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["coord_audit_action"]
          actor_profile_id?: string
          cell_id?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          meta_json?: Json
          scope_type?: string
          target_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coord_audit_log_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coord_audit_log_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      coord_picks: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string | null
          scope_id: string
          scope_tipo: string
          target_id: string
          target_type: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          scope_id: string
          scope_tipo: string
          target_id: string
          target_type: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          scope_id?: string
          scope_tipo?: string
          target_id?: string
          target_type?: string
          week_start?: string
        }
        Relationships: []
      }
      coord_roles: {
        Row: {
          cell_id: string | null
          city_id: string | null
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["coord_role_type"]
          user_id: string
        }
        Insert: {
          cell_id?: string | null
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["coord_role_type"]
          user_id: string
        }
        Update: {
          cell_id?: string | null
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["coord_role_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coord_roles_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coord_roles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinator_alert_dismissals: {
        Row: {
          alert_key: string
          created_at: string
          created_by: string
          dismissed_until: string
          id: string
          scope_kind: string
          scope_value: string
        }
        Insert: {
          alert_key: string
          created_at?: string
          created_by: string
          dismissed_until: string
          id?: string
          scope_kind: string
          scope_value: string
        }
        Update: {
          alert_key?: string
          created_at?: string
          created_by?: string
          dismissed_until?: string
          id?: string
          scope_kind?: string
          scope_value?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          order_index: number | null
          title: string
          track_id: string | null
          unlocks_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title: string
          track_id?: string | null
          unlocks_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title?: string
          track_id?: string | null
          unlocks_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contatos: {
        Row: {
          assignee_id: string | null
          atribuido_a: string | null
          bairro: string | null
          cidade: string
          consentimento_lgpd: boolean
          created_at: string
          criado_por: string
          deleted_at: string | null
          email: string | null
          escopo_id: string
          escopo_tipo: string
          id: string
          next_action_context: Json | null
          next_action_kind: string | null
          nome: string
          observacao: string | null
          origem_canal: Database["public"]["Enums"]["crm_origem_canal"]
          origem_ref: string | null
          proxima_acao_em: string | null
          status: Database["public"]["Enums"]["crm_contato_status"]
          support_level: string
          support_level_updated_at: string | null
          support_reason: string | null
          tags: string[] | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_last4: string | null
          whatsapp_norm: string | null
        }
        Insert: {
          assignee_id?: string | null
          atribuido_a?: string | null
          bairro?: string | null
          cidade: string
          consentimento_lgpd?: boolean
          created_at?: string
          criado_por: string
          deleted_at?: string | null
          email?: string | null
          escopo_id: string
          escopo_tipo: string
          id?: string
          next_action_context?: Json | null
          next_action_kind?: string | null
          nome: string
          observacao?: string | null
          origem_canal?: Database["public"]["Enums"]["crm_origem_canal"]
          origem_ref?: string | null
          proxima_acao_em?: string | null
          status?: Database["public"]["Enums"]["crm_contato_status"]
          support_level?: string
          support_level_updated_at?: string | null
          support_reason?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_last4?: string | null
          whatsapp_norm?: string | null
        }
        Update: {
          assignee_id?: string | null
          atribuido_a?: string | null
          bairro?: string | null
          cidade?: string
          consentimento_lgpd?: boolean
          created_at?: string
          criado_por?: string
          deleted_at?: string | null
          email?: string | null
          escopo_id?: string
          escopo_tipo?: string
          id?: string
          next_action_context?: Json | null
          next_action_kind?: string | null
          nome?: string
          observacao?: string | null
          origem_canal?: Database["public"]["Enums"]["crm_origem_canal"]
          origem_ref?: string | null
          proxima_acao_em?: string | null
          status?: Database["public"]["Enums"]["crm_contato_status"]
          support_level?: string
          support_level_updated_at?: string | null
          support_reason?: string | null
          tags?: string[] | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_last4?: string | null
          whatsapp_norm?: string | null
        }
        Relationships: []
      }
      crm_event_invites: {
        Row: {
          attendance_marked_by: string | null
          attended_at: string | null
          contact_id: string
          created_at: string
          event_id: string
          id: string
          last_outreach_at: string | null
          next_followup_at: string | null
          post_followup_done_at: string | null
          post_followup_due_at: string | null
          post_followup_kind: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_marked_by?: string | null
          attended_at?: string | null
          contact_id: string
          created_at?: string
          event_id: string
          id?: string
          last_outreach_at?: string | null
          next_followup_at?: string | null
          post_followup_done_at?: string | null
          post_followup_due_at?: string | null
          post_followup_kind?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_marked_by?: string | null
          attended_at?: string | null
          contact_id?: string
          created_at?: string
          event_id?: string
          id?: string
          last_outreach_at?: string | null
          next_followup_at?: string | null
          post_followup_done_at?: string | null
          post_followup_due_at?: string | null
          post_followup_kind?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_event_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followup_logs: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          kind: string
          meta: Json | null
          scheduled_for: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json | null
          scheduled_for?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          scheduled_for?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interacoes: {
        Row: {
          autor_user_id: string
          contato_id: string
          created_at: string
          id: string
          nota: string
          tipo: Database["public"]["Enums"]["crm_interacao_tipo"]
        }
        Insert: {
          autor_user_id: string
          contato_id: string
          created_at?: string
          id?: string
          nota: string
          tipo?: Database["public"]["Enums"]["crm_interacao_tipo"]
        }
        Update: {
          autor_user_id?: string
          contato_id?: string
          created_at?: string
          id?: string
          nota?: string
          tipo?: Database["public"]["Enums"]["crm_interacao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_interacoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_mission_links: {
        Row: {
          contato_id: string
          created_at: string
          id: string
          mission_id: string
        }
        Insert: {
          contato_id: string
          created_at?: string
          id?: string
          mission_id: string
        }
        Update: {
          contato_id?: string
          created_at?: string
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_mission_links_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "crm_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_mission_links_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          crm_missions_daily_limit: number
          crm_missions_opt_in: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          crm_missions_daily_limit?: number
          crm_missions_opt_in?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          crm_missions_daily_limit?: number
          crm_missions_opt_in?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cursos_formacao: {
        Row: {
          created_at: string
          descricao: string | null
          estimativa_min: number | null
          id: string
          nivel: Database["public"]["Enums"]["curso_nivel"]
          recomendado: boolean
          status: Database["public"]["Enums"]["conteudo_status"]
          tags: string[] | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          estimativa_min?: number | null
          id?: string
          nivel?: Database["public"]["Enums"]["curso_nivel"]
          recomendado?: boolean
          status?: Database["public"]["Enums"]["conteudo_status"]
          tags?: string[] | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          estimativa_min?: number | null
          id?: string
          nivel?: Database["public"]["Enums"]["curso_nivel"]
          recomendado?: boolean
          status?: Database["public"]["Enums"]["conteudo_status"]
          tags?: string[] | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          day: string
          disponibilidade: number
          escopo_id: string
          escopo_tipo: string
          foco_id: string | null
          foco_tipo: Database["public"]["Enums"]["checkin_foco_tipo"]
          id: string
          trava_texto: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          disponibilidade?: number
          escopo_id: string
          escopo_tipo?: string
          foco_id?: string | null
          foco_tipo?: Database["public"]["Enums"]["checkin_foco_tipo"]
          id?: string
          trava_texto?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          disponibilidade?: number
          escopo_id?: string
          escopo_tipo?: string
          foco_id?: string | null
          foco_tipo?: Database["public"]["Enums"]["checkin_foco_tipo"]
          id?: string
          trava_texto?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_plan_items: {
        Row: {
          checkin_id: string
          created_at: string
          id: string
          ref_id: string
          status: Database["public"]["Enums"]["plan_item_status"]
          tipo: string
        }
        Insert: {
          checkin_id: string
          created_at?: string
          id?: string
          ref_id: string
          status?: Database["public"]["Enums"]["plan_item_status"]
          tipo: string
        }
        Update: {
          checkin_id?: string
          created_at?: string
          id?: string
          ref_id?: string
          status?: Database["public"]["Enums"]["plan_item_status"]
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_items_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_plan_steps: {
        Row: {
          action_kind: string
          action_ref: string
          completed_at: string | null
          created_at: string
          day: string
          id: string
          step_key: string
          user_id: string
        }
        Insert: {
          action_kind: string
          action_ref?: string
          completed_at?: string | null
          created_at?: string
          day: string
          id?: string
          step_key: string
          user_id: string
        }
        Update: {
          action_kind?: string
          action_ref?: string
          completed_at?: string | null
          created_at?: string
          day?: string
          id?: string
          step_key?: string
          user_id?: string
        }
        Relationships: []
      }
      demandas: {
        Row: {
          atribuida_para: string | null
          contato: string | null
          created_at: string
          criada_por: string
          debate_post_id: string | null
          debate_topico_id: string | null
          descricao: string
          id: string
          prazo: string | null
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          resolucao: string | null
          status: Database["public"]["Enums"]["demanda_status"]
          territorio: string | null
          tipo: Database["public"]["Enums"]["demanda_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          atribuida_para?: string | null
          contato?: string | null
          created_at?: string
          criada_por: string
          debate_post_id?: string | null
          debate_topico_id?: string | null
          descricao: string
          id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          resolucao?: string | null
          status?: Database["public"]["Enums"]["demanda_status"]
          territorio?: string | null
          tipo: Database["public"]["Enums"]["demanda_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          atribuida_para?: string | null
          contato?: string | null
          created_at?: string
          criada_por?: string
          debate_post_id?: string | null
          debate_topico_id?: string | null
          descricao?: string
          id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          resolucao?: string | null
          status?: Database["public"]["Enums"]["demanda_status"]
          territorio?: string | null
          tipo?: Database["public"]["Enums"]["demanda_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_debate_post_id_fkey"
            columns: ["debate_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_debate_topico_id_fkey"
            columns: ["debate_topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas_updates: {
        Row: {
          autor_id: string
          created_at: string
          demanda_id: string
          id: string
          mensagem: string
          visivel_para_voluntario: boolean
        }
        Insert: {
          autor_id: string
          created_at?: string
          demanda_id: string
          id?: string
          mensagem: string
          visivel_para_voluntario?: boolean
        }
        Update: {
          autor_id?: string
          created_at?: string
          demanda_id?: string
          id?: string
          mensagem?: string
          visivel_para_voluntario?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "demandas_updates_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participations: {
        Row: {
          actions_json: Json
          checkin_at: string | null
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions_json?: Json
          checkin_at?: string | null
          completed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions_json?: Json
          checkin_at?: string | null
          completed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          campos_extras_json: Json | null
          cell_id: string | null
          checklist_json: Json | null
          content_text: string | null
          content_type: string
          content_url: string | null
          coord_feedback: string | null
          created_at: string
          geo_lat: number | null
          geo_lng: number | null
          how_to_fix: string | null
          id: string
          local_texto: string | null
          media_urls: string[] | null
          mission_id: string
          mode: Database["public"]["Enums"]["registro_mode"] | null
          receipt_hash: string | null
          registro_status: Database["public"]["Enums"]["registro_status"] | null
          rejection_reason: string | null
          rejection_reason_code: string | null
          relato_estruturado_json: Json | null
          relato_texto: string | null
          resumo: string | null
          status: Database["public"]["Enums"]["evidence_status"] | null
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          visibilidade:
            | Database["public"]["Enums"]["registro_visibilidade"]
            | null
        }
        Insert: {
          campos_extras_json?: Json | null
          cell_id?: string | null
          checklist_json?: Json | null
          content_text?: string | null
          content_type: string
          content_url?: string | null
          coord_feedback?: string | null
          created_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          how_to_fix?: string | null
          id?: string
          local_texto?: string | null
          media_urls?: string[] | null
          mission_id: string
          mode?: Database["public"]["Enums"]["registro_mode"] | null
          receipt_hash?: string | null
          registro_status?:
            | Database["public"]["Enums"]["registro_status"]
            | null
          rejection_reason?: string | null
          rejection_reason_code?: string | null
          relato_estruturado_json?: Json | null
          relato_texto?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["evidence_status"] | null
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          visibilidade?:
            | Database["public"]["Enums"]["registro_visibilidade"]
            | null
        }
        Update: {
          campos_extras_json?: Json | null
          cell_id?: string | null
          checklist_json?: Json | null
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          coord_feedback?: string | null
          created_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          how_to_fix?: string | null
          id?: string
          local_texto?: string | null
          media_urls?: string[] | null
          mission_id?: string
          mode?: Database["public"]["Enums"]["registro_mode"] | null
          receipt_hash?: string | null
          registro_status?:
            | Database["public"]["Enums"]["registro_status"]
            | null
          rejection_reason?: string | null
          rejection_reason_code?: string | null
          relato_estruturado_json?: Json | null
          relato_texto?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["evidence_status"] | null
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          visibilidade?:
            | Database["public"]["Enums"]["registro_visibilidade"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "evidences_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      fabrica_downloads: {
        Row: {
          action: string
          action_date: string
          created_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          action: string
          action_date?: string
          created_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          action?: string
          action_date?: string
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fabrica_downloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fabrica_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      fabrica_templates: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          attachments_json: Json | null
          created_at: string
          created_by: string
          hashtags: string[] | null
          id: string
          instrucoes: string | null
          mural_post_id: string | null
          objetivo: string
          scope_id: string | null
          scope_tipo: string
          status: string
          tema_tags: string[] | null
          texto_base: string | null
          titulo: string
          updated_at: string
          variacoes_json: Json | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          attachments_json?: Json | null
          created_at?: string
          created_by: string
          hashtags?: string[] | null
          id?: string
          instrucoes?: string | null
          mural_post_id?: string | null
          objetivo?: string
          scope_id?: string | null
          scope_tipo: string
          status?: string
          tema_tags?: string[] | null
          texto_base?: string | null
          titulo: string
          updated_at?: string
          variacoes_json?: Json | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          attachments_json?: Json | null
          created_at?: string
          created_by?: string
          hashtags?: string[] | null
          id?: string
          instrucoes?: string | null
          mural_post_id?: string | null
          objetivo?: string
          scope_id?: string | null
          scope_tipo?: string
          status?: string
          tema_tags?: string[] | null
          texto_base?: string | null
          titulo?: string
          updated_at?: string
          variacoes_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fabrica_templates_mural_post_id_fkey"
            columns: ["mural_post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      first_mission_templates: {
        Row: {
          created_at: string
          description: string
          id: string
          instructions: string
          interest_type: Database["public"]["Enums"]["interest_type"]
          is_active: boolean | null
          mission_type: Database["public"]["Enums"]["mission_type"]
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          instructions: string
          interest_type: Database["public"]["Enums"]["interest_type"]
          is_active?: boolean | null
          mission_type: Database["public"]["Enums"]["mission_type"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          interest_type?: Database["public"]["Enums"]["interest_type"]
          is_active?: boolean | null
          mission_type?: Database["public"]["Enums"]["mission_type"]
          title?: string
        }
        Relationships: []
      }
      formacao_certificates: {
        Row: {
          certificate_code: string
          course_title_snapshot: string | null
          curso_id: string
          id: string
          issued_at: string
          name_snapshot: string | null
          og_image_url: string | null
          public_enabled: boolean
          public_visibility: string
          revoked_at: string | null
          revoked_reason: string | null
          user_id: string
        }
        Insert: {
          certificate_code?: string
          course_title_snapshot?: string | null
          curso_id: string
          id?: string
          issued_at?: string
          name_snapshot?: string | null
          og_image_url?: string | null
          public_enabled?: boolean
          public_visibility?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_id: string
        }
        Update: {
          certificate_code?: string
          course_title_snapshot?: string | null
          curso_id?: string
          id?: string
          issued_at?: string
          name_snapshot?: string | null
          og_image_url?: string | null
          public_enabled?: boolean
          public_visibility?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacao_certificates_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos_formacao"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_nickname: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          meta: Json | null
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_nickname?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          meta?: Json | null
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_nickname?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          meta?: Json | null
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: []
      }
      growth_events: {
        Row: {
          event_type: string
          id: string
          invite_code: string | null
          meta: Json | null
          occurred_at: string
          referrer_user_id: string | null
          scope_cidade: string | null
          session_id: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          invite_code?: string | null
          meta?: Json | null
          occurred_at?: string
          referrer_user_id?: string | null
          scope_cidade?: string | null
          session_id?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          invite_code?: string | null
          meta?: Json | null
          occurred_at?: string
          referrer_user_id?: string | null
          scope_cidade?: string | null
          session_id?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fabrica_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          order_index: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          order_index?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_requests: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          processado_em: string | null
          processado_por: string | null
          resposta: string | null
          status: Database["public"]["Enums"]["lgpd_request_status"]
          tipo: Database["public"]["Enums"]["lgpd_request_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          processado_em?: string | null
          processado_por?: string | null
          resposta?: string | null
          status?: Database["public"]["Enums"]["lgpd_request_status"]
          tipo: Database["public"]["Enums"]["lgpd_request_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          processado_em?: string | null
          processado_por?: string | null
          resposta?: string | null
          status?: Database["public"]["Enums"]["lgpd_request_status"]
          tipo?: Database["public"]["Enums"]["lgpd_request_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      materiais_base: {
        Row: {
          arquivo_url: string | null
          categoria: Database["public"]["Enums"]["material_categoria"]
          created_at: string
          criado_por: string
          descricao: string | null
          formato: Database["public"]["Enums"]["material_formato"]
          id: string
          legenda_pronta: string | null
          status: Database["public"]["Enums"]["material_status"]
          tags: string[] | null
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          categoria: Database["public"]["Enums"]["material_categoria"]
          created_at?: string
          criado_por: string
          descricao?: string | null
          formato: Database["public"]["Enums"]["material_formato"]
          id?: string
          legenda_pronta?: string | null
          status?: Database["public"]["Enums"]["material_status"]
          tags?: string[] | null
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          categoria?: Database["public"]["Enums"]["material_categoria"]
          created_at?: string
          criado_por?: string
          descricao?: string | null
          formato?: Database["public"]["Enums"]["material_formato"]
          id?: string
          legenda_pronta?: string | null
          status?: Database["public"]["Enums"]["material_status"]
          tags?: string[] | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          assigned_to: string | null
          cell_id: string | null
          ciclo_id: string | null
          como_fazer: string[] | null
          como_provar: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          debate_post_id: string | null
          debate_topico_id: string | null
          demanda_id: string | null
          demanda_origem_id: string | null
          description: string | null
          id: string
          instructions: string | null
          is_first_mission: boolean | null
          meta_json: Json | null
          points: number | null
          porque_importa: string | null
          privado: boolean | null
          requires_validation: boolean | null
          share_message: string | null
          slug: string | null
          status: Database["public"]["Enums"]["mission_status"] | null
          title: string
          type: Database["public"]["Enums"]["mission_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cell_id?: string | null
          ciclo_id?: string | null
          como_fazer?: string[] | null
          como_provar?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          debate_post_id?: string | null
          debate_topico_id?: string | null
          demanda_id?: string | null
          demanda_origem_id?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          is_first_mission?: boolean | null
          meta_json?: Json | null
          points?: number | null
          porque_importa?: string | null
          privado?: boolean | null
          requires_validation?: boolean | null
          share_message?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          title: string
          type: Database["public"]["Enums"]["mission_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cell_id?: string | null
          ciclo_id?: string | null
          como_fazer?: string[] | null
          como_provar?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          debate_post_id?: string | null
          debate_topico_id?: string | null
          demanda_id?: string | null
          demanda_origem_id?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          is_first_mission?: boolean | null
          meta_json?: Json | null
          points?: number | null
          porque_importa?: string | null
          privado?: boolean | null
          requires_validation?: boolean | null
          share_message?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["mission_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_debate_post_id_fkey"
            columns: ["debate_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_debate_topico_id_fkey"
            columns: ["debate_topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_demanda_origem_id_fkey"
            columns: ["demanda_origem_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      moderacao_actions: {
        Row: {
          action_type: string
          created_at: string
          created_by: string
          duration_hours: number | null
          id: string
          note: string | null
          report_id: string | null
          scope_id: string
          scope_tipo: string
          target_author_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by: string
          duration_hours?: number | null
          id?: string
          note?: string | null
          report_id?: string | null
          scope_id: string
          scope_tipo: string
          target_author_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string
          duration_hours?: number | null
          id?: string
          note?: string | null
          report_id?: string | null
          scope_id?: string
          scope_tipo?: string
          target_author_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderacao_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "mural_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      moderacao_sanctions: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          kind: string
          reason: string | null
          scope_id: string
          scope_tipo: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          kind: string
          reason?: string | null
          scope_id: string
          scope_tipo: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          kind?: string
          reason?: string | null
          scope_id?: string
          scope_tipo?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderacao_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          scope_id: string | null
          scope_tipo: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          scope_id?: string | null
          scope_tipo: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          scope_id?: string | null
          scope_tipo?: string
          title?: string
        }
        Relationships: []
      }
      mural_comentarios: {
        Row: {
          autor_user_id: string
          corpo_markdown: string
          created_at: string
          id: string
          post_id: string
          status: string
        }
        Insert: {
          autor_user_id: string
          corpo_markdown: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
        }
        Update: {
          autor_user_id?: string
          corpo_markdown?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mural_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_posts: {
        Row: {
          atividade_id: string | null
          autor_user_id: string
          ciclo_id: string | null
          corpo_markdown: string
          created_at: string
          escopo_id: string
          escopo_tipo: string
          id: string
          mission_id: string | null
          status: string
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          atividade_id?: string | null
          autor_user_id: string
          ciclo_id?: string | null
          corpo_markdown: string
          created_at?: string
          escopo_id: string
          escopo_tipo?: string
          id?: string
          mission_id?: string | null
          status?: string
          tipo: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          atividade_id?: string | null
          autor_user_id?: string
          ciclo_id?: string | null
          corpo_markdown?: string
          created_at?: string
          escopo_id?: string
          escopo_tipo?: string
          id?: string
          mission_id?: string | null
          status?: string
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mural_posts_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mural_posts_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mural_posts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_reacoes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mural_reacoes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mural_reports: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          categoria: string | null
          created_at: string
          id: string
          motivo: string
          post_id: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: string
          target_author_id: string | null
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          categoria?: string | null
          created_at?: string
          id?: string
          motivo: string
          post_id: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          target_author_id?: string | null
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          categoria?: string | null
          created_at?: string
          id?: string
          motivo?: string
          post_id?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          target_author_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mural_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          corpo: string
          criado_em: string
          href: string
          id: string
          lida: boolean
          meta: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          corpo: string
          criado_em?: string
          href: string
          id?: string
          lida?: boolean
          meta?: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          corpo?: string
          criado_em?: string
          href?: string
          id?: string
          lida?: boolean
          meta?: Json | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_steps: {
        Row: {
          completed_at: string | null
          step1_done: boolean
          step2_done: boolean
          step3_done: boolean
          step4_done: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          step1_done?: boolean
          step2_done?: boolean
          step3_done?: boolean
          step4_done?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          step1_done?: boolean
          step2_done?: boolean
          step3_done?: boolean
          step4_done?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perfil_skills: {
        Row: {
          created_at: string
          disponibilidade_horas: number | null
          disponibilidade_tags: string[] | null
          id: string
          nivel: Database["public"]["Enums"]["skill_nivel"] | null
          portfolio_url: string | null
          skill: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disponibilidade_horas?: number | null
          disponibilidade_tags?: string[] | null
          id?: string
          nivel?: Database["public"]["Enums"]["skill_nivel"] | null
          portfolio_url?: string | null
          skill: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disponibilidade_horas?: number | null
          disponibilidade_tags?: string[] | null
          id?: string
          nivel?: Database["public"]["Enums"]["skill_nivel"] | null
          portfolio_url?: string | null
          skill?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plenaria_comentarios: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          plenaria_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          plenaria_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          plenaria_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plenaria_comentarios_plenaria_id_fkey"
            columns: ["plenaria_id"]
            isOneToOne: false
            referencedRelation: "plenarias"
            referencedColumns: ["id"]
          },
        ]
      }
      plenaria_encaminhamentos: {
        Row: {
          created_at: string
          created_mission_id: string | null
          created_task_id: string | null
          descricao: string | null
          id: string
          kind: string
          ordem: number
          plenaria_id: string
          status: string
          titulo: string
        }
        Insert: {
          created_at?: string
          created_mission_id?: string | null
          created_task_id?: string | null
          descricao?: string | null
          id?: string
          kind: string
          ordem?: number
          plenaria_id: string
          status?: string
          titulo: string
        }
        Update: {
          created_at?: string
          created_mission_id?: string | null
          created_task_id?: string | null
          descricao?: string | null
          id?: string
          kind?: string
          ordem?: number
          plenaria_id?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plenaria_encaminhamentos_created_mission_id_fkey"
            columns: ["created_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plenaria_encaminhamentos_created_task_id_fkey"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "squad_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plenaria_encaminhamentos_plenaria_id_fkey"
            columns: ["plenaria_id"]
            isOneToOne: false
            referencedRelation: "plenarias"
            referencedColumns: ["id"]
          },
        ]
      }
      plenaria_opcoes: {
        Row: {
          created_at: string
          id: string
          ordem: number
          plenaria_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          plenaria_id: string
          texto: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          plenaria_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "plenaria_opcoes_plenaria_id_fkey"
            columns: ["plenaria_id"]
            isOneToOne: false
            referencedRelation: "plenarias"
            referencedColumns: ["id"]
          },
        ]
      }
      plenaria_votos: {
        Row: {
          created_at: string
          id: string
          opcao_id: string
          plenaria_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opcao_id: string
          plenaria_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opcao_id?: string
          plenaria_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plenaria_votos_opcao_id_fkey"
            columns: ["opcao_id"]
            isOneToOne: false
            referencedRelation: "plenaria_opcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plenaria_votos_plenaria_id_fkey"
            columns: ["plenaria_id"]
            isOneToOne: false
            referencedRelation: "plenarias"
            referencedColumns: ["id"]
          },
        ]
      }
      plenarias: {
        Row: {
          abre_em: string
          ciclo_id: string | null
          created_at: string
          created_by: string | null
          encerra_em: string
          id: string
          mural_post_id: string | null
          recibo_json: Json | null
          resumo: string | null
          scope_id: string
          scope_tipo: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          abre_em?: string
          ciclo_id?: string | null
          created_at?: string
          created_by?: string | null
          encerra_em: string
          id?: string
          mural_post_id?: string | null
          recibo_json?: Json | null
          resumo?: string | null
          scope_id: string
          scope_tipo: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          abre_em?: string
          ciclo_id?: string | null
          created_at?: string
          created_by?: string | null
          encerra_em?: string
          id?: string
          mural_post_id?: string | null
          recibo_json?: Json | null
          resumo?: string | null
          scope_id?: string
          scope_tipo?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plenarias_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plenarias_mural_post_id_fkey"
            columns: ["mural_post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          oculto: boolean
          texto: string
          topico_id: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          oculto?: boolean
          texto: string
          topico_id: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          oculto?: boolean
          texto?: string
          topico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          availability:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          avatar_url: string | null
          cell_id: string | null
          city: string | null
          city_id: string | null
          created_at: string
          first_action_at: string | null
          first_action_kind: string | null
          full_name: string | null
          id: string
          interests: Database["public"]["Enums"]["interest_type"][] | null
          invite_code: string
          last_action_at: string | null
          last_action_kind: string | null
          lgpd_consent: boolean | null
          lgpd_consent_at: string | null
          needs_cell_assignment: boolean | null
          neighborhood: string | null
          nickname: string | null
          onboarding_complete: boolean | null
          onboarding_completed_at: string | null
          onboarding_prefs: Json
          onboarding_status:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          origem_convite_id: string | null
          preferred_cell_id: string | null
          referrer_user_id: string | null
          rejection_reason: string | null
          state: string | null
          updated_at: string
          volunteer_status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          availability?:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          avatar_url?: string | null
          cell_id?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          first_action_at?: string | null
          first_action_kind?: string | null
          full_name?: string | null
          id: string
          interests?: Database["public"]["Enums"]["interest_type"][] | null
          invite_code?: string
          last_action_at?: string | null
          last_action_kind?: string | null
          lgpd_consent?: boolean | null
          lgpd_consent_at?: string | null
          needs_cell_assignment?: boolean | null
          neighborhood?: string | null
          nickname?: string | null
          onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_prefs?: Json
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          origem_convite_id?: string | null
          preferred_cell_id?: string | null
          referrer_user_id?: string | null
          rejection_reason?: string | null
          state?: string | null
          updated_at?: string
          volunteer_status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          availability?:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          avatar_url?: string | null
          cell_id?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          first_action_at?: string | null
          first_action_kind?: string | null
          full_name?: string | null
          id?: string
          interests?: Database["public"]["Enums"]["interest_type"][] | null
          invite_code?: string
          last_action_at?: string | null
          last_action_kind?: string | null
          lgpd_consent?: boolean | null
          lgpd_consent_at?: string | null
          needs_cell_assignment?: boolean | null
          neighborhood?: string | null
          nickname?: string | null
          onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_prefs?: Json
          onboarding_status?:
            | Database["public"]["Enums"]["onboarding_status"]
            | null
          origem_convite_id?: string | null
          preferred_cell_id?: string | null
          referrer_user_id?: string | null
          rejection_reason?: string | null
          state?: string | null
          updated_at?: string
          volunteer_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_origem_convite_id_fkey"
            columns: ["origem_convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_preferred_cell_id_fkey"
            columns: ["preferred_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_opcoes: {
        Row: {
          correta: boolean
          id: string
          ordem: number
          pergunta_id: string
          texto: string
        }
        Insert: {
          correta?: boolean
          id?: string
          ordem?: number
          pergunta_id: string
          texto: string
        }
        Update: {
          correta?: boolean
          id?: string
          ordem?: number
          pergunta_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_opcoes_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "quiz_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_perguntas: {
        Row: {
          aula_id: string
          created_at: string
          enunciado: string
          explicacao: string | null
          id: string
          ordem: number
        }
        Insert: {
          aula_id: string
          created_at?: string
          enunciado: string
          explicacao?: string | null
          id?: string
          ordem?: number
        }
        Update: {
          aula_id?: string
          created_at?: string
          enunciado?: string
          explicacao?: string | null
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_perguntas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_formacao"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_tentativas: {
        Row: {
          aprovado: boolean
          aula_id: string
          created_at: string
          id: string
          nota: number
          user_id: string
        }
        Insert: {
          aprovado?: boolean
          aula_id: string
          created_at?: string
          id?: string
          nota: number
          user_id: string
        }
        Update: {
          aprovado?: boolean
          aula_id?: string
          created_at?: string
          id?: string
          nota?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_tentativas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas_formacao"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_key: string
          count: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_key: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_key?: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      replicacoes: {
        Row: {
          created_at: string
          created_by: string
          created_mission_id: string | null
          created_task_id: string | null
          id: string
          scope_id: string
          scope_tipo: string
          source_id: string
          source_type: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_mission_id?: string | null
          created_task_id?: string | null
          id?: string
          scope_id: string
          scope_tipo: string
          source_id: string
          source_type: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_mission_id?: string | null
          created_task_id?: string | null
          id?: string
          scope_id?: string
          scope_tipo?: string
          source_id?: string
          source_type?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "replicacoes_created_mission_id_fkey"
            columns: ["created_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replicacoes_created_task_id_fkey"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "squad_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          ativo: boolean
          created_at: string
          dias_reter: number
          id: string
          nome: string
          tabela: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_reter?: number
          id?: string
          nome: string
          tabela: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_reter?: number
          id?: string
          nome?: string
          tabela?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          invited_email: string | null
          invited_user_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_key: string
          scope_id: string
          scope_tipo: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          invited_email?: string | null
          invited_user_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_key: string
          scope_id: string
          scope_tipo: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invited_email?: string | null
          invited_user_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_key?: string
          scope_id?: string
          scope_tipo?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      roteiros_actions: {
        Row: {
          action_date: string
          action_type: string
          created_at: string
          id: string
          roteiro_id: string
          user_id: string
        }
        Insert: {
          action_date?: string
          action_type: string
          created_at?: string
          id?: string
          roteiro_id: string
          user_id: string
        }
        Update: {
          action_date?: string
          action_type?: string
          created_at?: string
          id?: string
          roteiro_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roteiros_actions_roteiro_id_fkey"
            columns: ["roteiro_id"]
            isOneToOne: false
            referencedRelation: "roteiros_conversa"
            referencedColumns: ["id"]
          },
        ]
      }
      roteiros_conversa: {
        Row: {
          created_at: string
          created_by: string
          escopo_celula_id: string | null
          escopo_cidade: string | null
          escopo_estado: string | null
          escopo_tipo: string
          id: string
          next_steps: Json | null
          objections: Json | null
          objetivo: string
          status: string
          tags: string[] | null
          texto_base: string
          titulo: string
          updated_at: string
          versoes_json: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          escopo_celula_id?: string | null
          escopo_cidade?: string | null
          escopo_estado?: string | null
          escopo_tipo?: string
          id?: string
          next_steps?: Json | null
          objections?: Json | null
          objetivo: string
          status?: string
          tags?: string[] | null
          texto_base: string
          titulo: string
          updated_at?: string
          versoes_json?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          escopo_celula_id?: string | null
          escopo_cidade?: string | null
          escopo_estado?: string | null
          escopo_tipo?: string
          id?: string
          next_steps?: Json | null
          objections?: Json | null
          objetivo?: string
          status?: string
          tags?: string[] | null
          texto_base?: string
          titulo?: string
          updated_at?: string
          versoes_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "roteiros_conversa_escopo_celula_id_fkey"
            columns: ["escopo_celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          id: string
          is_anonymous: boolean | null
          is_public: boolean | null
          reference_id: string
          revoked_at: string | null
          share_code: string
          share_type: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          reference_id: string
          revoked_at?: string | null
          share_code?: string
          share_type: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          reference_id?: string
          revoked_at?: string | null
          share_code?: string
          share_type?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          created_at: string
          id: string
          papel: Database["public"]["Enums"]["squad_membro_papel"]
          squad_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["squad_membro_papel"]
          squad_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["squad_membro_papel"]
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_task_updates: {
        Row: {
          anexo_url: string | null
          author_user_id: string
          created_at: string
          id: string
          task_id: string
          texto: string | null
          tipo: Database["public"]["Enums"]["squad_task_update_tipo"]
        }
        Insert: {
          anexo_url?: string | null
          author_user_id: string
          created_at?: string
          id?: string
          task_id: string
          texto?: string | null
          tipo?: Database["public"]["Enums"]["squad_task_update_tipo"]
        }
        Update: {
          anexo_url?: string | null
          author_user_id?: string
          created_at?: string
          id?: string
          task_id?: string
          texto?: string | null
          tipo?: Database["public"]["Enums"]["squad_task_update_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "squad_task_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "squad_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_tasks: {
        Row: {
          assigned_to: string | null
          ciclo_id: string | null
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          ligado_atividade_id: string | null
          ligado_chamado_id: string | null
          ligado_missao_id: string | null
          mural_post_id: string | null
          prazo_em: string | null
          prioridade: Database["public"]["Enums"]["squad_task_prioridade"]
          squad_id: string
          status: Database["public"]["Enums"]["squad_task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          ciclo_id?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          ligado_atividade_id?: string | null
          ligado_chamado_id?: string | null
          ligado_missao_id?: string | null
          mural_post_id?: string | null
          prazo_em?: string | null
          prioridade?: Database["public"]["Enums"]["squad_task_prioridade"]
          squad_id: string
          status?: Database["public"]["Enums"]["squad_task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          ciclo_id?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          ligado_atividade_id?: string | null
          ligado_chamado_id?: string | null
          ligado_missao_id?: string | null
          mural_post_id?: string | null
          prazo_em?: string | null
          prioridade?: Database["public"]["Enums"]["squad_task_prioridade"]
          squad_id?: string
          status?: Database["public"]["Enums"]["squad_task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_tasks_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_semanais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_tasks_ligado_atividade_id_fkey"
            columns: ["ligado_atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_tasks_ligado_chamado_id_fkey"
            columns: ["ligado_chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados_talentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_tasks_ligado_missao_id_fkey"
            columns: ["ligado_missao_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_tasks_mural_post_id_fkey"
            columns: ["mural_post_id"]
            isOneToOne: false
            referencedRelation: "mural_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_tasks_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          created_by: string
          escopo_cidade: string | null
          escopo_id: string
          escopo_tipo: string
          id: string
          lider_user_id: string
          nome: string
          objetivo: string | null
          status: Database["public"]["Enums"]["squad_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          escopo_cidade?: string | null
          escopo_id: string
          escopo_tipo: string
          id?: string
          lider_user_id: string
          nome: string
          objetivo?: string | null
          status?: Database["public"]["Enums"]["squad_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          escopo_cidade?: string | null
          escopo_id?: string
          escopo_tipo?: string
          id?: string
          lider_user_id?: string
          nome?: string
          objetivo?: string | null
          status?: Database["public"]["Enums"]["squad_status"]
          updated_at?: string
        }
        Relationships: []
      }
      territorio_coord_interest: {
        Row: {
          celula_id: string | null
          cidade_id: string
          created_at: string
          disponibilidade: string | null
          id: string
          msg: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          celula_id?: string | null
          cidade_id: string
          created_at?: string
          disponibilidade?: string | null
          id?: string
          msg?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          celula_id?: string | null
          cidade_id?: string
          created_at?: string
          disponibilidade?: string | null
          id?: string
          msg?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territorio_coord_interest_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territorio_coord_interest_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_mensagens: {
        Row: {
          autor_id: string
          criado_em: string
          id: string
          texto: string
          ticket_id: string
          visivel_para_voluntario: boolean
        }
        Insert: {
          autor_id: string
          criado_em?: string
          id?: string
          texto: string
          ticket_id: string
          visivel_para_voluntario?: boolean
        }
        Update: {
          autor_id?: string
          criado_em?: string
          id?: string
          texto?: string
          ticket_id?: string
          visivel_para_voluntario?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          atribuido_para: string | null
          atualizado_em: string
          categoria: Database["public"]["Enums"]["ticket_categoria"]
          celula_id: string | null
          cidade: string | null
          criado_em: string
          criado_por: string
          id: string
          prioridade: Database["public"]["Enums"]["ticket_prioridade"]
          status: Database["public"]["Enums"]["ticket_status"]
          titulo: string
        }
        Insert: {
          atribuido_para?: string | null
          atualizado_em?: string
          categoria: Database["public"]["Enums"]["ticket_categoria"]
          celula_id?: string | null
          cidade?: string | null
          criado_em?: string
          criado_por: string
          id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo: string
        }
        Update: {
          atribuido_para?: string | null
          atualizado_em?: string
          categoria?: Database["public"]["Enums"]["ticket_categoria"]
          celula_id?: string | null
          cidade?: string | null
          criado_em?: string
          criado_por?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      topicos: {
        Row: {
          celula_id: string | null
          created_at: string
          criado_por: string
          descricao: string | null
          escopo: Database["public"]["Enums"]["topico_escopo"]
          id: string
          oculto: boolean
          tags: string[] | null
          tema: string
          updated_at: string
        }
        Insert: {
          celula_id?: string | null
          created_at?: string
          criado_por: string
          descricao?: string | null
          escopo?: Database["public"]["Enums"]["topico_escopo"]
          id?: string
          oculto?: boolean
          tags?: string[] | null
          tema: string
          updated_at?: string
        }
        Update: {
          celula_id?: string | null
          created_at?: string
          criado_por?: string
          descricao?: string | null
          escopo?: Database["public"]["Enums"]["topico_escopo"]
          id?: string
          oculto?: boolean
          tags?: string[] | null
          tema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topicos_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      training_tracks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interest_type: Database["public"]["Enums"]["interest_type"] | null
          is_active: boolean | null
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interest_type?: Database["public"]["Enums"]["interest_type"] | null
          is_active?: boolean | null
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interest_type?: Database["public"]["Enums"]["interest_type"] | null
          is_active?: boolean | null
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          quiz_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          cell_id: string | null
          cidade: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          granted_by: string | null
          id: string
          reason: string | null
          regiao: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_cell_id: string | null
          scope_city: string | null
          scope_state: string | null
          scope_type: string | null
          user_id: string
        }
        Insert: {
          cell_id?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          regiao?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope_cell_id?: string | null
          scope_city?: string | null
          scope_state?: string | null
          scope_type?: string | null
          user_id: string
        }
        Update: {
          cell_id?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          regiao?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          scope_cell_id?: string | null
          scope_city?: string | null
          scope_state?: string | null
          scope_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      utility_signals: {
        Row: {
          created_at: string
          id: string
          scope_id: string
          scope_tipo: string
          signal_type: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          scope_id: string
          scope_tipo: string
          signal_type: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          scope_id?: string
          scope_tipo?: string
          signal_type?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      weekly_signal_rollups: {
        Row: {
          id: string
          scope_id: string
          scope_tipo: string
          score_sum: number
          signal_type: string
          target_id: string
          target_type: string
          unique_users: number
          updated_at: string
          week_start: string
        }
        Insert: {
          id?: string
          scope_id: string
          scope_tipo: string
          score_sum?: number
          signal_type: string
          target_id: string
          target_type: string
          unique_users?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          id?: string
          scope_id?: string
          scope_tipo?: string
          score_sum?: number
          signal_type?: string
          target_id?: string
          target_type?: string
          unique_users?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      audit_logs_safe: {
        Row: {
          action: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address_masked: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address_masked?: never
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address_masked?: never
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_candidatura_create_task: {
        Args: {
          _candidatura_id: string
          _squad_id: string
          _task_prazo?: string
          _task_prioridade?: Database["public"]["Enums"]["squad_task_prioridade"]
          _task_titulo: string
        }
        Returns: Json
      }
      accept_role_invite: { Args: { p_token: string }; Returns: Json }
      admin_assign_cell: {
        Args: { p_cell_id: string; p_profile_id: string }
        Returns: boolean
      }
      admin_list_cell_pending: {
        Args: { p_limit?: number }
        Returns: {
          cell_id: string
          city_id: string
          city_name: string
          created_at: string
          display_name: string
          needs_cell_assignment: boolean
          profile_id: string
        }[]
      }
      admin_mark_no_cell: { Args: { p_profile_id: string }; Returns: boolean }
      apply_retention_policies: { Args: never; Returns: Json }
      approve_and_assign_request:
        | {
            Args: {
              p_cell_id?: string
              p_coordinator_note?: string
              p_request_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cell_id?: string
              p_coordinator_note?: string
              p_make_cell_coordinator?: boolean
              p_request_id: string
            }
            Returns: Json
          }
      approve_template: { Args: { p_template_id: string }; Returns: Json }
      approve_volunteer: {
        Args: { _cell_id?: string; _user_id: string }
        Returns: Json
      }
      archive_template: { Args: { p_template_id: string }; Returns: Json }
      assign_first_mission_on_approval: {
        Args: { _user_id: string }
        Returns: Json
      }
      assign_followup_to_volunteer: {
        Args: { _assignee_id: string; _contact_id: string }
        Returns: Json
      }
      can_grant_role_in_scope: {
        Args: {
          _operator_id: string
          _role_key: string
          _scope_id: string
          _scope_tipo: string
        }
        Returns: boolean
      }
      can_manage_atividade_scope: {
        Args: {
          _target_celula_id: string
          _target_cidade: string
          _user_id: string
        }
        Returns: boolean
      }
      can_manage_chamado: {
        Args: {
          _escopo_cidade: string
          _escopo_id: string
          _escopo_tipo: Database["public"]["Enums"]["chamado_escopo_tipo"]
          _user_id: string
        }
        Returns: boolean
      }
      can_manage_cidade: {
        Args: { _target_cidade: string; _user_id: string }
        Returns: boolean
      }
      can_manage_crm_contato: {
        Args: {
          _criado_por: string
          _escopo_id: string
          _escopo_tipo: string
          _user_id: string
        }
        Returns: boolean
      }
      can_manage_scope_roles: {
        Args: { _scope_id: string; _scope_tipo: string; _user_id: string }
        Returns: boolean
      }
      can_manage_squad: {
        Args: { _squad_id: string; _user_id: string }
        Returns: boolean
      }
      can_moderate_cell: {
        Args: { _cell_id: string; _user_id: string }
        Returns: boolean
      }
      can_moderate_scope: {
        Args: { _scope_id: string; _scope_tipo: string; _user_id: string }
        Returns: boolean
      }
      can_operate_coord: {
        Args: { _target_cell_id?: string; _target_city_id?: string }
        Returns: boolean
      }
      can_promote_to_role: {
        Args: {
          _operator_id: string
          _target_cidade?: string
          _target_regiao?: string
          _target_role: string
        }
        Returns: Json
      }
      can_revoke_role: {
        Args: { _operator_id: string; _role_id: string }
        Returns: Json
      }
      can_view_anuncio: {
        Args: {
          _celula_id: string
          _cidade: string
          _escopo: Database["public"]["Enums"]["anuncio_escopo"]
          _regiao: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_atividade: {
        Args: {
          _atividade_celula_id: string
          _atividade_cidade: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_chamado: {
        Args: {
          _escopo_cidade: string
          _escopo_id: string
          _escopo_tipo: Database["public"]["Enums"]["chamado_escopo_tipo"]
          _user_id: string
        }
        Returns: boolean
      }
      can_view_crm_contato: {
        Args: {
          _criado_por: string
          _escopo_id: string
          _escopo_tipo: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_crm_contato_scoped: {
        Args: {
          _atribuido_a: string
          _cidade: string
          _criado_por: string
          _escopo_id: string
          _escopo_tipo: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_full_chain: { Args: { _user_id: string }; Returns: boolean }
      can_view_squad: {
        Args: {
          _escopo_cidade: string
          _escopo_id: string
          _escopo_tipo: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_ticket: {
        Args: {
          _ticket_celula_id: string
          _ticket_cidade: string
          _ticket_criado_por: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_topico: {
        Args: {
          _celula_id: string
          _oculto: boolean
          _topico_escopo: Database["public"]["Enums"]["topico_escopo"]
          _user_id: string
        }
        Returns: boolean
      }
      cancel_assignment_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: Json
      }
      cancel_cell_allocation_request: { Args: never; Returns: Json }
      cast_vote: {
        Args: { p_opcao_id: string; p_plenaria_id: string }
        Returns: Json
      }
      check_convite_rate_limit: { Args: never; Returns: boolean }
      check_crm_contato_rate_limit: { Args: never; Returns: boolean }
      check_demanda_rate_limit: { Args: never; Returns: boolean }
      check_evidence_rate_limit: { Args: never; Returns: boolean }
      check_message_rate_limit: { Args: { _user_id: string }; Returns: boolean }
      check_mural_comment_rate_limit: {
        Args: { _user_id: string }
        Returns: boolean
      }
      check_mural_post_rate_limit: {
        Args: { _user_id: string }
        Returns: boolean
      }
      check_replicacao_exists: {
        Args: {
          _scope_id: string
          _scope_tipo: string
          _source_id: string
          _source_type: string
          _week_start: string
        }
        Returns: Json
      }
      check_role_invite_rate_limit: { Args: never; Returns: boolean }
      check_skill_rate_limit: { Args: never; Returns: boolean }
      check_ticket_rate_limit: { Args: { _user_id: string }; Returns: boolean }
      checkin_event: { Args: { _event_id: string }; Returns: undefined }
      cleanup_old_growth_events: { Args: never; Returns: number }
      close_cycle: {
        Args: { _ciclo_id: string; _fechamento_json: Json }
        Returns: {
          celula_id: string | null
          cidade: string | null
          created_at: string
          criado_por: string | null
          fechado_em: string | null
          fechado_por: string | null
          fechamento_json: Json | null
          fim: string
          id: string
          inicio: string
          metas_json: Json | null
          status: Database["public"]["Enums"]["ciclo_status"]
          titulo: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ciclos_semanais"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_plenaria: {
        Args: {
          p_encaminhamentos_json?: Json
          p_plenaria_id: string
          p_publish_to_mural?: boolean
          p_recibo_json?: Json
        }
        Returns: Json
      }
      complete_conversation_mission: {
        Args: { _mission_id: string; _results: Json }
        Returns: Json
      }
      complete_crm_mission: {
        Args: {
          _mission_id: string
          _next_action_date?: string
          _note: string
          _outcome: string
        }
        Returns: Json
      }
      complete_daily_plan_step: {
        Args: { _day: string; _step_key: string }
        Returns: Json
      }
      complete_event_participation: {
        Args: { _actions_json?: Json; _event_id: string }
        Returns: undefined
      }
      complete_post_event_followup: {
        Args: { _contact_id: string; _event_id: string }
        Returns: Json
      }
      complete_street_mission: {
        Args: { _checkboxes?: Json; _mission_id: string; _photo_url?: string }
        Returns: Json
      }
      compute_trust_weight: { Args: { _user_id: string }; Returns: number }
      convert_coord_interest_to_cell: {
        Args: {
          p_cell_name: string
          p_cell_neighborhood?: string
          p_create_initial_cycle?: boolean
          p_interest_id: string
        }
        Returns: Json
      }
      coord_validate_evidence:
        | {
            Args: { _action: string; _evidence_id: string; _reason?: string }
            Returns: Json
          }
        | {
            Args: {
              _action: string
              _evidence_id: string
              _feedback?: string
              _reason?: string
            }
            Returns: Json
          }
      count_active_admins: { Args: never; Returns: number }
      create_encaminhamento_as_mission: {
        Args: {
          p_encaminhamento_id: string
          p_pontos?: number
          p_tipo?: string
        }
        Returns: Json
      }
      create_encaminhamento_as_task: {
        Args: {
          p_encaminhamento_id: string
          p_responsavel_id?: string
          p_squad_id: string
        }
        Returns: Json
      }
      create_replicable_mission_from_top: {
        Args: {
          _options_json?: Json
          _scope_id: string
          _scope_tipo: string
          _source_id: string
          _source_type: string
          _week_start: string
        }
        Returns: Json
      }
      create_role_invite: {
        Args: {
          p_expires_days?: number
          p_invited_email?: string
          p_invited_user_id?: string
          p_role_key: string
          p_scope_id: string
          p_scope_tipo: string
        }
        Returns: Json
      }
      create_task_from_top: {
        Args: {
          _options_json?: Json
          _scope_id: string
          _scope_tipo: string
          _source_id: string
          _source_type: string
          _squad_id: string
          _week_start: string
        }
        Returns: Json
      }
      create_tasks_from_cycle_metas: {
        Args: { _ciclo_id: string; _mappings: Json }
        Returns: Json
      }
      decide_membership: {
        Args: { p_decision: string; p_membership_id: string }
        Returns: Json
      }
      delete_my_contact: { Args: { p_contact_id: string }; Returns: Json }
      direct_moderate_action: {
        Args: {
          _action_type: string
          _payload_json?: Json
          _scope_id: string
          _scope_tipo: string
          _target_id: string
          _target_type: string
        }
        Returns: Json
      }
      dismiss_coordinator_alert: {
        Args: { _alert_key: string; _hours?: number }
        Returns: Json
      }
      editar_sintese_ciclo: {
        Args: { _ciclo_id: string; _resumo: string }
        Returns: Json
      }
      ensure_volunteer_profile: {
        Args: {
          p_city_id?: string
          p_full_name?: string
          p_preferred_cell_id?: string
        }
        Returns: string
      }
      fechar_ciclo_celula: {
        Args: { _ciclo_id: string; _fechamento_json: Json }
        Returns: Json
      }
      generate_conversation_mission: {
        Args: { _channel?: string; _objective?: string; _target_count?: number }
        Returns: Json
      }
      generate_crm_missions_for_user: {
        Args: { _user_id: string }
        Returns: number
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_invite_token: { Args: never; Returns: string }
      generate_lgpd_export: { Args: { _target_user_id: string }; Returns: Json }
      generate_post_event_followups: {
        Args: { _event_id: string }
        Returns: Json
      }
      generate_street_mission: {
        Args: { _acao?: string; _bairro?: string; _tempo_estimado?: number }
        Returns: Json
      }
      get_active_cycle: {
        Args: { _celula_id?: string; _cidade?: string }
        Returns: {
          celula_id: string | null
          cidade: string | null
          created_at: string
          criado_por: string | null
          fechado_em: string | null
          fechado_por: string | null
          fechamento_json: Json | null
          fim: string
          id: string
          inicio: string
          metas_json: Json | null
          status: Database["public"]["Enums"]["ciclo_status"]
          titulo: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ciclos_semanais"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_active_cycle_for_scope: {
        Args: { _scope_id: string; _scope_tipo: string }
        Returns: string
      }
      get_active_plenarias: {
        Args: { p_scope_id?: string; p_scope_tipo?: string }
        Returns: {
          abre_em: string
          ciclo_id: string
          created_at: string
          encerra_em: string
          id: string
          opcoes: Json
          resumo: string
          scope_id: string
          scope_tipo: string
          status: string
          titulo: string
          total_comentarios: number
          total_votos: number
          user_voted: boolean
        }[]
      }
      get_active_sanctions: {
        Args: { _scope_id: string; _scope_tipo: string }
        Returns: {
          ends_at: string
          id: string
          kind: string
          moderator_nickname: string
          reason: string
          starts_at: string
          user_id: string
          user_nickname: string
        }[]
      }
      get_admin_count: { Args: never; Returns: number }
      get_admin_stats: { Args: never; Returns: Json }
      get_app_config: {
        Args: never
        Returns: {
          brand_pack: string
          mode: string
          updated_at: string
        }[]
      }
      get_app_health_metrics: {
        Args: { _period_days?: number; _scope_city?: string }
        Returns: Json
      }
      get_caller_coord_level: { Args: never; Returns: string }
      get_cell_ops_kpis: { Args: never; Returns: Json }
      get_certificate_public: { Args: { _code: string }; Returns: Json }
      get_checkin_metrics: {
        Args: {
          _scope_celula_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      get_cidade_celulas: { Args: { p_cidade_id: string }; Returns: Json }
      get_cohort_for_alert: {
        Args: { _alert_key: string; _window_days?: number }
        Returns: Json
      }
      get_cohort_message_templates: {
        Args: { _alert_key: string }
        Returns: Json
      }
      get_completed_missions_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_contact_event_invites: {
        Args: { _contact_id: string }
        Returns: {
          created_at: string
          event_date: string
          event_id: string
          event_location: string
          event_title: string
          invite_id: string
          last_outreach_at: string
          next_followup_at: string
          status: string
        }[]
      }
      get_contact_whatsapp: { Args: { p_contact_id: string }; Returns: Json }
      get_content_signal_counts: {
        Args: { p_content_id: string }
        Returns: {
          count: number
          signal: string
          user_reacted: boolean
        }[]
      }
      get_conversation_mission_metrics: {
        Args: { _days?: number; _scope_cidade?: string }
        Returns: Json
      }
      get_coordinator_at_risk_volunteers: {
        Args: {
          _limit?: number
          _scope_cell_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      get_coordinator_inbox_metrics: {
        Args: {
          _scope_cell_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      get_coordinator_overdue_followups: {
        Args: {
          _limit?: number
          _scope_cell_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: {
          assignee_id: string
          assignee_name: string
          bairro: string
          cidade: string
          days_overdue: number
          id: string
          kind: string
          nome_curto: string
          owner_id: string
          owner_name: string
          scheduled_for: string
          status: string
          whatsapp: string
        }[]
      }
      get_coordinator_stalled_missions: {
        Args: {
          _limit?: number
          _scope_cell_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: {
          accepted_at: string
          days_stalled: number
          id: string
          mission_type: string
          title: string
          volunteer_id: string
          volunteer_name: string
          volunteer_whatsapp: string
        }[]
      }
      get_crm_mission_metrics: {
        Args: {
          _scope_celula_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      get_cycle_tasks_metrics: { Args: { _ciclo_id: string }; Returns: Json }
      get_daily_suggestions: { Args: { _user_id: string }; Returns: Json }
      get_db_contract_health: { Args: never; Returns: Json }
      get_entity_audit: {
        Args: { p_entity_id: string; p_entity_type: string; p_limit?: number }
        Returns: {
          action: string
          actor_nickname: string
          created_at: string
          id: string
          meta: Json
          new_status: string
          old_status: string
        }[]
      }
      get_fabrica_metrics: {
        Args: { p_scope_id?: string; p_scope_tipo?: string }
        Returns: Json
      }
      get_full_funnel_7d: { Args: { _scope_cidade?: string }; Returns: Json }
      get_growth_funnel_metrics: {
        Args: { _period_days?: number; _scope_cidade?: string }
        Returns: Json
      }
      get_hidden_content: {
        Args: { _scope_id: string; _scope_tipo: string; _target_type?: string }
        Returns: {
          author_id: string
          author_nickname: string
          content_preview: string
          content_type: string
          created_at: string
          hidden_at: string
          id: string
        }[]
      }
      get_invite_chain: {
        Args: { _target_user_id: string }
        Returns: {
          depth: number
          invite_channel: string
          invite_code: string
          invited_by: string
          joined_at: string
          user_city: string
          user_id: string
          user_name: string
        }[]
      }
      get_invite_id_by_code: { Args: { _code: string }; Returns: string }
      get_invite_stats_for_scope: {
        Args: { _user_id: string }
        Returns: {
          cadastros_com_convite: number
          cadastros_sem_convite: number
          total_convites: number
          total_usos: number
        }[]
      }
      get_invite_usage_stats: { Args: { p_convite_id: string }; Returns: Json }
      get_lgpd_pending_count: { Args: never; Returns: number }
      get_managed_cities: {
        Args: { _user_id: string }
        Returns: {
          cidade: string
        }[]
      }
      get_mission_catalog_stats: { Args: never; Returns: Json }
      get_moderation_metrics: {
        Args: { _scope_id: string; _scope_tipo: string }
        Returns: Json
      }
      get_moderation_queue: {
        Args: { _filters_json?: Json; _scope_id: string; _scope_tipo: string }
        Returns: {
          assigned_nickname: string
          assigned_to: string
          author_nickname: string
          categoria: string
          content_preview: string
          created_at: string
          motivo: string
          report_count: number
          report_id: string
          status: string
          target_author_id: string
          target_id: string
          target_type: string
        }[]
      }
      get_my_coordinator_alerts: {
        Args: { _window_days?: number }
        Returns: Json
      }
      get_my_crm_missions: {
        Args: never
        Returns: {
          contato_bairro: string
          contato_id: string
          contato_nome: string
          created_at: string
          mission_id: string
          mission_status: string
          mission_title: string
          proxima_acao_em: string
        }[]
      }
      get_my_cycle_tasks: {
        Args: { _ciclo_id: string }
        Returns: {
          assigned_to: string | null
          ciclo_id: string | null
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          ligado_atividade_id: string | null
          ligado_chamado_id: string | null
          ligado_missao_id: string | null
          mural_post_id: string | null
          prazo_em: string | null
          prioridade: Database["public"]["Enums"]["squad_task_prioridade"]
          squad_id: string
          status: Database["public"]["Enums"]["squad_task_status"]
          titulo: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "squad_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_daily_plan: { Args: { _day?: string }; Returns: Json }
      get_my_due_followups: { Args: { _limit?: number }; Returns: Json }
      get_my_event_invite_summary: {
        Args: { _event_id: string }
        Returns: {
          attended: number
          declined: number
          going: number
          maybe: number
          no_answer: number
          total_invited: number
        }[]
      }
      get_my_event_invites_for_attendance: {
        Args: { _event_id: string }
        Returns: {
          attended_at: string
          contact_id: string
          contact_name: string
          invite_id: string
          status: string
        }[]
      }
      get_my_event_participation: {
        Args: { _event_id: string }
        Returns: {
          actions_json: Json
          checkin_at: string
          completed_at: string
          participation_id: string
          status: string
        }[]
      }
      get_my_impact_metrics: { Args: { _window_days?: number }; Returns: Json }
      get_my_next_event_prompt: {
        Args: { _window_hours?: number }
        Returns: {
          ends_at: string
          event_id: string
          has_any_invites: boolean
          location: string
          my_participation_status: string
          starts_at: string
          suggested_stage: string
          title: string
        }[]
      }
      get_my_pending_invites: {
        Args: never
        Returns: {
          created_at: string
          created_by_name: string
          expires_at: string
          id: string
          role_key: string
          role_label: string
          scope_id: string
          scope_name: string
          scope_tipo: string
          token: string
        }[]
      }
      get_my_post_event_followups: {
        Args: { _limit?: number }
        Returns: {
          contact_bairro: string
          contact_cidade: string
          contact_id: string
          contact_nome: string
          due_at: string
          event_id: string
          event_title: string
          followup_kind: string
          invite_id: string
          is_overdue: boolean
        }[]
      }
      get_my_reactivation_status: { Args: never; Returns: Json }
      get_my_streak_metrics: { Args: never; Returns: Json }
      get_my_support_metrics: { Args: { _days?: number }; Returns: Json }
      get_my_validation_feedback: { Args: { p_limit?: number }; Returns: Json }
      get_my_weekly_share_pack: { Args: never; Returns: Json }
      get_north_star_alerts: {
        Args: { _scope?: Json; _window_days?: number }
        Returns: Json
      }
      get_north_star_deltas: {
        Args: { _scope?: Json; _window_days?: number }
        Returns: Json
      }
      get_north_star_drilldown: {
        Args: {
          _scope_kind?: string
          _scope_value?: string
          _window_days?: number
        }
        Returns: Json
      }
      get_north_star_metrics: {
        Args: { _scope?: Json; _window_days?: number }
        Returns: Json
      }
      get_north_star_scope_filter: {
        Args: { _scope: Json }
        Returns: {
          scope_kind: string
          scope_value: string
        }[]
      }
      get_onboarding_metrics: {
        Args: {
          _scope_celula_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      get_onboarding_status: {
        Args: never
        Returns: {
          completed_at: string
          is_complete: boolean
          step1_done: boolean
          step2_done: boolean
          step3_done: boolean
          step4_done: boolean
          steps_completed: number
        }[]
      }
      get_ops_funnel_metrics: {
        Args: {
          _period_days?: number
          _scope_cell_id?: string
          _scope_cidade?: string
        }
        Returns: Json
      }
      get_plenarias_metrics: {
        Args: {
          p_scope_celula_id?: string
          p_scope_cidade?: string
          p_scope_tipo?: string
        }
        Returns: Json
      }
      get_rate_limit_metrics: { Args: { _period_days?: number }; Returns: Json }
      get_replicacoes_metrics: {
        Args: { _scope_id: string; _scope_tipo: string; _week_start: string }
        Returns: Json
      }
      get_return_reminder_message: {
        Args: { _first_name: string }
        Returns: string
      }
      get_role_audit_history: {
        Args: { _limit?: number; _target_user_id: string }
        Returns: {
          action: string
          actor_nickname: string
          created_at: string
          id: string
          reason: string
          role: string
          scope_city: string
          scope_type: string
        }[]
      }
      get_role_invite_stats: { Args: never; Returns: Json }
      get_roteiros_metrics: { Args: { p_days?: number }; Returns: Json }
      get_scope_event_invite_metrics: {
        Args: { _days?: number }
        Returns: {
          attended: number
          declined: number
          event_date: string
          event_id: string
          event_title: string
          going: number
          maybe: number
          no_answer: number
          total_invited: number
        }[]
      }
      get_scope_event_participation_metrics: {
        Args: { _days?: number }
        Returns: {
          event_date: string
          event_id: string
          event_title: string
          invites_attended_total: number
          participations_checked_in: number
          participations_completed: number
          participations_planned: number
        }[]
      }
      get_scope_post_event_followup_metrics: {
        Args: { _days?: number }
        Returns: {
          attended_total: number
          event_date: string
          event_id: string
          event_title: string
          followups_done_total: number
          followups_overdue_total: number
          followups_scheduled_total: number
        }[]
      }
      get_scope_support_metrics: {
        Args: { _days?: number; _scope_id?: string; _scope_tipo?: string }
        Returns: Json
      }
      get_scoped_open_tickets_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_share_pack: {
        Args: { p_platform: string; p_template_id: string }
        Returns: Json
      }
      get_share_pack_metrics: {
        Args: { p_days?: number; p_scope_id?: string; p_scope_tipo?: string }
        Returns: Json
      }
      get_signal_counts: {
        Args: { _target_id: string; _target_type: string }
        Returns: Json
      }
      get_signals_metrics: {
        Args: { _scope_id: string; _scope_tipo: string }
        Returns: Json
      }
      get_squad_metrics: {
        Args: {
          _scope_celula_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      get_street_mission_metrics: {
        Args: { _period_days?: number; _scope_cidade?: string }
        Returns: Json
      }
      get_territorio_kpis: { Args: never; Returns: Json }
      get_territorio_overview: { Args: { period_days?: number }; Returns: Json }
      get_territory_funnel_by_city: {
        Args: { p_period_days?: number; p_scope_cidade?: string }
        Returns: {
          approved: number
          cidade: string
          first_action: number
          form_open: number
          link_open: number
          signup: number
        }[]
      }
      get_top_content_week: {
        Args: {
          p_limit?: number
          p_type?: Database["public"]["Enums"]["content_type"]
        }
        Returns: {
          content_id: string
          divulgar_count: number
          puxo_count: number
          replicar_count: number
          title: string
          total_signals: number
          type: Database["public"]["Enums"]["content_type"]
          unique_users: number
          util_count: number
        }[]
      }
      get_top_of_week: {
        Args: { _scope_id: string; _scope_tipo: string; _week_start: string }
        Returns: Json
      }
      get_top_referrers: {
        Args: { _limit?: number }
        Returns: {
          aprovados: number
          invite_code: string
          referrals_7d: number
          total_referrals: number
          user_city: string
          user_id: string
          user_name: string
        }[]
      }
      get_unread_anuncios_count: { Args: { _user_id: string }; Returns: number }
      get_unread_notifications_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_upcoming_events_for_invite: {
        Args: { _limit?: number }
        Returns: {
          city: string
          event_date: string
          event_end: string
          event_id: string
          location: string
          tipo: string
          title: string
        }[]
      }
      get_user_cell_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_referrals: {
        Args: { _referrer_id: string }
        Returns: {
          downstream_count: number
          invite_channel: string
          invite_code: string
          joined_at: string
          user_city: string
          user_id: string
          user_name: string
          volunteer_status: string
        }[]
      }
      get_user_role_label: { Args: { _user_id: string }; Returns: string }
      get_user_sanctions: {
        Args: { _scope_id: string; _scope_tipo: string; _user_id: string }
        Returns: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          is_active: boolean
          kind: string
          moderator_nickname: string
          reason: string
          starts_at: string
        }[]
      }
      get_user_scope: { Args: { _user_id?: string }; Returns: Json }
      grant_coord_role:
        | {
            Args: {
              p_cell_id?: string
              p_city_id?: string
              p_role: Database["public"]["Enums"]["coord_role_type"]
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cell_id?: string
              p_city_id?: string
              p_role: string
              p_user_id: string
            }
            Returns: Json
          }
      grant_scoped_role: {
        Args: {
          _expires_at?: string
          _role: string
          _scope_cell_id?: string
          _scope_city?: string
          _scope_state?: string
          _scope_type?: string
          _target_user_id: string
        }
        Returns: Json
      }
      guard_rate_limit: {
        Args: { _action_key: string; _limit: number; _window_seconds?: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_scope: {
        Args: {
          _roles: string[]
          _target_cell_id?: string
          _target_city?: string
          _target_state?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_scoped_role: {
        Args: {
          _cell_id?: string
          _cidade?: string
          _regiao?: string
          _role: string
          _user_id: string
        }
        Returns: boolean
      }
      import_mission_pack: {
        Args: { _actor_user_id: string; _mode?: string; _pack_json: Json }
        Returns: Json
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_global: { Args: { _user_id: string }; Returns: boolean }
      is_approved_volunteer: { Args: { _user_id: string }; Returns: boolean }
      is_cell_member: {
        Args: { _cell_id: string; _user_id: string }
        Returns: boolean
      }
      is_coord_in_scope: {
        Args: {
          _target_cell_id?: string
          _target_city?: string
          _target_state?: string
          _user_id: string
        }
        Returns: boolean
      }
      is_coordinator: { Args: { _user_id: string }; Returns: boolean }
      is_invite_valid: { Args: { _code: string }; Returns: boolean }
      is_pending_approval: { Args: { _user_id: string }; Returns: boolean }
      is_plenaria_coordinator: { Args: never; Returns: boolean }
      is_sanctioned: {
        Args: {
          _kind?: string
          _scope_id: string
          _scope_tipo: string
          _user_id: string
        }
        Returns: boolean
      }
      is_squad_leader: {
        Args: { _squad_id: string; _user_id: string }
        Returns: boolean
      }
      is_squad_member: {
        Args: { _squad_id: string; _user_id: string }
        Returns: boolean
      }
      list_city_assignment_requests: {
        Args: { p_city_id: string; p_status?: string }
        Returns: {
          assigned_cell_id: string
          assigned_cell_name: string
          bairro: string
          city_id: string
          created_at: string
          days_waiting: number
          disponibilidade: string
          id: string
          interesses: string[]
          notes: string
          profile_first_name: string
          profile_id: string
          profile_neighborhood: string
          resolved_at: string
          status: string
        }[]
      }
      list_city_cells: { Args: { p_city_id?: string }; Returns: Json[] }
      list_coord_audit_log: {
        Args: { p_city_id?: string; p_days?: number }
        Returns: {
          action: Database["public"]["Enums"]["coord_audit_action"]
          actor_profile_id: string
          cell_id: string
          city_id: string
          created_at: string
          id: string
          meta_json: Json
          scope_type: string
          target_profile_id: string
        }[]
      }
      list_coord_roles: {
        Args: { p_scope_city_id?: string }
        Returns: {
          cell_id: string
          cell_name: string
          city_id: string
          city_name: string
          created_at: string
          id: string
          role: string
          user_code: string
          user_id: string
        }[]
      }
      list_role_invites: {
        Args: { p_scope_id?: string; p_scope_tipo?: string; p_status?: string }
        Returns: {
          accepted_at: string
          created_at: string
          created_by: string
          created_by_name: string
          expires_at: string
          id: string
          invited_email: string
          invited_user_id: string
          invited_user_name: string
          role_key: string
          scope_id: string
          scope_tipo: string
          status: string
        }[]
      }
      list_templates_for_user: {
        Args: never
        Returns: {
          aprovado_em: string
          attachments_json: Json
          created_at: string
          download_count: number
          hashtags: string[]
          id: string
          instrucoes: string
          objetivo: string
          scope_id: string
          scope_tipo: string
          share_count: number
          tema_tags: string[]
          texto_base: string
          titulo: string
          user_shared: boolean
          variacoes_json: Json
        }[]
      }
      log_app_error: {
        Args: {
          _error_code: string
          _meta?: Json
          _route: string
          _session_id?: string
          _severity?: string
          _source?: string
        }
        Returns: string
      }
      log_coord_audit: {
        Args: {
          p_action: Database["public"]["Enums"]["coord_audit_action"]
          p_cell_id?: string
          p_city_id?: string
          p_meta_json?: Json
          p_scope_type: string
          p_target_profile_id?: string
        }
        Returns: string
      }
      log_governance_action: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_meta?: Json
          p_new_status?: string
          p_old_status?: string
        }
        Returns: string
      }
      log_growth_event: {
        Args: {
          _event_type: string
          _invite_code?: string
          _meta?: Json
          _referrer_user_id?: string
          _scope_cidade?: string
          _session_id?: string
          _template_id?: string
        }
        Returns: undefined
      }
      log_role_denied: {
        Args: {
          _attempted_action: string
          _attempted_role: string
          _denial_reason: string
          _operator_id: string
          _target_user_id: string
        }
        Returns: undefined
      }
      mark_canonical_missions: { Args: { p_slugs: string[] }; Returns: Json }
      mark_event_invite_attended: {
        Args: { _contact_id: string; _event_id: string }
        Returns: undefined
      }
      mark_event_outreach: { Args: { _invite_id: string }; Returns: undefined }
      mark_followup_done: {
        Args: { _contact_id: string; _meta?: Json }
        Returns: Json
      }
      mark_onboarding_step_done: { Args: { p_step: number }; Returns: Json }
      mark_ticket_notifications_read: {
        Args: { _ticket_id: string; _user_id: string }
        Returns: undefined
      }
      moderate_action: {
        Args: { _action_type: string; _payload_json?: Json; _report_id: string }
        Returns: Json
      }
      ops_cycle: { Args: { _cycle_id: string }; Returns: Json }
      ops_overview: {
        Args: {
          _scope_celula_id?: string
          _scope_cidade?: string
          _scope_type?: string
        }
        Returns: Json
      }
      origin_funnel: {
        Args: { _scope_cidade?: string; _scope_type?: string }
        Returns: Json
      }
      public_validate_invite: {
        Args: { p_code: string }
        Returns: {
          campaign_tag: string
          channel: string
          code: string
          ok: boolean
          reason: string
        }[]
      }
      publish_roteiro_to_mural: {
        Args: {
          p_cell_id: string
          p_roteiro_id: string
          p_titulo_override?: string
        }
        Returns: string
      }
      publish_template_to_mural: {
        Args: {
          p_scope_id?: string
          p_scope_tipo?: string
          p_template_id: string
        }
        Returns: Json
      }
      purge_my_contacts: { Args: never; Returns: Json }
      recompute_weekly_rollups: {
        Args: { _scope_id: string; _scope_tipo: string; _week_start: string }
        Returns: number
      }
      register_invite_usage: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      reject_volunteer: {
        Args: { _reason: string; _user_id: string }
        Returns: Json
      }
      remove_sanction: {
        Args: { _note?: string; _sanction_id: string }
        Returns: Json
      }
      request_cell_allocation: { Args: { p_cell_id: string }; Returns: Json }
      request_join_celula: { Args: { p_celula_id: string }; Returns: Json }
      request_review_template: {
        Args: { p_template_id: string }
        Returns: Json
      }
      resend_role_invite: { Args: { p_invite_id: string }; Returns: Json }
      reset_my_daily_plan: { Args: { _day?: string }; Returns: Json }
      revoke_coord_role:
        | {
            Args: {
              p_cell_id?: string
              p_city_id?: string
              p_role: Database["public"]["Enums"]["coord_role_type"]
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cell_id?: string
              p_city_id?: string
              p_role: string
              p_user_id: string
            }
            Returns: Json
          }
      revoke_role_invite: { Args: { p_invite_id: string }; Returns: Json }
      revoke_scoped_role: {
        Args: { _reason?: string; _role_id: string }
        Returns: Json
      }
      run_sql_readonly: { Args: { query_text: string }; Returns: Json }
      safe_revoke_user_role: {
        Args: { p_reason?: string; p_role_id: string }
        Returns: Json
      }
      search_my_contacts: {
        Args: { _limit?: number; _q?: string }
        Returns: {
          cidade: string
          id: string
          nome: string
          status: string
          tags: string[]
          whatsapp: string
          whatsapp_norm: string
        }[]
      }
      set_app_config: {
        Args: { p_brand_pack: string; p_mode: string }
        Returns: boolean
      }
      set_certificate_privacy: {
        Args: {
          _certificate_id: string
          _public_enabled: boolean
          _visibility: string
        }
        Returns: boolean
      }
      set_contact_support_level: {
        Args: { _contact_id: string; _reason?: string; _support_level: string }
        Returns: Json
      }
      set_event_invite_status: {
        Args: {
          _invite_id: string
          _next_followup_at?: string
          _status: string
        }
        Returns: undefined
      }
      snooze_followup: {
        Args: { _contact_id: string; _hours?: number }
        Returns: Json
      }
      toggle_utility_signal: {
        Args: { _signal_type: string; _target_id: string; _target_type: string }
        Returns: Json
      }
      track_roteiro_action: {
        Args: { p_action_type: string; p_roteiro_id: string }
        Returns: boolean
      }
      track_share_action: {
        Args: { p_action: string; p_meta?: Json; p_template_id: string }
        Returns: Json
      }
      track_template_action: {
        Args: { p_action: string; p_template_id: string }
        Returns: Json
      }
      update_cell_playbook: {
        Args: { _cell_id: string; _playbook: Json }
        Returns: boolean
      }
      update_cycle_metas: {
        Args: { _ciclo_id: string; _metas_json: Json }
        Returns: {
          celula_id: string | null
          cidade: string | null
          created_at: string
          criado_por: string | null
          fechado_em: string | null
          fechado_por: string | null
          fechamento_json: Json | null
          fim: string
          id: string
          inicio: string
          metas_json: Json | null
          status: Database["public"]["Enums"]["ciclo_status"]
          titulo: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ciclos_semanais"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_last_action: { Args: { _kind: string }; Returns: undefined }
      upsert_cell: {
        Args: {
          p_cell_id?: string
          p_city_id: string
          p_is_active?: boolean
          p_name: string
          p_neighborhood?: string
          p_notes?: string
          p_tags?: string[]
        }
        Returns: Json
      }
      upsert_coord_interest: {
        Args: {
          p_celula_id?: string
          p_cidade_id: string
          p_disponibilidade?: string
          p_msg?: string
        }
        Returns: Json
      }
      upsert_event_invite: {
        Args: {
          _contact_id: string
          _event_id: string
          _next_followup_at?: string
          _source?: string
        }
        Returns: string
      }
      upsert_event_participation: {
        Args: { _event_id: string }
        Returns: string
      }
      upsert_quick_contact: {
        Args: {
          _context?: Json
          _nome?: string
          _origem?: string
          _schedule_in_hours?: number
          _schedule_kind?: string
          _tags?: string[]
          _whatsapp?: string
        }
        Returns: Json
      }
      user_can_manage_fabrica_scope: {
        Args: { p_scope_id: string; p_scope_tipo: string; p_user_id: string }
        Returns: boolean
      }
      user_has_fabrica_scope_access: {
        Args: { p_scope_id: string; p_scope_tipo: string; p_user_id: string }
        Returns: boolean
      }
      user_in_plenaria_scope: {
        Args: { p_scope_id: string; p_scope_tipo: string }
        Returns: boolean
      }
      validate_evidence_with_feedback: {
        Args: {
          p_evidence_id: string
          p_note?: string
          p_reason_code?: string
          p_status: string
        }
        Returns: Json
      }
      validate_jsonb_safe: {
        Args: { input_json: Json; max_depth?: number; max_size_bytes?: number }
        Returns: boolean
      }
      validate_street_checkboxes: {
        Args: { input_checkboxes: Json }
        Returns: boolean
      }
      volunteer_request_cell_allocation: {
        Args: {
          p_bairro?: string
          p_city_id: string
          p_disponibilidade?: string
          p_interesses?: string[]
          p_preferred_cell_id?: string
        }
        Returns: Json
      }
      volunteer_save_city_selection: {
        Args: {
          p_city_id: string
          p_preferred_cell_id?: string
          p_skip_cell?: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      anuncio_escopo: "GLOBAL" | "REGIAO" | "CIDADE" | "CELULA"
      anuncio_status: "RASCUNHO" | "PUBLICADO" | "ARQUIVADO"
      app_role:
        | "voluntario"
        | "coordenador_celula"
        | "coordenador_regional"
        | "coordenador_estadual"
        | "admin"
      atividade_status: "rascunho" | "publicada" | "cancelada" | "concluida"
      atividade_tipo:
        | "reuniao"
        | "panfletagem"
        | "visita"
        | "mutirao"
        | "plenaria"
        | "formacao_presencial"
        | "ato"
        | "outro"
      availability_type:
        | "manha"
        | "tarde"
        | "noite"
        | "fim_de_semana"
        | "flexivel"
      candidatura_status: "pendente" | "aceito" | "recusado" | "cancelado"
      cell_tipo: "territorial" | "tema" | "regional"
      chamado_escopo_tipo: "celula" | "cidade"
      chamado_status: "aberto" | "em_andamento" | "fechado"
      chamado_urgencia: "baixa" | "media" | "alta"
      checkin_foco_tipo: "task" | "mission" | "crm" | "agenda" | "none"
      ciclo_status: "rascunho" | "ativo" | "encerrado"
      content_asset_role:
        | "PRIMARY"
        | "THUMBNAIL"
        | "CARD_1x1"
        | "CARD_4x5"
        | "STORY_9x16"
        | "THUMB_16x9"
        | "ATTACHMENT"
      content_status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      content_type: "MATERIAL" | "SHAREPACK" | "TEMPLATE"
      conteudo_status: "RASCUNHO" | "PUBLICADO"
      coord_audit_action:
        | "GRANT_ROLE"
        | "REVOKE_ROLE"
        | "UPSERT_CELL"
        | "APPROVE_ASSIGNMENT"
        | "CANCEL_ASSIGNMENT"
        | "APPROVE_VOLUNTEER"
        | "REJECT_VOLUNTEER"
      coord_role_type: "COORD_GLOBAL" | "COORD_CITY" | "CELL_COORD"
      crm_contato_status:
        | "novo"
        | "contatar"
        | "em_conversa"
        | "confirmado"
        | "inativo"
        | "convertido"
        | "reagendado"
        | "perdido"
      crm_interacao_tipo:
        | "ligacao"
        | "whatsapp"
        | "encontro"
        | "evento"
        | "outro"
      crm_origem_canal:
        | "whatsapp"
        | "instagram"
        | "rua"
        | "evento"
        | "indicacao"
        | "outro"
      curso_nivel: "INTRO" | "BASICO" | "INTERMEDIARIO"
      demanda_prioridade: "baixa" | "media" | "alta"
      demanda_status:
        | "nova"
        | "triagem"
        | "atribuida"
        | "agendada"
        | "concluida"
        | "arquivada"
      demanda_tipo:
        | "roda_conversa"
        | "material"
        | "duvida"
        | "evento"
        | "denuncia"
        | "outro"
        | "sugestao_base"
      evidence_status:
        | "pendente"
        | "aprovada"
        | "reprovada"
        | "rascunho"
        | "enviado"
        | "precisa_ajuste"
        | "validado"
        | "rejeitado"
      interest_type:
        | "rua"
        | "conteudo"
        | "escuta"
        | "dados"
        | "tech"
        | "formacao"
        | "juridico"
        | "logistica"
      lgpd_request_status: "aberto" | "em_andamento" | "concluido" | "negado"
      lgpd_request_tipo: "export" | "exclusao" | "correcao"
      material_categoria:
        | "arte"
        | "video"
        | "panfleto"
        | "logo"
        | "texto"
        | "outro"
      material_formato: "png" | "jpg" | "pdf" | "mp4" | "link" | "texto"
      material_status: "rascunho" | "aprovado" | "arquivado"
      mission_status:
        | "rascunho"
        | "publicada"
        | "em_andamento"
        | "enviada"
        | "validada"
        | "reprovada"
        | "concluida"
      mission_type:
        | "escuta"
        | "rua"
        | "mobilizacao"
        | "conteudo"
        | "dados"
        | "formacao"
        | "conversa"
      onboarding_status: "pendente" | "em_andamento" | "concluido"
      plan_item_status: "sugerido" | "assumido" | "feito" | "ignorado"
      registro_mode: "rapido" | "completo"
      registro_status:
        | "rascunho"
        | "enviado"
        | "precisa_ajuste"
        | "validado"
        | "rejeitado"
      registro_visibilidade: "privada" | "interna" | "publicavel"
      rsvp_status: "vou" | "talvez" | "nao_vou"
      skill_nivel: "iniciante" | "intermediario" | "avancado"
      squad_membro_papel: "membro" | "lider" | "apoio"
      squad_status: "ativo" | "pausado" | "encerrado"
      squad_task_prioridade: "baixa" | "media" | "alta"
      squad_task_status: "a_fazer" | "fazendo" | "feito" | "bloqueado"
      squad_task_update_tipo: "comentario" | "evidencia" | "status" | "bloqueio"
      ticket_categoria:
        | "DUVIDA_APP"
        | "PAUTA"
        | "MISSAO"
        | "MATERIAL"
        | "COORDENACAO"
        | "OUTROS"
      ticket_prioridade: "BAIXA" | "NORMAL" | "ALTA"
      ticket_status: "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "ARQUIVADO"
      topico_escopo: "global" | "celula"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      anuncio_escopo: ["GLOBAL", "REGIAO", "CIDADE", "CELULA"],
      anuncio_status: ["RASCUNHO", "PUBLICADO", "ARQUIVADO"],
      app_role: [
        "voluntario",
        "coordenador_celula",
        "coordenador_regional",
        "coordenador_estadual",
        "admin",
      ],
      atividade_status: ["rascunho", "publicada", "cancelada", "concluida"],
      atividade_tipo: [
        "reuniao",
        "panfletagem",
        "visita",
        "mutirao",
        "plenaria",
        "formacao_presencial",
        "ato",
        "outro",
      ],
      availability_type: [
        "manha",
        "tarde",
        "noite",
        "fim_de_semana",
        "flexivel",
      ],
      candidatura_status: ["pendente", "aceito", "recusado", "cancelado"],
      cell_tipo: ["territorial", "tema", "regional"],
      chamado_escopo_tipo: ["celula", "cidade"],
      chamado_status: ["aberto", "em_andamento", "fechado"],
      chamado_urgencia: ["baixa", "media", "alta"],
      checkin_foco_tipo: ["task", "mission", "crm", "agenda", "none"],
      ciclo_status: ["rascunho", "ativo", "encerrado"],
      content_asset_role: [
        "PRIMARY",
        "THUMBNAIL",
        "CARD_1x1",
        "CARD_4x5",
        "STORY_9x16",
        "THUMB_16x9",
        "ATTACHMENT",
      ],
      content_status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      content_type: ["MATERIAL", "SHAREPACK", "TEMPLATE"],
      conteudo_status: ["RASCUNHO", "PUBLICADO"],
      coord_audit_action: [
        "GRANT_ROLE",
        "REVOKE_ROLE",
        "UPSERT_CELL",
        "APPROVE_ASSIGNMENT",
        "CANCEL_ASSIGNMENT",
        "APPROVE_VOLUNTEER",
        "REJECT_VOLUNTEER",
      ],
      coord_role_type: ["COORD_GLOBAL", "COORD_CITY", "CELL_COORD"],
      crm_contato_status: [
        "novo",
        "contatar",
        "em_conversa",
        "confirmado",
        "inativo",
        "convertido",
        "reagendado",
        "perdido",
      ],
      crm_interacao_tipo: [
        "ligacao",
        "whatsapp",
        "encontro",
        "evento",
        "outro",
      ],
      crm_origem_canal: [
        "whatsapp",
        "instagram",
        "rua",
        "evento",
        "indicacao",
        "outro",
      ],
      curso_nivel: ["INTRO", "BASICO", "INTERMEDIARIO"],
      demanda_prioridade: ["baixa", "media", "alta"],
      demanda_status: [
        "nova",
        "triagem",
        "atribuida",
        "agendada",
        "concluida",
        "arquivada",
      ],
      demanda_tipo: [
        "roda_conversa",
        "material",
        "duvida",
        "evento",
        "denuncia",
        "outro",
        "sugestao_base",
      ],
      evidence_status: [
        "pendente",
        "aprovada",
        "reprovada",
        "rascunho",
        "enviado",
        "precisa_ajuste",
        "validado",
        "rejeitado",
      ],
      interest_type: [
        "rua",
        "conteudo",
        "escuta",
        "dados",
        "tech",
        "formacao",
        "juridico",
        "logistica",
      ],
      lgpd_request_status: ["aberto", "em_andamento", "concluido", "negado"],
      lgpd_request_tipo: ["export", "exclusao", "correcao"],
      material_categoria: [
        "arte",
        "video",
        "panfleto",
        "logo",
        "texto",
        "outro",
      ],
      material_formato: ["png", "jpg", "pdf", "mp4", "link", "texto"],
      material_status: ["rascunho", "aprovado", "arquivado"],
      mission_status: [
        "rascunho",
        "publicada",
        "em_andamento",
        "enviada",
        "validada",
        "reprovada",
        "concluida",
      ],
      mission_type: [
        "escuta",
        "rua",
        "mobilizacao",
        "conteudo",
        "dados",
        "formacao",
        "conversa",
      ],
      onboarding_status: ["pendente", "em_andamento", "concluido"],
      plan_item_status: ["sugerido", "assumido", "feito", "ignorado"],
      registro_mode: ["rapido", "completo"],
      registro_status: [
        "rascunho",
        "enviado",
        "precisa_ajuste",
        "validado",
        "rejeitado",
      ],
      registro_visibilidade: ["privada", "interna", "publicavel"],
      rsvp_status: ["vou", "talvez", "nao_vou"],
      skill_nivel: ["iniciante", "intermediario", "avancado"],
      squad_membro_papel: ["membro", "lider", "apoio"],
      squad_status: ["ativo", "pausado", "encerrado"],
      squad_task_prioridade: ["baixa", "media", "alta"],
      squad_task_status: ["a_fazer", "fazendo", "feito", "bloqueado"],
      squad_task_update_tipo: ["comentario", "evidencia", "status", "bloqueio"],
      ticket_categoria: [
        "DUVIDA_APP",
        "PAUTA",
        "MISSAO",
        "MATERIAL",
        "COORDENACAO",
        "OUTROS",
      ],
      ticket_prioridade: ["BAIXA", "NORMAL", "ALTA"],
      ticket_status: ["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "ARQUIVADO"],
      topico_escopo: ["global", "celula"],
    },
  },
} as const
