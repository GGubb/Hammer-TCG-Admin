import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://xtgzlzkiydsxciblbgqw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0Z3psemtpeWRzeGNpYmxiZ3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzI3MzEsImV4cCI6MjA3NTIwODczMX0.xb6KZhtwxw4TS0QpBlwJSUp04278mD_JoF_odcZey48";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabase = supabase;