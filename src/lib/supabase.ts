import { createClient } from "@supabase/supabase-js";

// These environment variables must be set in Replit Secrets:
//   VITE_SUPABASE_URL  — your Supabase project URL
//   VITE_SUPABASE_ANON_KEY — your Supabase anon/public key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables.\n" +
      "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit Secrets."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      modules: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          name: string;
          icon: string;
          color: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: Omit<
          Database["public"]["Tables"]["modules"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["modules"]["Insert"]
        >;
      };
    };
  };
};
