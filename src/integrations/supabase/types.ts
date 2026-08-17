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
      bulbi_classification_matrix: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          botanical_type: string
          confidence: number | null
          created_at: string
          id: string
          manual_override: string | null
          notes: string | null
          product_id: string
          proposal_source: string
          proposed_season: string | null
          review_status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          botanical_type: string
          confidence?: number | null
          created_at?: string
          id?: string
          manual_override?: string | null
          notes?: string | null
          product_id: string
          proposal_source?: string
          proposed_season?: string | null
          review_status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          botanical_type?: string
          confidence?: number | null
          created_at?: string
          id?: string
          manual_override?: string | null
          notes?: string | null
          product_id?: string
          proposal_source?: string
          proposed_season?: string | null
          review_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulbi_classification_matrix_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_jobs: {
        Row: {
          ai_enriched_count: number | null
          created_at: string | null
          created_rows: number | null
          default_vendor: string | null
          dry_run: boolean | null
          error_count: number | null
          error_message: string | null
          errors: Json | null
          fallback_count: number | null
          id: string
          input_file_path: string | null
          output_file_path: string | null
          partial_rows: Json | null
          processed_rows: number | null
          report_json: Json | null
          row_limit: number | null
          skipped_rows: number | null
          status: string
          total_rows: number | null
          updated_at: string | null
          use_ai: boolean | null
          warning_count: number | null
          warnings: Json | null
        }
        Insert: {
          ai_enriched_count?: number | null
          created_at?: string | null
          created_rows?: number | null
          default_vendor?: string | null
          dry_run?: boolean | null
          error_count?: number | null
          error_message?: string | null
          errors?: Json | null
          fallback_count?: number | null
          id?: string
          input_file_path?: string | null
          output_file_path?: string | null
          partial_rows?: Json | null
          processed_rows?: number | null
          report_json?: Json | null
          row_limit?: number | null
          skipped_rows?: number | null
          status?: string
          total_rows?: number | null
          updated_at?: string | null
          use_ai?: boolean | null
          warning_count?: number | null
          warnings?: Json | null
        }
        Update: {
          ai_enriched_count?: number | null
          created_at?: string | null
          created_rows?: number | null
          default_vendor?: string | null
          dry_run?: boolean | null
          error_count?: number | null
          error_message?: string | null
          errors?: Json | null
          fallback_count?: number | null
          id?: string
          input_file_path?: string | null
          output_file_path?: string | null
          partial_rows?: Json | null
          processed_rows?: number | null
          report_json?: Json | null
          row_limit?: number | null
          skipped_rows?: number | null
          status?: string
          total_rows?: number | null
          updated_at?: string | null
          use_ai?: boolean | null
          warning_count?: number | null
          warnings?: Json | null
        }
        Relationships: []
      }
      product_admin_command_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          field_key: string | null
          id: string
          idempotency_key: string
          payload_hash: string
          product_id: string | null
          result_json: Json
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          field_key?: string | null
          id?: string
          idempotency_key: string
          payload_hash: string
          product_id?: string | null
          result_json?: Json
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          field_key?: string | null
          id?: string
          idempotency_key?: string
          payload_hash?: string
          product_id?: string | null
          result_json?: Json
        }
        Relationships: []
      }
      product_ai_suggestions: {
        Row: {
          based_on_value: Json | null
          created_at: string
          created_by: string | null
          entity_type: string
          field_key: string
          id: string
          model: string | null
          product_id: string
          prompt_hint: string | null
          resolved_at: string | null
          resolved_by: string | null
          sku: string
          status: string
          suggestion_json: Json | null
          suggestion_text: string | null
        }
        Insert: {
          based_on_value?: Json | null
          created_at?: string
          created_by?: string | null
          entity_type?: string
          field_key: string
          id?: string
          model?: string | null
          product_id: string
          prompt_hint?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sku: string
          status?: string
          suggestion_json?: Json | null
          suggestion_text?: string | null
        }
        Update: {
          based_on_value?: Json | null
          created_at?: string
          created_by?: string | null
          entity_type?: string
          field_key?: string
          id?: string
          model?: string | null
          product_id?: string
          prompt_hint?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sku?: string
          status?: string
          suggestion_json?: Json | null
          suggestion_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pas_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ai_suggestions_field_key_fkey"
            columns: ["field_key"]
            isOneToOne: false
            referencedRelation: "product_field_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          legacy_aliases: string[]
          level: number
          notes: string | null
          parent_id: string | null
          path_keys: string[]
          slug: string
          sort_order: number
          stable_key: string
          taxonomy_version: string
          updated_at: string
          visible_admin: boolean
          visible_storefront: boolean
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          legacy_aliases?: string[]
          level?: number
          notes?: string | null
          parent_id?: string | null
          path_keys?: string[]
          slug: string
          sort_order?: number
          stable_key: string
          taxonomy_version?: string
          updated_at?: string
          visible_admin?: boolean
          visible_storefront?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          legacy_aliases?: string[]
          level?: number
          notes?: string | null
          parent_id?: string | null
          path_keys?: string[]
          slug?: string
          sort_order?: number
          stable_key?: string
          taxonomy_version?: string
          updated_at?: string
          visible_admin?: boolean
          visible_storefront?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_assignments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string
          created_at: string
          id: string
          is_primary: boolean
          notes: string | null
          origin: string
          product_id: string
          proposed_by: string | null
          source_map_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          origin?: string
          product_id: string
          proposed_by?: string | null
          source_map_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          origin?: string
          product_id?: string
          proposed_by?: string | null
          source_map_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_assignments_source_map_id_fkey"
            columns: ["source_map_id"]
            isOneToOne: false
            referencedRelation: "product_category_source_map"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_shopify_map: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string
          created_at: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          map_status: string
          shopify_collection_gid: string | null
          shopify_handle: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          map_status?: string
          shopify_collection_gid?: string | null
          shopify_handle: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          map_status?: string
          shopify_collection_gid?: string | null
          shopify_handle?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_shopify_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_source_map: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assignment_role: string
          confidence: number | null
          created_at: string
          id: string
          mapping_method: string
          mapping_status: string
          notes: string | null
          source_path_norm: string
          source_path_original: string
          source_profile: string
          source_system: string
          target_category: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assignment_role?: string
          confidence?: number | null
          created_at?: string
          id?: string
          mapping_method?: string
          mapping_status?: string
          notes?: string | null
          source_path_norm: string
          source_path_original: string
          source_profile?: string
          source_system?: string
          target_category?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assignment_role?: string
          confidence?: number | null
          created_at?: string
          id?: string
          mapping_method?: string
          mapping_status?: string
          notes?: string | null
          source_path_norm?: string
          source_path_original?: string
          source_profile?: string
          source_system?: string
          target_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_source_map_target_category_fkey"
            columns: ["target_category"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_current_values: {
        Row: {
          created_at: string
          entity_type: string
          field_key: string
          id: string
          is_locked: boolean
          origin: string
          parent_sku: string | null
          product_id: string
          protected_on_reimport: boolean
          publish_blocked: boolean
          publish_state: string
          published_at: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          sku: string
          source_batch_id: string | null
          updated_at: string
          updated_by: string | null
          value_json: Json | null
          value_number: number | null
          value_origin: string
          value_text: string | null
          version: number
        }
        Insert: {
          created_at?: string
          entity_type?: string
          field_key: string
          id?: string
          is_locked?: boolean
          origin?: string
          parent_sku?: string | null
          product_id: string
          protected_on_reimport?: boolean
          publish_blocked?: boolean
          publish_state?: string
          published_at?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sku: string
          source_batch_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_origin?: string
          value_text?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          entity_type?: string
          field_key?: string
          id?: string
          is_locked?: boolean
          origin?: string
          parent_sku?: string | null
          product_id?: string
          protected_on_reimport?: boolean
          publish_blocked?: boolean
          publish_state?: string
          published_at?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sku?: string
          source_batch_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_origin?: string
          value_text?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pcv_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_current_values_field_key_fkey"
            columns: ["field_key"]
            isOneToOne: false
            referencedRelation: "product_field_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "product_current_values_source_batch_id_fkey"
            columns: ["source_batch_id"]
            isOneToOne: false
            referencedRelation: "product_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_enrichment_run_items: {
        Row: {
          error_message: string | null
          handle: string | null
          id: string
          metafields_report: Json | null
          run_id: string
          sku: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          error_message?: string | null
          handle?: string | null
          id?: string
          metafields_report?: Json | null
          run_id: string
          sku: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          error_message?: string | null
          handle?: string | null
          id?: string
          metafields_report?: Json | null
          run_id?: string
          sku?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_enrichment_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "product_enrichment_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_enrichment_runs: {
        Row: {
          created_at: string
          done: number
          failed: number
          id: string
          initiated_by: string
          mode: string
          notes: Json
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          done?: number
          failed?: number
          id?: string
          initiated_by: string
          mode?: string
          notes?: Json
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: number
          failed?: number
          id?: string
          initiated_by?: string
          mode?: string
          notes?: Json
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_field_definitions: {
        Row: {
          ai_allowed: boolean
          applies_to: string
          created_at: string
          data_type: string
          editable: boolean
          editor_type: string
          field_group: string
          help_text: string | null
          key: string
          label: string
          manual_only: boolean
          protected_on_reimport: boolean
          publishable: boolean
          required: boolean
          review_policy: string
          shopify_mapping: Json
          sort_order: number
          source_aliases: string[]
          updated_at: string
          validation_rules: Json
          visible: boolean
        }
        Insert: {
          ai_allowed?: boolean
          applies_to?: string
          created_at?: string
          data_type?: string
          editable?: boolean
          editor_type?: string
          field_group?: string
          help_text?: string | null
          key: string
          label: string
          manual_only?: boolean
          protected_on_reimport?: boolean
          publishable?: boolean
          required?: boolean
          review_policy?: string
          shopify_mapping?: Json
          sort_order?: number
          source_aliases?: string[]
          updated_at?: string
          validation_rules?: Json
          visible?: boolean
        }
        Update: {
          ai_allowed?: boolean
          applies_to?: string
          created_at?: string
          data_type?: string
          editable?: boolean
          editor_type?: string
          field_group?: string
          help_text?: string | null
          key?: string
          label?: string
          manual_only?: boolean
          protected_on_reimport?: boolean
          publishable?: boolean
          required?: boolean
          review_policy?: string
          shopify_mapping?: Json
          sort_order?: number
          source_aliases?: string[]
          updated_at?: string
          validation_rules?: Json
          visible?: boolean
        }
        Relationships: []
      }
      product_field_history: {
        Row: {
          actor: string | null
          actor_label: string | null
          batch_id: string | null
          change_type: string
          created_at: string
          entity_type: string
          field_key: string
          id: string
          job_id: string | null
          new_origin: string | null
          new_review_status: string | null
          new_value: Json | null
          new_version: number | null
          previous_origin: string | null
          previous_review_status: string | null
          previous_value: Json | null
          previous_version: number | null
          product_id: string
          request_key: string | null
          sku: string
        }
        Insert: {
          actor?: string | null
          actor_label?: string | null
          batch_id?: string | null
          change_type: string
          created_at?: string
          entity_type?: string
          field_key: string
          id?: string
          job_id?: string | null
          new_origin?: string | null
          new_review_status?: string | null
          new_value?: Json | null
          new_version?: number | null
          previous_origin?: string | null
          previous_review_status?: string | null
          previous_value?: Json | null
          previous_version?: number | null
          product_id: string
          request_key?: string | null
          sku: string
        }
        Update: {
          actor?: string | null
          actor_label?: string | null
          batch_id?: string | null
          change_type?: string
          created_at?: string
          entity_type?: string
          field_key?: string
          id?: string
          job_id?: string | null
          new_origin?: string | null
          new_review_status?: string | null
          new_value?: Json | null
          new_version?: number | null
          previous_origin?: string | null
          previous_review_status?: string | null
          previous_value?: Json | null
          previous_version?: number | null
          product_id?: string
          request_key?: string | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfh_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_field_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_import_batches: {
        Row: {
          applied_at: string | null
          checksum_sha256: string
          created_at: string
          created_by: string | null
          detected_headers: Json
          error_message: string | null
          file_name: string
          header_mapping: Json
          id: string
          idempotency_key: string
          parent_rows: number
          potential_data_loss: number
          profile_key: string
          report_json: Json
          status: string
          storage_path: string
          total_rows: number
          unmapped_headers: Json
          updated_at: string
          variation_rows: number
        }
        Insert: {
          applied_at?: string | null
          checksum_sha256: string
          created_at?: string
          created_by?: string | null
          detected_headers?: Json
          error_message?: string | null
          file_name: string
          header_mapping?: Json
          id?: string
          idempotency_key: string
          parent_rows?: number
          potential_data_loss?: number
          profile_key?: string
          report_json?: Json
          status?: string
          storage_path: string
          total_rows?: number
          unmapped_headers?: Json
          updated_at?: string
          variation_rows?: number
        }
        Update: {
          applied_at?: string | null
          checksum_sha256?: string
          created_at?: string
          created_by?: string | null
          detected_headers?: Json
          error_message?: string | null
          file_name?: string
          header_mapping?: Json
          id?: string
          idempotency_key?: string
          parent_rows?: number
          potential_data_loss?: number
          profile_key?: string
          report_json?: Json
          status?: string
          storage_path?: string
          total_rows?: number
          unmapped_headers?: Json
          updated_at?: string
          variation_rows?: number
        }
        Relationships: []
      }
      product_publication_jobs: {
        Row: {
          approved_by: string | null
          created_at: string
          error_json: Json | null
          finished_at: string | null
          id: string
          idempotency_key: string
          lock_key: string | null
          product_id: string
          requested_by: string | null
          scope: Json
          skus: string[]
          started_at: string | null
          status: string
          summary_json: Json
          target: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          error_json?: Json | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          lock_key?: string | null
          product_id: string
          requested_by?: string | null
          scope?: Json
          skus?: string[]
          started_at?: string | null
          status?: string
          summary_json?: Json
          target?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          error_json?: Json | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          lock_key?: string | null
          product_id?: string
          requested_by?: string | null
          scope?: Json
          skus?: string[]
          started_at?: string | null
          status?: string
          summary_json?: Json
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppj_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_source_snapshots: {
        Row: {
          batch_id: string
          category_leaf: string | null
          category_levels: Json
          category_path_original: string | null
          category_root: string | null
          created_at: string
          id: string
          inventory_backorder: string | null
          inventory_in_stock: boolean | null
          inventory_quantity: number | null
          normalized: Json
          parent_sku: string | null
          position: number
          product_id: string | null
          raw_row: Json
          row_index: number
          row_type: string
          shopify_variant_id: string | null
          sku: string
          source_id: string | null
          source_parent_id: string | null
          variant_compare_price: number | null
          variant_dimensions: Json
          variant_image_url: string | null
          variant_options: Json
          variant_price: number | null
          variant_status: string | null
          variant_weight_grams: number | null
        }
        Insert: {
          batch_id: string
          category_leaf?: string | null
          category_levels?: Json
          category_path_original?: string | null
          category_root?: string | null
          created_at?: string
          id?: string
          inventory_backorder?: string | null
          inventory_in_stock?: boolean | null
          inventory_quantity?: number | null
          normalized?: Json
          parent_sku?: string | null
          position?: number
          product_id?: string | null
          raw_row: Json
          row_index: number
          row_type?: string
          shopify_variant_id?: string | null
          sku: string
          source_id?: string | null
          source_parent_id?: string | null
          variant_compare_price?: number | null
          variant_dimensions?: Json
          variant_image_url?: string | null
          variant_options?: Json
          variant_price?: number | null
          variant_status?: string | null
          variant_weight_grams?: number | null
        }
        Update: {
          batch_id?: string
          category_leaf?: string | null
          category_levels?: Json
          category_path_original?: string | null
          category_root?: string | null
          created_at?: string
          id?: string
          inventory_backorder?: string | null
          inventory_in_stock?: boolean | null
          inventory_quantity?: number | null
          normalized?: Json
          parent_sku?: string | null
          position?: number
          product_id?: string | null
          raw_row?: Json
          row_index?: number
          row_type?: string
          shopify_variant_id?: string | null
          sku?: string
          source_id?: string | null
          source_parent_id?: string | null
          variant_compare_price?: number | null
          variant_dimensions?: Json
          variant_image_url?: string | null
          variant_options?: Json
          variant_price?: number | null
          variant_status?: string | null
          variant_weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_source_snapshots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pss_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sync_csv_products: {
        Row: {
          ai_enriched_at: string | null
          ai_enrichment_json: Json | null
          ai_seed_style: string | null
          barcode: string | null
          compare_at_price: number | null
          description: string | null
          handle: string | null
          image_urls: Json | null
          imported_at: string
          inventory_quantity: number | null
          metafields: Json | null
          optimized_description: string | null
          parent_sku: string | null
          price: number | null
          product_category: string | null
          product_category_id: string | null
          product_type: string | null
          seo_description: string | null
          seo_title: string | null
          shopify_last_sync_mode: string | null
          shopify_metafields_failed: number
          shopify_metafields_report: Json | null
          shopify_metafields_skipped: number
          shopify_metafields_written: number
          shopify_product_id: string | null
          shopify_resolved_by: string | null
          shopify_sync_error: string | null
          shopify_sync_status: string | null
          shopify_synced_at: string | null
          short_description: string | null
          sku: string
          source_file: string | null
          tags: Json | null
          title: string | null
          vendor: string | null
          weight_grams: number | null
        }
        Insert: {
          ai_enriched_at?: string | null
          ai_enrichment_json?: Json | null
          ai_seed_style?: string | null
          barcode?: string | null
          compare_at_price?: number | null
          description?: string | null
          handle?: string | null
          image_urls?: Json | null
          imported_at?: string
          inventory_quantity?: number | null
          metafields?: Json | null
          optimized_description?: string | null
          parent_sku?: string | null
          price?: number | null
          product_category?: string | null
          product_category_id?: string | null
          product_type?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_last_sync_mode?: string | null
          shopify_metafields_failed?: number
          shopify_metafields_report?: Json | null
          shopify_metafields_skipped?: number
          shopify_metafields_written?: number
          shopify_product_id?: string | null
          shopify_resolved_by?: string | null
          shopify_sync_error?: string | null
          shopify_sync_status?: string | null
          shopify_synced_at?: string | null
          short_description?: string | null
          sku: string
          source_file?: string | null
          tags?: Json | null
          title?: string | null
          vendor?: string | null
          weight_grams?: number | null
        }
        Update: {
          ai_enriched_at?: string | null
          ai_enrichment_json?: Json | null
          ai_seed_style?: string | null
          barcode?: string | null
          compare_at_price?: number | null
          description?: string | null
          handle?: string | null
          image_urls?: Json | null
          imported_at?: string
          inventory_quantity?: number | null
          metafields?: Json | null
          optimized_description?: string | null
          parent_sku?: string | null
          price?: number | null
          product_category?: string | null
          product_category_id?: string | null
          product_type?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_last_sync_mode?: string | null
          shopify_metafields_failed?: number
          shopify_metafields_report?: Json | null
          shopify_metafields_skipped?: number
          shopify_metafields_written?: number
          shopify_product_id?: string | null
          shopify_resolved_by?: string | null
          shopify_sync_error?: string | null
          shopify_sync_status?: string | null
          shopify_synced_at?: string | null
          short_description?: string | null
          sku?: string
          source_file?: string | null
          tags?: Json | null
          title?: string | null
          vendor?: string | null
          weight_grams?: number | null
        }
        Relationships: []
      }
      product_sync_jobs: {
        Row: {
          created_at: string
          failed_products: number
          id: string
          initiated_by: string | null
          mode: string
          report_json: Json | null
          status: string
          total_products: number
          unchanged_products: number
          updated_at: string
          updated_products: number
        }
        Insert: {
          created_at?: string
          failed_products?: number
          id?: string
          initiated_by?: string | null
          mode?: string
          report_json?: Json | null
          status?: string
          total_products?: number
          unchanged_products?: number
          updated_at?: string
          updated_products?: number
        }
        Update: {
          created_at?: string
          failed_products?: number
          id?: string
          initiated_by?: string | null
          mode?: string
          report_json?: Json | null
          status?: string
          total_products?: number
          unchanged_products?: number
          updated_at?: string
          updated_products?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          is_active: boolean
          legacy_source: string
          parent_product_id: string | null
          sku: string
          sku_norm: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          legacy_source?: string
          parent_product_id?: string | null
          sku: string
          sku_norm?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          legacy_source?: string
          parent_product_id?: string | null
          sku?: string
          sku_norm?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shopify_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          installed_by: string | null
          is_active: boolean
          scopes: string | null
          shop_domain: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          installed_by?: string | null
          is_active?: boolean
          scopes?: string | null
          shop_domain: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          installed_by?: string | null
          is_active?: boolean
          scopes?: string | null
          shop_domain?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shopify_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          shop_domain: string
          state: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          shop_domain: string
          state: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          shop_domain?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_product_field: {
        Args: {
          p_action: string
          p_actor: string
          p_actor_label?: string
          p_expected_version: number
          p_field_key: string
          p_idempotency_key: string
          p_payload_hash: string
          p_product_id: string
          p_value: Json
        }
        Returns: Json
      }
      can_edit_products: { Args: { _user_id: string }; Returns: boolean }
      can_manage_taxonomy: { Args: { _user_id: string }; Returns: boolean }
      can_publish_products: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "editor"
        | "publisher"
        | "tech_admin"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "editor",
        "publisher",
        "tech_admin",
      ],
    },
  },
} as const
