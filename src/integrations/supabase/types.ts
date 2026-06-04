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
      activity_events: {
        Row: {
          course_id: string | null
          created_at: string
          duration_ms: number | null
          id: string
          metadata: Json
          type: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          metadata?: Json
          type: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          metadata?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bundles: {
        Row: {
          billing_period: string
          created_at: string
          description: string | null
          id: string
          position: number
          price_cents: number
          slug: string
          title: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          price_cents?: number
          slug: string
          title: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          price_cents?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          accent_color: string
          cover_emoji: string | null
          created_at: string
          description: string | null
          duration_hours: number
          id: string
          materials_summary: string | null
          objectives: string | null
          position: number
          price_cents: number
          region: string
          slug: string
          title: string
        }
        Insert: {
          accent_color?: string
          cover_emoji?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          materials_summary?: string | null
          objectives?: string | null
          position?: number
          price_cents?: number
          region?: string
          slug: string
          title: string
        }
        Update: {
          accent_color?: string
          cover_emoji?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          materials_summary?: string | null
          objectives?: string | null
          position?: number
          price_cents?: number
          region?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          created_at: string
          full_name: string | null
          id: string
          stars: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          stars?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          score: number
          total: number
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned?: number
          score: number
          total: number
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          score?: number
          total?: number
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number
          id: string
          options: Json
          points: number
          position: number
          question: string
          unit_id: string
        }
        Insert: {
          correct_index: number
          id?: string
          options: Json
          points?: number
          position?: number
          question: string
          unit_id: string
        }
        Update: {
          correct_index?: number
          id?: string
          options?: Json
          points?: number
          position?: number
          question?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          id: string
          position: number
          title: string
          type: string
          unit_id: string
          url: string
        }
        Insert: {
          id?: string
          position?: number
          title: string
          type: string
          unit_id: string
          url: string
        }
        Update: {
          id?: string
          position?: number
          title?: string
          type?: string
          unit_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          slot_index: number
          title: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          slot_index: number
          title: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          slot_index?: number
          title?: string
          weight?: number
        }
        Relationships: []
      }
      roulette_spins: {
        Row: {
          chosen_option: Json | null
          id: string
          item_id: string | null
          spun_at: string
          user_id: string
        }
        Insert: {
          chosen_option?: Json | null
          id?: string
          item_id?: string | null
          spun_at?: string
          user_id: string
        }
        Update: {
          chosen_option?: Json | null
          id?: string
          item_id?: string | null
          spun_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roulette_spins_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "roulette_items"
            referencedColumns: ["id"]
          },
        ]
      }
      star_awards: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          ref_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          reason: string
          ref_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          bonus_points: number
          course_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
        }
        Insert: {
          bonus_points?: number
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          bonus_points?: number
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          unit_id: string
          updated_at: string
          user_id: string
          video_percent: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          unit_id: string
          updated_at?: string
          user_id: string
          video_percent?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
          video_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          base_points: number
          created_at: string
          description: string | null
          id: string
          min_watch_percent: number
          position: number
          title: string
          topic_id: string
          youtube_video_id: string | null
        }
        Insert: {
          base_points?: number
          created_at?: string
          description?: string | null
          id?: string
          min_watch_percent?: number
          position?: number
          title: string
          topic_id: string
          youtube_video_id?: string | null
        }
        Update: {
          base_points?: number
          created_at?: string
          description?: string | null
          id?: string
          min_watch_percent?: number
          position?: number
          title?: string
          topic_id?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      vc_attendance: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vc_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vc_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vc_attendance_vc_id_fkey"
            columns: ["vc_id"]
            isOneToOne: false
            referencedRelation: "videoconferences"
            referencedColumns: ["id"]
          },
        ]
      }
      videoconferences: {
        Row: {
          bbb_url: string
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          scheduled_at: string
          title: string
        }
        Insert: {
          bbb_url: string
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          scheduled_at: string
          title: string
        }
        Update: {
          bbb_url?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          scheduled_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "videoconferences_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_stars: {
        Args: { _amount: number; _user: string }
        Returns: undefined
      }
      award_star_dedup: {
        Args: { _amount?: number; _reason: string; _ref: string; _user: string }
        Returns: boolean
      }
      check_quiz_answer: {
        Args: { _answer: number; _question: string }
        Returns: boolean
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user: string }
        Returns: boolean
      }
      is_enrolled: {
        Args: { _course: string; _user: string }
        Returns: boolean
      }
      is_topic_unlocked: {
        Args: { _topic: string; _user: string }
        Returns: boolean
      }
      is_unit_unlocked: {
        Args: { _unit: string; _user: string }
        Returns: boolean
      }
      set_user_blocked: {
        Args: { _blocked: boolean; _user: string }
        Returns: undefined
      }
      spin_roulette: {
        Args: { _user: string }
        Returns: {
          chosen_option: Json | null
          id: string
          item_id: string | null
          spun_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "roulette_spins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
