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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cabin_visits: {
        Row: {
          id: string
          profile_id: string
          visit_count: number | null
          visit_date: string
        }
        Insert: {
          id?: string
          profile_id: string
          visit_count?: number | null
          visit_date?: string
        }
        Update: {
          id?: string
          profile_id?: string
          visit_count?: number | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabin_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cabin_widgets: {
        Row: {
          created_at: string | null
          id: string
          position: number
          user_id: string
          widget_data: Json | null
          widget_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position: number
          user_id: string
          widget_data?: Json | null
          widget_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number
          user_id?: string
          widget_data?: Json | null
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabin_widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_uses: {
        Row: {
          id: string
          invite_id: string
          invitee_id: string
          used_at: string | null
        }
        Insert: {
          id?: string
          invite_id: string
          invitee_id: string
          used_at?: string | null
        }
        Update: {
          id?: string
          invite_id?: string
          invitee_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_uses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_uses_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          id: string
          inviter_id: string
          is_active: boolean | null
          is_infinite: boolean | null
          slug: string
          uses_remaining: number
          uses_total: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inviter_id: string
          is_active?: boolean | null
          is_infinite?: boolean | null
          slug: string
          uses_remaining?: number
          uses_total?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inviter_id?: string
          is_active?: boolean | null
          is_infinite?: boolean | null
          slug?: string
          uses_remaining?: number
          uses_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          atmosphere: string | null
          bio: string | null
          cabin_mood: string | null
          city: string | null
          created_at: string | null
          currently_type: string | null
          currently_value: string | null
          display_name: string
          handle: string
          header_image_url: string | null
          id: string
          is_pines_plus: boolean | null
          latitude: number | null
          layout: string | null
          longitude: number | null
          mantra: string | null
          pinned_song_artist: string | null
          pinned_song_preview_url: string | null
          pinned_song_title: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          accent_color?: string | null
          atmosphere?: string | null
          bio?: string | null
          cabin_mood?: string | null
          city?: string | null
          created_at?: string | null
          currently_type?: string | null
          currently_value?: string | null
          display_name: string
          handle: string
          header_image_url?: string | null
          id: string
          is_pines_plus?: boolean | null
          latitude?: number | null
          layout?: string | null
          longitude?: number | null
          mantra?: string | null
          pinned_song_artist?: string | null
          pinned_song_preview_url?: string | null
          pinned_song_title?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          accent_color?: string | null
          atmosphere?: string | null
          bio?: string | null
          cabin_mood?: string | null
          city?: string | null
          created_at?: string | null
          currently_type?: string | null
          currently_value?: string | null
          display_name?: string
          handle?: string
          header_image_url?: string | null
          id?: string
          is_pines_plus?: boolean | null
          latitude?: number | null
          layout?: string | null
          longitude?: number | null
          mantra?: string | null
          pinned_song_artist?: string | null
          pinned_song_preview_url?: string | null
          pinned_song_title?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      seedling_periods: {
        Row: {
          ends_at: string
          id: string
          invite_tier: string | null
          invited_by: string | null
          period_days: number
          skipped: boolean | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          ends_at: string
          id?: string
          invite_tier?: string | null
          invited_by?: string | null
          period_days: number
          skipped?: boolean | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          ends_at?: string
          id?: string
          invite_tier?: string | null
          invited_by?: string | null
          period_days?: number
          skipped?: boolean | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seedling_periods_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seedling_periods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
