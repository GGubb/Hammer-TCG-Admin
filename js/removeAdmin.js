import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Método no permitido");

  const { userId } = req.body;
  if (!userId) return res.status(400).send("Falta userId");

  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id_usuario", userId)
    .eq("rol", "admin");

  if (error) return res.status(500).send(error.message);
  res.status(200).send("Admin eliminado");
}
