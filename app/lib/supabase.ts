import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Base client with anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get authenticated client
export const getAuthenticatedClient = () => {
  const session = supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return supabase;
};

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    // Handle sign out
  } else if (event === "SIGNED_IN") {
    // Handle sign in
  }
});

// Helper for authenticated operations
export const withAuth = async <T>(
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> => {
  const client = getAuthenticatedClient();
  return operation(client);
};
