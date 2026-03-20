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
      block_threshold_log: {
        Row: {
          block_count: number | null
          blocked_user_id: string
          id: string
          last_action_taken: string | null
          last_checked: string | null
          qualified_block_count: number | null
        }
        Insert: {
          block_count?: number | null
          blocked_user_id: string
          id?: string
          last_action_taken?: string | null
          last_checked?: string | null
          qualified_block_count?: number | null
        }
        Update: {
          block_count?: number | null
          blocked_user_id?: string
          id?: string
          last_action_taken?: string | null
          last_checked?: string | null
          qualified_block_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "block_threshold_log_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      camp_invites: {
        Row: {
          camp_id: string
          created_at: string | null
          id: string
          invite_link: string | null
          invited_by: string
          invited_user_id: string | null
          uses_remaining: number | null
        }
        Insert: {
          camp_id: string
          created_at?: string | null
          id?: string
          invite_link?: string | null
          invited_by: string
          invited_user_id?: string | null
          uses_remaining?: number | null
        }
        Update: {
          camp_id?: string
          created_at?: string | null
          id?: string
          invite_link?: string | null
          invited_by?: string
          invited_user_id?: string | null
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_invites_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_join_requests: {
        Row: {
          camp_id: string
          id: string
          requested_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          camp_id: string
          id?: string
          requested_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          camp_id?: string
          id?: string
          requested_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_join_requests_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_lodge_items: {
        Row: {
          author_id: string
          camp_id: string
          content: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          item_type: string
          link_preview: Json | null
          link_url: string | null
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          camp_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          item_type?: string
          link_preview?: Json | null
          link_url?: string | null
          position: number
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          camp_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          item_type?: string
          link_preview?: Json | null
          link_url?: string | null
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_lodge_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_lodge_items_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_members: {
        Row: {
          camp_id: string
          id: string
          joined_at: string | null
          role: string
          scout_ends_at: string | null
          user_id: string
        }
        Insert: {
          camp_id: string
          id?: string
          joined_at?: string | null
          role?: string
          scout_ends_at?: string | null
          user_id: string
        }
        Update: {
          camp_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          scout_ends_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_members_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_newsletter_settings: {
        Row: {
          camp_id: string
          editor_id: string | null
          frequency: string | null
          id: string
          is_enabled: boolean | null
          send_day: string | null
          send_time: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          camp_id: string
          editor_id?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          send_day?: string | null
          send_time?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          camp_id?: string
          editor_id?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          send_day?: string | null
          send_time?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_newsletter_settings_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: true
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_newsletter_settings_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_newsletters: {
        Row: {
          author_id: string
          camp_id: string
          content: string
          created_at: string | null
          frequency: string
          id: string
          recipient_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          camp_id: string
          content: string
          created_at?: string | null
          frequency: string
          id?: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          camp_id?: string
          content?: string
          created_at?: string | null
          frequency?: string
          id?: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_newsletters_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_newsletters_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_post_media: {
        Row: {
          camp_post_id: string
          created_at: string | null
          id: string
          media_type: string
          position: number
          url: string
        }
        Insert: {
          camp_post_id: string
          created_at?: string | null
          id?: string
          media_type: string
          position: number
          url: string
        }
        Update: {
          camp_post_id?: string
          created_at?: string | null
          id?: string
          media_type?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_post_media_camp_post_id_fkey"
            columns: ["camp_post_id"]
            isOneToOne: false
            referencedRelation: "camp_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_posts: {
        Row: {
          author_id: string
          camp_id: string
          content: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          post_type: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          camp_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          post_type: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          camp_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          post_type?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_posts_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_replies: {
        Row: {
          author_id: string
          camp_post_id: string
          content: string
          created_at: string | null
          id: string
          parent_reply_id: string | null
        }
        Insert: {
          author_id: string
          camp_post_id: string
          content: string
          created_at?: string | null
          id?: string
          parent_reply_id?: string | null
        }
        Update: {
          author_id?: string
          camp_post_id?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_reply_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_replies_camp_post_id_fkey"
            columns: ["camp_post_id"]
            isOneToOne: false
            referencedRelation: "camp_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "camp_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_log: {
        Row: {
          author_id: string
          campfire_id: string
          content: string
          content_type: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          link_url: string | null
          photo_url: string | null
        }
        Insert: {
          author_id: string
          campfire_id: string
          content: string
          content_type: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          link_url?: string | null
          photo_url?: string | null
        }
        Update: {
          author_id?: string
          campfire_id?: string
          content?: string
          content_type?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          link_url?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campfire_log_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_log_campfire_id_fkey"
            columns: ["campfire_id"]
            isOneToOne: false
            referencedRelation: "campfires"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_messages: {
        Row: {
          campfire_id: string
          content: string | null
          created_at: string | null
          cross_post_id: string | null
          id: string
          is_faded: boolean | null
          media_url: string | null
          message_type: string | null
          sender_id: string
          voice_duration_seconds: number | null
          voice_mime_type: string | null
          voice_waveform_data: Json | null
        }
        Insert: {
          campfire_id: string
          content?: string | null
          created_at?: string | null
          cross_post_id?: string | null
          id?: string
          is_faded?: boolean | null
          media_url?: string | null
          message_type?: string | null
          sender_id: string
          voice_duration_seconds?: number | null
          voice_mime_type?: string | null
          voice_waveform_data?: Json | null
        }
        Update: {
          campfire_id?: string
          content?: string | null
          created_at?: string | null
          cross_post_id?: string | null
          id?: string
          is_faded?: boolean | null
          media_url?: string | null
          message_type?: string | null
          sender_id?: string
          voice_duration_seconds?: number | null
          voice_mime_type?: string | null
          voice_waveform_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campfire_messages_campfire_id_fkey"
            columns: ["campfire_id"]
            isOneToOne: false
            referencedRelation: "campfires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_messages_cross_post_id_fkey"
            columns: ["cross_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_notification_prefs: {
        Row: {
          campfire_id: string
          created_at: string | null
          id: string
          notify_realtime: boolean | null
          user_id: string
        }
        Insert: {
          campfire_id: string
          created_at?: string | null
          id?: string
          notify_realtime?: boolean | null
          user_id: string
        }
        Update: {
          campfire_id?: string
          created_at?: string | null
          id?: string
          notify_realtime?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campfire_notification_prefs_campfire_id_fkey"
            columns: ["campfire_id"]
            isOneToOne: false
            referencedRelation: "campfires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_participants: {
        Row: {
          campfire_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          campfire_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          campfire_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campfire_participants_campfire_id_fkey"
            columns: ["campfire_id"]
            isOneToOne: false
            referencedRelation: "campfires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campfire_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campfire_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "campfire_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfire_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campfires: {
        Row: {
          bonfire_sub_group_of: string | null
          camp_id: string | null
          campfire_type: string
          created_at: string | null
          expires_at: string | null
          firekeeper_id: string | null
          id: string
          is_active: boolean | null
          is_embers: boolean | null
          name: string | null
          vibe: string | null
        }
        Insert: {
          bonfire_sub_group_of?: string | null
          camp_id?: string | null
          campfire_type: string
          created_at?: string | null
          expires_at?: string | null
          firekeeper_id?: string | null
          id?: string
          is_active?: boolean | null
          is_embers?: boolean | null
          name?: string | null
          vibe?: string | null
        }
        Update: {
          bonfire_sub_group_of?: string | null
          camp_id?: string | null
          campfire_type?: string
          created_at?: string | null
          expires_at?: string | null
          firekeeper_id?: string | null
          id?: string
          is_active?: boolean | null
          is_embers?: boolean | null
          name?: string | null
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campfires_bonfire_sub_group_of_fkey"
            columns: ["bonfire_sub_group_of"]
            isOneToOne: false
            referencedRelation: "campfires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfires_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campfires_firekeeper_id_fkey"
            columns: ["firekeeper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          firekeeper_id: string
          health_status: string | null
          id: string
          is_active: boolean | null
          member_count: number | null
          name: string
          visibility: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          firekeeper_id: string
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          name: string
          visibility?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          firekeeper_id?: string
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          name?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "camps_firekeeper_id_fkey"
            columns: ["firekeeper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string | null
          id: string
          requestee_id: string
          requester_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requestee_id: string
          requester_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requestee_id?: string
          requester_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circles_requestee_id_fkey"
            columns: ["requestee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circles_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_posts: {
        Row: {
          added_at: string | null
          collection_id: string
          id: string
          position: number
          post_id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          id?: string
          position: number
          post_id: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          id?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_posts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_stripe_prices: {
        Row: {
          amount_cents: number
          collection_id: string
          created_at: string | null
          currency: string | null
          id: string
          price_type: string
          stripe_price_id: string
          stripe_product_id: string
        }
        Insert: {
          amount_cents: number
          collection_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          price_type: string
          stripe_price_id: string
          stripe_product_id: string
        }
        Update: {
          amount_cents?: number
          collection_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          price_type?: string
          stripe_price_id?: string
          stripe_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_stripe_prices_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: true
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_subscriptions: {
        Row: {
          collection_id: string
          ends_at: string | null
          id: string
          started_at: string | null
          status: string | null
          stripe_subscription_id: string | null
          subscriber_id: string
        }
        Insert: {
          collection_id: string
          ends_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          subscriber_id: string
        }
        Update: {
          collection_id?: string
          ends_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_subscriptions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_waitlist: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_waitlist_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          author_id: string
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_paid: boolean | null
          is_published: boolean | null
          price_cents: number | null
          price_type: string | null
          title: string
        }
        Insert: {
          author_id: string
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          is_published?: boolean | null
          price_cents?: number | null
          price_type?: string | null
          title: string
        }
        Update: {
          author_id?: string
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_paid?: boolean | null
          is_published?: boolean | null
          price_cents?: number | null
          price_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          amount_cents: number
          collection_id: string | null
          creator_amount_cents: number
          creator_id: string
          earned_at: string | null
          id: string
          platform_fee_cents: number
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          subscriber_id: string | null
        }
        Insert: {
          amount_cents: number
          collection_id?: string | null
          creator_amount_cents: number
          creator_id: string
          earned_at?: string | null
          id?: string
          platform_fee_cents: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          subscriber_id?: string | null
        }
        Update: {
          amount_cents?: number
          collection_id?: string | null
          creator_amount_cents?: number
          creator_id?: string
          earned_at?: string | null
          id?: string
          platform_fee_cents?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_summaries: {
        Row: {
          created_at: string | null
          creator_amount_cents: number
          creator_id: string
          id: string
          period_end: string
          period_start: string
          platform_fee_cents: number
          status: string | null
          stripe_payout_id: string | null
          subscriber_count: number
          total_earnings_cents: number
        }
        Insert: {
          created_at?: string | null
          creator_amount_cents: number
          creator_id: string
          id?: string
          period_end: string
          period_start: string
          platform_fee_cents: number
          status?: string | null
          stripe_payout_id?: string | null
          subscriber_count: number
          total_earnings_cents: number
        }
        Update: {
          created_at?: string | null
          creator_amount_cents?: number
          creator_id?: string
          id?: string
          period_end?: string
          period_start?: string
          platform_fee_cents?: number
          status?: string | null
          stripe_payout_id?: string | null
          subscriber_count?: number
          total_earnings_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_summaries_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_stripe_accounts: {
        Row: {
          account_status: string | null
          charges_enabled: boolean | null
          created_at: string | null
          id: string
          payouts_enabled: boolean | null
          stripe_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_status?: string | null
          charges_enabled?: boolean | null
          created_at?: string | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_status?: string | null
          charges_enabled?: boolean | null
          created_at?: string | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_stripe_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inactive_nudges: {
        Row: {
          created_at: string | null
          id: string
          inactive_user_id: string
          inviter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inactive_user_id: string
          inviter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inactive_user_id?: string
          inviter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inactive_nudges_inactive_user_id_fkey"
            columns: ["inactive_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inactive_nudges_inviter_id_fkey"
            columns: ["inviter_id"]
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
      moderation_actions: {
        Row: {
          action_detail: string | null
          action_type: string
          admin_id: string
          created_at: string | null
          id: string
          report_id: string | null
          suspension_days: number | null
          target_user_id: string | null
        }
        Insert: {
          action_detail?: string | null
          action_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          report_id?: string | null
          suspension_days?: number | null
          target_user_id?: string | null
        }
        Update: {
          action_detail?: string | null
          action_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          report_id?: string | null
          suspension_days?: number | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mutes: {
        Row: {
          created_at: string | null
          id: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          ember_delivery_time: string | null
          ember_timezone: string | null
          id: string
          notify_circle_requests: boolean | null
          notify_invite_accepted: boolean | null
          notify_smoke_signals: boolean | null
          quiet_mode: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ember_delivery_time?: string | null
          ember_timezone?: string | null
          id?: string
          notify_circle_requests?: boolean | null
          notify_invite_accepted?: boolean | null
          notify_smoke_signals?: boolean | null
          quiet_mode?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ember_delivery_time?: string | null
          ember_timezone?: string | null
          id?: string
          notify_circle_requests?: boolean | null
          notify_invite_accepted?: boolean | null
          notify_smoke_signals?: boolean | null
          quiet_mode?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          camp_id_ref: string | null
          campfire_id: string | null
          collection_id: string | null
          created_at: string | null
          id: string
          is_delivered_in_ember: boolean | null
          is_read: boolean | null
          notification_type: string
          post_id: string | null
          recipient_id: string
        }
        Insert: {
          actor_id?: string | null
          camp_id_ref?: string | null
          campfire_id?: string | null
          collection_id?: string | null
          created_at?: string | null
          id?: string
          is_delivered_in_ember?: boolean | null
          is_read?: boolean | null
          notification_type: string
          post_id?: string | null
          recipient_id: string
        }
        Update: {
          actor_id?: string | null
          camp_id_ref?: string | null
          campfire_id?: string | null
          collection_id?: string | null
          created_at?: string | null
          id?: string
          is_delivered_in_ember?: boolean | null
          is_read?: boolean | null
          notification_type?: string
          post_id?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_camp_id_ref_fkey"
            columns: ["camp_id_ref"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_campfire_id_fkey"
            columns: ["campfire_id"]
            isOneToOne: false
            referencedRelation: "campfires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pines_plus_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string
          status: string | null
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan: string
          status?: string | null
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string | null
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pines_plus_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          position: number
          post_id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type: string
          position: number
          post_id: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          position?: number
          post_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          is_quote_post: boolean | null
          post_type: string
          quoted_post_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          is_quote_post?: boolean | null
          post_type: string
          quoted_post_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          is_quote_post?: boolean | null
          post_type?: string
          quoted_post_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_quoted_post_id_fkey"
            columns: ["quoted_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
          ember_unsubscribed: boolean | null
          feed_scroll_reminder: boolean | null
          feed_show_camp_posts: boolean | null
          feed_show_embers: boolean | null
          feed_show_quotes: boolean | null
          feed_show_sparks: boolean | null
          feed_show_stories: boolean | null
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
          quiet_mode: boolean | null
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
          ember_unsubscribed?: boolean | null
          feed_scroll_reminder?: boolean | null
          feed_show_camp_posts?: boolean | null
          feed_show_embers?: boolean | null
          feed_show_quotes?: boolean | null
          feed_show_sparks?: boolean | null
          feed_show_stories?: boolean | null
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
          quiet_mode?: boolean | null
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
          ember_unsubscribed?: boolean | null
          feed_scroll_reminder?: boolean | null
          feed_show_camp_posts?: boolean | null
          feed_show_embers?: boolean | null
          feed_show_quotes?: boolean | null
          feed_show_sparks?: boolean | null
          feed_show_stories?: boolean | null
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
          quiet_mode?: boolean | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          parent_reply_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          parent_reply_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_reply_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reporter_patterns: {
        Row: {
          cleared_reports: number | null
          flagged_as_serial: boolean | null
          id: string
          last_updated: string | null
          reporter_id: string
          total_reports: number | null
        }
        Insert: {
          cleared_reports?: number | null
          flagged_as_serial?: boolean | null
          id?: string
          last_updated?: string | null
          reporter_id: string
          total_reports?: number | null
        }
        Update: {
          cleared_reports?: number | null
          flagged_as_serial?: boolean | null
          id?: string
          last_updated?: string | null
          reporter_id?: string
          total_reports?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reporter_patterns_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          ai_category: string | null
          ai_confidence: number | null
          ai_reasoning: string | null
          ai_recommended_action: string | null
          ai_severity: string | null
          content_hidden: boolean | null
          created_at: string | null
          id: string
          report_reason: string
          reported_camp_id: string | null
          reported_camp_post_id: string | null
          reported_campfire_message_id: string | null
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_context: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string | null
        }
        Insert: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_reasoning?: string | null
          ai_recommended_action?: string | null
          ai_severity?: string | null
          content_hidden?: boolean | null
          created_at?: string | null
          id?: string
          report_reason: string
          reported_camp_id?: string | null
          reported_camp_post_id?: string | null
          reported_campfire_message_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_context?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string | null
        }
        Update: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_reasoning?: string | null
          ai_recommended_action?: string | null
          ai_severity?: string | null
          content_hidden?: boolean | null
          created_at?: string | null
          id?: string
          report_reason?: string
          reported_camp_id?: string | null
          reported_camp_post_id?: string | null
          reported_campfire_message_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_context?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_camp_id_fkey"
            columns: ["reported_camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_camp_post_id_fkey"
            columns: ["reported_camp_post_id"]
            isOneToOne: false
            referencedRelation: "camp_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_campfire_message_id_fkey"
            columns: ["reported_campfire_message_id"]
            isOneToOne: false
            referencedRelation: "campfire_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      suspensions: {
        Row: {
          created_at: string | null
          id: string
          is_permanent: boolean | null
          reason: string
          suspended_by: string
          suspended_until: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_permanent?: boolean | null
          reason: string
          suspended_by: string
          suspended_until?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_permanent?: boolean | null
          reason?: string
          suspended_by?: string
          suspended_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspensions_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
    },
  },
} as const
