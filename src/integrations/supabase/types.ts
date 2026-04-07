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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
