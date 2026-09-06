/**
 * Generated database types.
 *
 * DO NOT EDIT BY HAND. Regenerate after any migration.
 * (Supabase MCP: `generate_typescript_types`, or
 *  `supabase gen types typescript --project-id wsdahucinbnzvuoluqft`.)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      home_content: {
        Row: {
          assurances: Json
          carry_body: string
          carry_eyebrow: string
          carry_heading: string
          carry_image_path: string | null
          carry_image_url: string | null
          category_body: string
          category_eyebrow: string
          category_heading: string
          editorial_cta: string
          editorial_eyebrow: string
          editorial_heading: string
          editorial_image_path: string | null
          editorial_image_url: string | null
          hero_body: string
          hero_eyebrow: string
          hero_heading: string
          hero_image_path: string | null
          hero_image_url: string | null
          hero_primary_cta: string
          id: number
          shoreline_body: string
          shoreline_handle: string
          shoreline_heading: string
          title: string
          updated_at: string
        }
        Insert: {
          assurances?: Json
          carry_body?: string
          carry_eyebrow?: string
          carry_heading?: string
          carry_image_path?: string | null
          carry_image_url?: string | null
          category_body?: string
          category_eyebrow?: string
          category_heading?: string
          editorial_cta?: string
          editorial_eyebrow?: string
          editorial_heading?: string
          editorial_image_path?: string | null
          editorial_image_url?: string | null
          hero_body?: string
          hero_eyebrow?: string
          hero_heading?: string
          hero_image_path?: string | null
          hero_image_url?: string | null
          hero_primary_cta?: string
          id?: number
          shoreline_body?: string
          shoreline_handle?: string
          shoreline_heading?: string
          title?: string
          updated_at?: string
        }
        Update: {
          assurances?: Json
          carry_body?: string
          carry_eyebrow?: string
          carry_heading?: string
          carry_image_path?: string | null
          carry_image_url?: string | null
          category_body?: string
          category_eyebrow?: string
          category_heading?: string
          editorial_cta?: string
          editorial_eyebrow?: string
          editorial_heading?: string
          editorial_image_path?: string | null
          editorial_image_url?: string | null
          hero_body?: string
          hero_eyebrow?: string
          hero_heading?: string
          hero_image_path?: string | null
          hero_image_url?: string | null
          hero_primary_cta?: string
          id?: number
          shoreline_body?: string
          shoreline_handle?: string
          shoreline_heading?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          color: string
          id: string
          product_id: string
          size: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          color?: string
          id?: string
          product_id: string
          size?: string
          sku?: string | null
          stock: number
          updated_at?: string
        }
        Update: {
          color?: string
          id?: string
          product_id?: string
          size?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color: string
          id: string
          line_total: number
          name: string
          order_id: string
          position: number
          product_id: string | null
          quantity: number
          size: string
          slug: string
          unit_price: number
          variant_label: string
        }
        Insert: {
          color?: string
          id?: string
          line_total: number
          name: string
          order_id: string
          position?: number
          product_id?: string | null
          quantity: number
          size?: string
          slug?: string
          unit_price: number
          variant_label?: string
        }
        Update: {
          color?: string
          id?: string
          line_total?: number
          name?: string
          order_id?: string
          position?: number
          product_id?: string | null
          quantity?: number
          size?: string
          slug?: string
          unit_price?: number
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line1: string
          address_line2: string
          city: string
          country: string
          created_at: string
          currency: string
          customer_name: string
          delivery_label: string
          delivery_method: string
          discount: number
          email: string
          id: string
          item_count: number
          notes: string | null
          payment_method: string
          phone: string
          postal_code: string
          promo_code: string | null
          province: string
          reference: string
          shipping: number
          status: Database["public"]["Enums"]["order_status"]
          stock_reserved: boolean
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string
          city: string
          country?: string
          created_at?: string
          currency?: string
          customer_name: string
          delivery_label: string
          delivery_method: string
          discount?: number
          email: string
          id?: string
          item_count: number
          notes?: string | null
          payment_method: string
          phone?: string
          postal_code: string
          promo_code?: string | null
          province: string
          reference?: string
          shipping: number
          status?: Database["public"]["Enums"]["order_status"]
          stock_reserved?: boolean
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          customer_name?: string
          delivery_label?: string
          delivery_method?: string
          discount?: number
          email?: string
          id?: string
          item_count?: number
          notes?: string | null
          payment_method?: string
          phone?: string
          postal_code?: string
          promo_code?: string | null
          province?: string
          reference?: string
          shipping?: number
          status?: Database["public"]["Enums"]["order_status"]
          stock_reserved?: boolean
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          height: number
          id: string
          position: number
          product_id: string
          storage_path: string
          width: number
        }
        Insert: {
          alt?: string
          created_at?: string
          height?: number
          id?: string
          position?: number
          product_id: string
          storage_path: string
          width?: number
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          blurb: string
          category: Database["public"]["Enums"]["product_category"]
          colors: Json
          coming_soon: boolean
          created_at: string
          currency: string
          id: string
          materials: string
          price: number
          size_label: string
          sizes: string[]
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
        }
        Insert: {
          blurb?: string
          category: Database["public"]["Enums"]["product_category"]
          colors?: Json
          coming_soon?: boolean
          created_at?: string
          currency?: string
          id?: string
          materials?: string
          price?: number
          size_label?: string
          sizes?: string[]
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
        }
        Update: {
          blurb?: string
          category?: Database["public"]["Enums"]["product_category"]
          colors?: Json
          coming_soon?: boolean
          created_at?: string
          currency?: string
          id?: string
          materials?: string
          price?: number
          size_label?: string
          sizes?: string[]
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          eyebrow: string
          filter_key: Database["public"]["Enums"]["category_filter_key"]
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          eyebrow?: string
          filter_key?: Database["public"]["Enums"]["category_filter_key"]
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          eyebrow?: string
          filter_key?: Database["public"]["Enums"]["category_filter_key"]
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      signups: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          notified_for: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          notified_for?: string | null
          source: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          notified_for?: string | null
          source?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          book_now_label: string
          book_now_url: string
          contact_address: string
          contact_email: string
          contact_social: string
          currency: string
          express_shipping: number
          footer_blurb: string
          free_ship_threshold: number
          id: number
          location: string
          logo_alt: string
          logo_height: number
          logo_path: string | null
          logo_url: string | null
          logo_width: number
          nav_links: Json
          social_links: Json
          standard_shipping: number
          title: string
          updated_at: string
        }
        Insert: {
          book_now_label?: string
          book_now_url?: string
          contact_address?: string
          contact_email?: string
          contact_social?: string
          currency?: string
          express_shipping?: number
          footer_blurb?: string
          free_ship_threshold?: number
          id?: number
          location?: string
          logo_alt?: string
          logo_height?: number
          logo_path?: string | null
          logo_url?: string | null
          logo_width?: number
          nav_links?: Json
          social_links?: Json
          standard_shipping?: number
          title?: string
          updated_at?: string
        }
        Update: {
          book_now_label?: string
          book_now_url?: string
          contact_address?: string
          contact_email?: string
          contact_social?: string
          currency?: string
          express_shipping?: number
          footer_blurb?: string
          free_ship_threshold?: number
          id?: number
          location?: string
          logo_alt?: string
          logo_height?: number
          logo_path?: string | null
          logo_url?: string | null
          logo_width?: number
          nav_links?: Json
          social_links?: Json
          standard_shipping?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      inventory_by_slug: {
        Row: {
          color: string | null
          size: string | null
          slug: string | null
          stock: number | null
        }
        Relationships: []
      }
      inventory_orphans: {
        Row: {
          color: string | null
          id: string | null
          product_id: string | null
          size: string | null
          sku: string | null
          slug: string | null
          stock: number | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_order_stock: {
        Args: { p_direction: number; p_order_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_assurance_array: { Args: { v: Json }; Returns: boolean }
      is_color_array: { Args: { v: Json }; Returns: boolean }
      is_link_array: { Args: { v: Json }; Returns: boolean }
      next_order_ref: { Args: never; Returns: string }
      place_order: {
        Args: { p_items: Json; p_order: Json }
        Returns: {
          order_id: string
          reference: string
        }[]
      }
    }
    Enums: {
      category_filter_key:
        | "tees"
        | "bags"
        | "caps"
        | "tumblers"
        | "accessories"
        | "all"
      order_status:
        | "pending"
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      product_category: "tees" | "bags" | "caps" | "tumblers"
      publish_status: "draft" | "published"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      category_filter_key: [
        "tees",
        "bags",
        "caps",
        "tumblers",
        "accessories",
        "all",
      ],
      order_status: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      product_category: ["tees", "bags", "caps", "tumblers"],
      publish_status: ["draft", "published"],
    },
  },
} as const
