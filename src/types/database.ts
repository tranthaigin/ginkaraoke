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
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          join_code: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      karaoke_sessions: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          group_id: string
          id: string
          name: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          group_id: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          group_id?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "karaoke_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karaoke_sessions_group_id_fkey1"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_groups: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          join_code: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: []
      }
      legacy_karaoke_sessions: {
        Row: {
          created_at: string
          group_id: string
          id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "karaoke_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "legacy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_member_songs: {
        Row: {
          created_at: string
          favorite: boolean
          id: string
          member_id: string
          priority: string
          song_id: string
        }
        Insert: {
          created_at?: string
          favorite?: boolean
          id?: string
          member_id: string
          priority?: string
          song_id: string
        }
        Update: {
          created_at?: string
          favorite?: boolean
          id?: string
          member_id?: string
          priority?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_songs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "legacy_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "legacy_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_members: {
        Row: {
          avatar: string
          created_at: string
          display_name: string
          group_id: string
          id: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          display_name: string
          group_id: string
          id?: string
        }
        Update: {
          avatar?: string
          created_at?: string
          display_name?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "legacy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_session_members: {
        Row: {
          id: string
          member_id: string
          session_id: string
        }
        Insert: {
          id?: string
          member_id: string
          session_id: string
        }
        Update: {
          id?: string
          member_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "legacy_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "legacy_karaoke_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_session_songs: {
        Row: {
          id: string
          priority_order: number
          score: number
          session_id: string
          song_id: string
          sung: boolean
          sung_at: string | null
        }
        Insert: {
          id?: string
          priority_order?: number
          score?: number
          session_id: string
          song_id: string
          sung?: boolean
          sung_at?: string | null
        }
        Update: {
          id?: string
          priority_order?: number
          score?: number
          session_id?: string
          song_id?: string
          sung?: boolean
          sung_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_songs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "legacy_karaoke_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "legacy_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_songs: {
        Row: {
          artist: string
          created_at: string
          id: string
          normalized_title: string
          title: string
        }
        Insert: {
          artist?: string
          created_at?: string
          id?: string
          normalized_title: string
          title: string
        }
        Update: {
          artist?: string
          created_at?: string
          id?: string
          normalized_title?: string
          title?: string
        }
        Relationships: []
      }
      member_songs: {
        Row: {
          created_at: string
          favorite: boolean
          id: string
          priority: Database["public"]["Enums"]["song_priority"]
          song_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["song_priority"]
          song_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorite?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["song_priority"]
          song_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_songs_song_id_fkey1"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_songs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_batches: {
        Row: {
          batch_number: number
          created_at: string
          created_by: string
          id: string
          recycle_mode: boolean
          session_id: string
        }
        Insert: {
          batch_number: number
          created_at?: string
          created_by: string
          id?: string
          recycle_mode?: boolean
          session_id: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          created_by?: string
          id?: string
          recycle_mode?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_batches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "karaoke_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_members: {
        Row: {
          joined_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_members_session_id_fkey1"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "karaoke_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_songs: {
        Row: {
          batch_id: string
          created_at: string
          eligible_singer_ids: string[]
          id: string
          played_at: string | null
          queue_position: number
          recycle_mode: boolean
          score: number
          score_metadata: Json
          session_id: string
          singer_1_id: string
          singer_2_id: string
          song_id: string
          state: Database["public"]["Enums"]["session_song_state"]
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          eligible_singer_ids?: string[]
          id?: string
          played_at?: string | null
          queue_position: number
          recycle_mode?: boolean
          score?: number
          score_metadata?: Json
          session_id: string
          singer_1_id: string
          singer_2_id: string
          song_id: string
          state?: Database["public"]["Enums"]["session_song_state"]
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          eligible_singer_ids?: string[]
          id?: string
          played_at?: string | null
          queue_position?: number
          recycle_mode?: boolean
          score?: number
          score_metadata?: Json
          session_id?: string
          singer_1_id?: string
          singer_2_id?: string
          song_id?: string
          state?: Database["public"]["Enums"]["session_song_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_songs_batch_session_fkey"
            columns: ["batch_id", "session_id"]
            isOneToOne: false
            referencedRelation: "recommendation_batches"
            referencedColumns: ["id", "session_id"]
          },
          {
            foreignKeyName: "session_songs_session_id_fkey1"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "karaoke_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_songs_singer_1_id_fkey"
            columns: ["singer_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_songs_singer_1_membership_fkey"
            columns: ["session_id", "singer_1_id"]
            isOneToOne: false
            referencedRelation: "session_members"
            referencedColumns: ["session_id", "user_id"]
          },
          {
            foreignKeyName: "session_songs_singer_2_id_fkey"
            columns: ["singer_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_songs_singer_2_membership_fkey"
            columns: ["session_id", "singer_2_id"]
            isOneToOne: false
            referencedRelation: "session_members"
            referencedColumns: ["session_id", "user_id"]
          },
          {
            foreignKeyName: "session_songs_song_id_fkey1"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string
          created_at: string
          id: string
          normalized_artist: string
          normalized_title: string
          title: string
        }
        Insert: {
          artist?: string
          created_at?: string
          id?: string
          normalized_artist?: string
          normalized_title: string
          title: string
        }
        Update: {
          artist?: string
          created_at?: string
          id?: string
          normalized_artist?: string
          normalized_title?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group_with_owner: {
        Args: { group_name: string; requested_join_code?: string }
        Returns: {
          created_at: string
          id: string
          join_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_group_by_code: {
        Args: { requested_code: string }
        Returns: {
          created_at: string
          id: string
          join_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_group_member: {
        Args: { target_group: string; target_user: string }
        Returns: undefined
      }
    }
    Enums: {
      group_role: "owner" | "member"
      session_song_state: "QUEUED" | "PLAYED"
      session_status: "active" | "completed"
      song_priority: "NORMAL" | "WANT_TO_SING" | "HIGH"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      group_role: ["owner", "member"],
      session_song_state: ["QUEUED", "PLAYED"],
      session_status: ["active", "completed"],
      song_priority: ["NORMAL", "WANT_TO_SING", "HIGH"],
    },
  },
} as const
