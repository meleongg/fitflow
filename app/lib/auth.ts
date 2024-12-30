import { supabase } from "./supabase";

async function signUpNewUser() {
  const { data, error } = await supabase.auth.signUp({
    email: "valid.email@supabase.io",
    password: "example-password",
    options: {
      emailRedirectTo: "https://example.com/welcome",
    },
  });
}

async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "valid.email@supabase.io",
    password: "example-password",
  });
}
