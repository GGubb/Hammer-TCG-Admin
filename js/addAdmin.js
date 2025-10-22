import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Método no permitido");

  const { email, created_by } = req.body;
  if (!email) return res.status(400).send("Falta email");

  // Buscar el usuario por correo
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return res.status(500).send(listError.message);

  const user = users?.users?.find((u) => u.email === email);
  if (!user) return res.status(404).send("Usuario no encontrado");

  // Insertar en la tabla roles
  const { error: insertError } = await supabaseAdmin
    .from("roles")
    .insert([
      {
        id_usuario: user.id,
        rol: "admin",
        creado_por: created_by,
        cuando_fue: new Date().toISOString().slice(0, 10),
      },
    ]);

  if (insertError) return res.status(500).send(insertError.message);

  res.status(200).send("Admin agregado correctamente");
}
