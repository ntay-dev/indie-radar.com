import { createClient, type User, type Session } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const supabaseUrl = config.public.supabaseUrl as string;
  const supabaseKey = config.public.supabaseKey as string;

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const user = useState<User | null>("supabase-user", () => null);
  const session = useState<Session | null>("supabase-session", () => null);

  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session;
    user.value = data.session?.user ?? null;
  });

  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession;
    user.value = newSession?.user ?? null;
  });

  return {
    provide: {
      supabase,
      supabaseUser: user,
      supabaseSession: session,
    },
  };
});
