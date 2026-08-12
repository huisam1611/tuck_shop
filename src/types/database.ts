export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_order_counters: {
        Row: {
          next_order_number: number
          sale_date: string
        }
        Insert: {
          next_order_number: number
          sale_date: string
        }
        Update: {
          next_order_number?: number
          sale_date?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string
          cost_price: number
          created_at: string
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          name_en: string | null
          name_zh: string | null
          flavour: string | null
          size: string | null
          package_type: string | null
          product_code: string
          selling_price: number
          status: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category: string
          cost_price: number
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number
          name: string
          name_en?: string | null
          name_zh?: string | null
          flavour?: string | null
          size?: string | null
          package_type?: string | null
          product_code: string
          selling_price: number
          status?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number
          name?: string
          name_en?: string | null
          name_zh?: string | null
          flavour?: string | null
          size?: string | null
          package_type?: string | null
          product_code?: string
          selling_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cost_total: number
          created_at: string
          id: string
          product_code: string
          product_id: string
          product_name: string
          profit: number
          quantity: number
          sale_id: string
          subtotal: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          cost_total: number
          created_at?: string
          id?: string
          product_code: string
          product_id: string
          product_name: string
          profit: number
          quantity: number
          sale_id: string
          subtotal: number
          unit_cost: number
          unit_price: number
        }
        Update: {
          cost_total?: number
          created_at?: string
          id?: string
          product_code?: string
          product_id?: string
          product_name?: string
          profit?: number
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "staff_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_request_id: string
          created_at: string
          daily_order_number: number
          grand_total: number
          id: string
          payment_method: string
          sale_date: string
          staff_id: string
          status: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          client_request_id: string
          created_at?: string
          daily_order_number: number
          grand_total?: number
          id?: string
          payment_method: string
          sale_date: string
          staff_id: string
          status?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          client_request_id?: string
          created_at?: string
          daily_order_number?: number
          grand_total?: number
          id?: string
          payment_method?: string
          sale_date?: string
          staff_id?: string
          status?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          movement_type: string
          product_id: string
          quantity_change: number
          reason: string | null
          reference_id: string | null
          reference_type: string
          stock_after: number
          stock_before: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          movement_type: string
          product_id: string
          quantity_change: number
          reason?: string | null
          reference_id?: string | null
          reference_type: string
          stock_after: number
          stock_before: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          movement_type?: string
          product_id?: string
          quantity_change?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string
          stock_after?: number
          stock_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          product_id: string
          quantity: number
          receipt_date: string
          supplier_name: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          product_id: string
          quantity: number
          receipt_date: string
          supplier_name?: string | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          product_id?: string
          quantity?: number
          receipt_date?: string
          supplier_name?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      staff_inventory: {
        Row: {
          category: string | null
          current_stock: number | null
          id: string | null
          minimum_stock: number | null
          name: string | null
          product_code: string | null
          status: string | null
        }
        Insert: {
          category?: string | null
          current_stock?: number | null
          id?: string | null
          minimum_stock?: number | null
          name?: string | null
          product_code?: string | null
          status?: string | null
        }
        Update: {
          category?: string | null
          current_stock?: number | null
          id?: string | null
          minimum_stock?: number | null
          name?: string | null
          product_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      staff_products: {
        Row: {
          category: string | null
          current_stock: number | null
          id: string | null
          minimum_stock: number | null
          name: string | null
          product_code: string | null
          selling_price: number | null
          status: string | null
        }
        Insert: {
          category?: string | null
          current_stock?: number | null
          id?: string | null
          minimum_stock?: number | null
          name?: string | null
          product_code?: string | null
          selling_price?: number | null
          status?: string | null
        }
        Update: {
          category?: string | null
          current_stock?: number | null
          id?: string | null
          minimum_stock?: number | null
          name?: string | null
          product_code?: string | null
          selling_price?: number | null
          status?: string | null
        }
        Relationships: []
      }
      staff_sale_items: {
        Row: {
          id: string | null
          product_code: string | null
          product_name: string | null
          quantity: number | null
          sale_id: string | null
          subtotal: number | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "staff_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sales: {
        Row: {
          created_at: string | null
          daily_order_number: number | null
          grand_total: number | null
          id: string | null
          payment_method: string | null
          sale_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          daily_order_number?: number | null
          grand_total?: number | null
          id?: string | null
          payment_method?: string | null
          sale_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          daily_order_number?: number | null
          grand_total?: number | null
          id?: string | null
          payment_method?: string | null
          sale_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_direction: string
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: {
          created_at: string
          created_by: string
          id: string
          movement_type: string
          product_id: string
          quantity_change: number
          reason: string | null
          reference_id: string | null
          reference_type: string
          stock_after: number
          stock_before: number
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_profile: {
        Args: {
          p_is_active: boolean
          p_name: string
          p_role: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_product: {
        Args: {
          p_barcode?: string | null
          p_brand?: string | null
          p_category: string
          p_cost_price: number
          p_minimum_stock: number
          p_name: string
          p_product_code: string
          p_selling_price: number
          p_name_en?: string | null
          p_name_zh?: string | null
          p_flavour?: string | null
          p_size?: string | null
          p_package_type?: string | null
        }
        Returns: {
          barcode: string | null
          brand: string | null
          category: string
          cost_price: number
          created_at: string
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          name_en: string | null
          name_zh: string | null
          flavour: string | null
          size: string | null
          package_type: string | null
          product_code: string
          selling_price: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_sale: {
        Args: {
          p_client_request_id: string
          p_items: Json
          p_payment_method: string
          p_sale_date: string
        }
        Returns: {
          daily_order_number: number
          grand_total: number
          sale_date: string
          sale_id: string
          status: string
        }[]
      }
      delete_product: { Args: { p_product_id: string }; Returns: undefined }
      has_role: { Args: { required_role: string }; Returns: boolean }
      is_active_user: { Args: never; Returns: boolean }
      stock_in: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_receipt_date: string
          p_supplier_name?: string
          p_unit_cost: number
        }
        Returns: {
          created_at: string
          created_by: string
          id: string
          product_id: string
          quantity: number
          receipt_date: string
          supplier_name: string | null
          unit_cost: number
        }
        SetofOptions: {
          from: "*"
          to: "stock_receipts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_product: {
        Args: {
          p_barcode?: string | null
          p_brand?: string | null
          p_category: string
          p_cost_price: number
          p_minimum_stock: number
          p_name: string
          p_product_code: string
          p_product_id: string
          p_selling_price: number
          p_status: string
          p_name_en?: string | null
          p_name_zh?: string | null
          p_flavour?: string | null
          p_size?: string | null
          p_package_type?: string | null
        }
        Returns: {
          barcode: string | null
          brand: string | null
          category: string
          cost_price: number
          created_at: string
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          name_en: string | null
          name_zh: string | null
          flavour: string | null
          size: string | null
          package_type: string | null
          product_code: string
          selling_price: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_sale: {
        Args: { p_reason: string; p_sale_id: string }
        Returns: {
          client_request_id: string
          created_at: string
          daily_order_number: number
          grand_total: number
          id: string
          payment_method: string
          sale_date: string
          staff_id: string
          status: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
