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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_item_ingredients: {
        Row: {
          extra_price: number
          id: string
          is_default: boolean
          is_removable: boolean
          menu_item_id: string
          name: string
        }
        Insert: {
          extra_price?: number
          id?: string
          is_default?: boolean
          is_removable?: boolean
          menu_item_id: string
          name: string
        }
        Update: {
          extra_price?: number
          id?: string
          is_default?: boolean
          is_removable?: boolean
          menu_item_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sort_order: number
          stock_alert_threshold: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          stock_alert_threshold?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          stock_alert_threshold?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          added_ingredients: string[] | null
          confirmed_at: string | null
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          removed_ingredients: string[] | null
          status: string
          token: string
          unit_price: number
        }
        Insert: {
          added_ingredients?: string[] | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          removed_ingredients?: string[] | null
          status?: string
          token?: string
          unit_price: number
        }
        Update: {
          added_ingredients?: string[] | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          removed_ingredients?: string[] | null
          status?: string
          token?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          session_client_id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          session_client_id: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          session_client_id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_session_client_id_fkey"
            columns: ["session_client_id"]
            isOneToOne: false
            referencedRelation: "session_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_client_id_fkey"
            columns: ["session_client_id"]
            isOneToOne: false
            referencedRelation: "session_clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_movements: {
        Row: {
          created_at: string | null
          id: string
          lot_number: string | null
          movement_type: string
          new_stock: number
          performed_by: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lot_number?: string | null
          movement_type: string
          new_stock: number
          performed_by?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lot_number?: string | null
          movement_type?: string
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_recipes: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          notes: string | null
          produced_at: string | null
          product_id: string
          quantity_used: number
          unit_of_measure: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          notes?: string | null
          produced_at?: string | null
          product_id: string
          quantity_used?: number
          unit_of_measure?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          notes?: string | null
          produced_at?: string | null
          product_id?: string
          quantity_used?: number
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          cost_per_lot: number | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          lot_size: number | null
          min_stock: number | null
          name: string
          sku: string | null
          supplier: string | null
          supplier_id: string | null
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cost_per_lot?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lot_size?: number | null
          min_stock?: number | null
          name: string
          sku?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit_of_measure?: string
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          cost_per_lot?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lot_size?: number | null
          min_stock?: number | null
          name?: string
          sku?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          document: string | null
          document_type: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          document_type?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          document_type?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      purchase_entries: {
        Row: {
          cost_per_unit: number | null
          cost_total: number
          created_at: string | null
          id: string
          invoice_number: string | null
          lot_number: string | null
          notes: string | null
          performed_by: string | null
          product_id: string
          purchase_date: string
          quantity: number
          supplier_id: string | null
          unit_of_measure: string
        }
        Insert: {
          cost_per_unit?: number | null
          cost_total?: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          lot_number?: string | null
          notes?: string | null
          performed_by?: string | null
          product_id: string
          purchase_date?: string
          quantity: number
          supplier_id?: string | null
          unit_of_measure?: string
        }
        Update: {
          cost_per_unit?: number | null
          cost_total?: number
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          lot_number?: string | null
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          purchase_date?: string
          quantity?: number
          supplier_id?: string | null
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_clients: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          client_token: string
          id: string
          joined_at: string
          session_id: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          client_token?: string
          id?: string
          joined_at?: string
          session_id: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          client_token?: string
          id?: string
          joined_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_clients_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          closed_at: string | null
          id: string
          opened_at: string
          opened_by: string | null
          status: string
          table_number: string | null
        }
        Insert: {
          closed_at?: string | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          status?: string
          table_number?: string | null
        }
        Update: {
          closed_at?: string | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          status?: string
          table_number?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          movement_type: string
          new_stock: number
          performed_by: string | null
          previous_stock: number
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          movement_type: string
          new_stock: number
          performed_by?: string | null
          previous_stock: number
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          movement_type?: string
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
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
      session_clients_public: {
        Row: {
          client_name: string | null
          client_token: string | null
          id: string | null
          joined_at: string | null
          session_id: string | null
        }
        Insert: {
          client_name?: string | null
          client_token?: string | null
          id?: string | null
          joined_at?: string | null
          session_id?: string | null
        }
        Update: {
          client_name?: string | null
          client_token?: string | null
          id?: string | null
          joined_at?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_clients_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrement_stock: {
        Args: {
          _menu_item_id: string
          _performed_by?: string
          _quantity: number
        }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
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
        | "customer"
        | "bar"
        | "event_organizer"
        | "admin"
        | "attendant"
        | "kitchen"
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
        "customer",
        "bar",
        "event_organizer",
        "admin",
        "attendant",
        "kitchen",
      ],
    },
  },
} as const
