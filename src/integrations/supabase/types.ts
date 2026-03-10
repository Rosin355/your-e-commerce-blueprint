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
          barcode: string | null
          compare_at_price: number | null
          description: string | null
          image_urls: Json | null
          imported_at: string
          inventory_quantity: number | null
          price: number | null
          product_category: string | null
          product_category_id: string | null
          sku: string
          source_file: string | null
          tags: Json | null
          title: string | null
          weight_grams: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          description?: string | null
          image_urls?: Json | null
          imported_at?: string
          inventory_quantity?: number | null
          price?: number | null
          product_category?: string | null
          product_category_id?: string | null
          sku: string
          source_file?: string | null
          tags?: Json | null
          title?: string | null
          weight_grams?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          description?: string | null
          image_urls?: Json | null
          imported_at?: string
          inventory_quantity?: number | null
          price?: number | null
          product_category?: string | null
          product_category_id?: string | null
          sku?: string
          source_file?: string | null
          tags?: Json | null
          title?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
