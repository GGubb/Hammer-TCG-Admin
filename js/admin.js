import { supabase } from "./supabase-config.js";

// llamar a la funcion antes del login , porque si no no se ve el del login.
cargarLogosDesdeSupabase();

console.log("Supabase cargado:", supabase);

let currentUser = null;

// =============== LOGIN ==============================
const loginContainer = document.getElementById("login-container");
const loginLogo = document.getElementById("login-logo");
const adminPanel = document.getElementById("admin-panel");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const tipoProductoInput = document.getElementById("tipo_producto");

// Elementos para gestionar logo e h1
const loginH1 = document.querySelector("h1");
const inicioLogo = document.getElementById("inicio-logo");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { data: sessionData, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  const user = sessionData.user;
  currentUser = user;

  // Verificar si es admin
  const { data: roleRow, error: rolError } = await supabase
    .from("roles")
    .select("rol")
    .eq("id_usuario", user.id)
    .single();

  if (rolError) {
    loginError.textContent = "Error verificando permisos.";
    await supabase.auth.signOut();
    return;
  }

  if (!roleRow || roleRow.rol !== "admin") {
    loginError.textContent = "Acceso denegado: no eres administrador.";
    await supabase.auth.signOut();
    return;
  }

  // =========================
  // Mostrar pantalla de inicio
  // =========================
  loginContainer.style.display = "none";
  adminPanel.style.display = "block";

  loginLogo.style.display = "none";
  inicioLogo.style.display = "block"

  // Ocultar el h1 de login
  loginH1.style.display = "none";

  // Mostrar el logo de inicio
  inicioLogo.style.display = "block";

  // Cargar productos, eventos y admins
  cargarProductosAdmin();
  cargarEventosAdmin();
  cargarAdmins();
  cargarContenidoPublico();
  cargarLogosDesdeSupabase();
});

// ===================================================
// ================= PRODUCTOS =======================
// ===================================================
const nombreInput = document.getElementById("nombre");
const descripcionInput = document.getElementById("descripcion");
const precioInput = document.getElementById("precio");
const imagenInput = document.getElementById("imagen");
const tcgInput = document.getElementById("tcg");
const ofertaInput = document.getElementById("oferta");
const disponibleInput = document.getElementById("disponible");
const destacadoInput = document.getElementById("destacado");
const preventaInput = document.getElementById("preventa");
const cantidadInput = document.getElementById("cantidad");
const guardarBtn = document.getElementById("guardar-btn");
const saveMsg = document.getElementById("save-msg");

let editId = null;

async function cargarProductosAdmin() {
  const { data: productos, error } = await supabase
    .from("productos")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar productos:", error);
    return;
  }

  // Limpiar todas las listas
  document.getElementById("lista-cartas-magic").innerHTML = "";
  document.getElementById("lista-cartas-pokemon").innerHTML = "";
  document.getElementById("lista-cartas-onepiece").innerHTML = "";
  document.getElementById("lista-carpetas").innerHTML = "";
  document.getElementById("lista-protectores").innerHTML = "";
  document.getElementById("lista-cajas").innerHTML = "";
  document.getElementById("lista-otros").innerHTML = "";

  // Filtrar por tipo y TCG
  productos.forEach((p) => {
    let targetDiv;

    if (p.tipo_producto === "Carta") {
      if (p.TCG === "Magic") targetDiv = document.getElementById("lista-cartas-magic");
      else if (p.TCG === "Pokemon") targetDiv = document.getElementById("lista-cartas-pokemon");
      else if (p.TCG === "One Piece") targetDiv = document.getElementById("lista-cartas-onepiece");
      else targetDiv = document.getElementById("lista-cartas-magic");
    } else if (p.tipo_producto === "Carpeta") targetDiv = document.getElementById("lista-carpetas");
    else if (p.tipo_producto === "Protector") targetDiv = document.getElementById("lista-protectores");
    else if (p.tipo_producto === "Caja para deck") targetDiv = document.getElementById("lista-cajas");
    else targetDiv = document.getElementById("lista-otros");

    const html = `
      <div class="product-item" data-id="${p.id}">
        <img src="${p.imagen}" alt="${p.nombre}">
        <div class="product-info">
          <strong>${p.nombre}</strong>
          <span>$${p.precio} - ${p.TCG || ""}</span>
          <span>Cantidad: ${p.cantidad}</span>
        </div>
        <div class="product-actions">
          <button class="editar-btn">Editar</button>
          <button class="eliminar-btn">Eliminar</button>
        </div>
      </div>
    `;
    targetDiv.innerHTML += html;
  });

  // Eventos eliminar/editar
  document.querySelectorAll(".eliminar-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.parentElement.parentElement.dataset.id;
      const producto = (await supabase.from("productos").select("imagen").eq("id", id).single()).data;

      if (confirm("¿Eliminar este producto?")) {
        const fileName = producto.imagen.split("/").pop();
        await supabase.storage.from("productos").remove([fileName]);
        await supabase.from("productos").delete().eq("id", id);
        cargarProductosAdmin();
      }
    });
  });

  document.querySelectorAll(".editar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.parentElement.parentElement.dataset.id;
      const producto = productos.find((p) => p.id == id);
      if (!producto) return;

      nombreInput.value = producto.nombre;
      descripcionInput.value = producto.descripcion;
      precioInput.value = producto.precio;
      tcgInput.value = producto.TCG;
      tipoProductoInput.value = producto.tipo_producto;
      ofertaInput.checked = producto.oferta;
      disponibleInput.checked = producto.disponible;
      destacadoInput.checked = producto.destacado; 
      cantidadInput.value = producto.cantidad;
      editId = producto.id;
      saveMsg.textContent = "Editando producto...";
    });
  });
}

guardarBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value.trim();
  const descripcion = descripcionInput.value.trim();
  const precio = parseFloat(precioInput.value);
  const tcg = tcgInput.value;
  const tipo_producto = tipoProductoInput.value;
  const oferta = ofertaInput.checked;
  const disponible = disponibleInput.checked;
  const destacado = destacadoInput.checked; 
  const preventa = preventaInput.checked; 
  const cantidad = parseInt(cantidadInput.value) || 0;
  const imagenFile = imagenInput.files[0];

  // Validación: TCG obligatorio solo si es Carta
  if (!nombre || !descripcion || isNaN(precio) || !tipo_producto || (tipo_producto === "Carta" && !tcg)) {
    alert("Completa todos los campos. TCG es obligatorio solo si es una carta.");
    return;
  }

  let publicUrl = null;

  if (imagenFile) {
    const fileName = `${Date.now()}_${imagenFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("productos")
      .upload(fileName, imagenFile);
    if (uploadError) return alert("Error al subir imagen: " + uploadError.message);
    publicUrl = supabase.storage.from("productos").getPublicUrl(fileName).data.publicUrl;
  }

  if (editId) {
    const productoActual = (await supabase
      .from("productos")
      .select("imagen")
      .eq("id", editId)
      .single()).data;

    // Si hay una nueva imagen y el producto ya tenía una
    if (publicUrl && productoActual.imagen) {
      const oldFileName = productoActual.imagen.split("/").pop();
      await supabase.storage.from("productos").remove([oldFileName]);
    }

    const updateData = {
      nombre,
      descripcion,
      precio,
      TCG: tcg || null,
      tipo_producto,
      oferta,
      disponible,
      destacado,
      preventa,
      cantidad
    };
    if (publicUrl) updateData.imagen = publicUrl;

    await supabase.from("productos").update(updateData).eq("id", editId);
    saveMsg.textContent = "Producto actualizado correctamente!";
  }


  // Limpiar formulario
  nombreInput.value = "";
  descripcionInput.value = "";
  precioInput.value = "";
  cantidadInput.value = 0;
  tcgInput.value = "";
  tipoProductoInput.value = "";
  imagenInput.value = "";
  ofertaInput.checked = false;
  disponibleInput.checked = true;
  destacadoInput.checked = false; // 👈 nuevo
  preventaInput.checked = false;
  editId = null;

  // Recargar lista de productos
  cargarProductosAdmin();
});


// ===================================================
// =============== EVENTOS ============================
// ===================================================
const eventoTitulo = document.getElementById("evento-titulo");
const eventoDescripcion = document.getElementById("evento-descripcion");
const eventoFecha = document.getElementById("evento-fecha");
const eventoImagen = document.getElementById("evento-imagen");
const guardarEventoBtn = document.getElementById("guardar-evento-btn");
const eventoMsg = document.getElementById("evento-msg");
const listaEventosDiv = document.getElementById("lista-eventos");

let editEventoId = null;

async function cargarEventosAdmin() {
  const { data: eventos, error } = await supabase
    .from("eventos")
    .select("*")
    .order("fecha", { ascending: true });

  if (error) {
    console.error("Error al cargar eventos:", error);
    return;
  }

  listaEventosDiv.innerHTML = "";

  eventos.forEach((e) => {
    listaEventosDiv.innerHTML += `
      <div class="evento-admin" data-id="${e.id}">
        <img src="${e.imagen}" alt="${e.titulo}" width="50">
        <strong>${e.titulo}</strong> - ${e.fecha}
        <button class="editar-evento-btn">Editar</button>
        <button class="eliminar-evento-btn">Eliminar</button>
      </div>
    `;
  });

  // eliminar
  document.querySelectorAll(".eliminar-evento-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.parentElement.dataset.id;
      const evento = (await supabase.from("eventos").select("imagen").eq("id", id).single()).data;
      if (!evento) return alert("Evento no encontrado");

      if (confirm("¿Eliminar este evento?")) {
        const imageUrl = evento.imagen;
        const fileName = imageUrl.split("/").pop();

        await supabase.storage.from("eventos").remove([fileName]);
        await supabase.from("eventos").delete().eq("id", id);

        cargarEventosAdmin();
      }
    });
  });

  // editar
  document.querySelectorAll(".editar-evento-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.parentElement.dataset.id;
      const evento = eventos.find((e) => e.id == id);
      if (!evento) return;
      eventoTitulo.value = evento.titulo;
      eventoDescripcion.value = evento.descripcion;
      eventoFecha.value = evento.fecha;
      editEventoId = evento.id;
      eventoMsg.textContent = "Editando evento...";
    });
  });
}

guardarEventoBtn.addEventListener("click", async () => {
  const titulo = eventoTitulo.value;
  const descripcion = eventoDescripcion.value;
  const fecha = eventoFecha.value;
  const imagenFile = eventoImagen.files[0];

  if (!titulo || !fecha) {
    alert("Completa el título y la fecha del evento");
    return;
  }

  let publicUrl = null;
  if (imagenFile) {
    const fileName = `${Date.now()}_${imagenFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("eventos")
      .upload(fileName, imagenFile);
    if (uploadError) return alert("Error al subir imagen: " + uploadError.message);
    publicUrl = supabase.storage.from("eventos").getPublicUrl(fileName).data.publicUrl;
  }

  if (editEventoId) {
    const updateData = { titulo, descripcion, fecha };
    if (publicUrl) updateData.imagen = publicUrl;
    await supabase.from("eventos").update(updateData).eq("id", editEventoId);
    eventoMsg.textContent = "Evento actualizado correctamente!";
  } else {
    if (!imagenFile) return alert("Selecciona una imagen para el evento");
    await supabase
      .from("eventos")
      .insert([{ titulo, descripcion, fecha, imagen: publicUrl }]);
    eventoMsg.textContent = "Evento agregado correctamente!";
  }

  eventoTitulo.value = "";
  eventoDescripcion.value = "";
  eventoFecha.value = "";
  eventoImagen.value = "";
  editEventoId = null;
  cargarEventosAdmin();
});

// ===================================================
// =============== GESTIÓN DE ROLES ===================
// ===================================================
const rolesMsg = document.getElementById("roles-msg");
const listaAdminsDiv = document.getElementById("lista-admins");
const nuevoAdminEmail = document.getElementById("nuevo-admin-email");
const agregarAdminBtn = document.getElementById("agregar-admin-btn");

async function cargarAdmins() {
  const { data: admins, error } = await supabase
    .from("roles")
    .select("id, rol, id_usuario, creado_por, cuando_fue")
    .eq("rol", "admin");

  if (error) {
    console.error("Error al cargar admins:", error);
    return;
  }

  listaAdminsDiv.innerHTML = admins
    .map(
      (a) => `
      <div class="admin-item" data-id="${a.id_usuario}">
        <strong>${a.id_usuario}</strong> — asignado: ${a.cuando_fue || "?"} (creado_por: ${a.creado_por || "?"})
        <button class="quitar-admin-btn">Quitar</button>
      </div>
    `
    )
    .join("");

  // Eliminar admin usando endpoint removeAdmin.js
  document.querySelectorAll(".quitar-admin-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.parentElement.dataset.id;
      if (!confirm("¿Quitar permisos de admin a este usuario?")) return;

      try {
        const response = await fetch("/removeAdmin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId })
        });

        const result = await response.json();

        if (response.ok) {
          rolesMsg.textContent = "Admin eliminado correctamente.";
          cargarAdmins();
        } else {
          alert("Error al quitar admin: " + (result.error || "desconocido"));
        }
      } catch (err) {
        console.error("Error al llamar removeAdmin:", err);
        alert("Error de conexión con el servidor.");
      }
    });
  });
}

// Agregar nuevo admin usando endpoint addAdmin.js
agregarAdminBtn.addEventListener("click", async () => {
  const email = nuevoAdminEmail.value.trim();
  if (!email) return alert("Ingresa el email del nuevo admin.");

  try {
    const response = await fetch("/addAdmin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        creado_por: currentUser?.id || null
      })
    });

    const result = await response.json();

    if (response.ok) {
      rolesMsg.textContent = "Nuevo admin agregado correctamente.";
      nuevoAdminEmail.value = "";
      cargarAdmins();
    } else {
      alert("Error al agregar admin: " + (result.error || "desconocido"));
    }
  } catch (err) {
    console.error("Error al llamar addAdmin:", err);
    alert("Error de conexión con el servidor.");
  }
});

// ================= CONTENIDO PÚBLICO ===================
const contenidoImagenInput = document.getElementById("contenido-imagen");
const tipoContenidoSelect = document.getElementById("tipo-contenido");
const tcgContenidoSelect = document.getElementById("contenido-tcg"); 
const guardarContenidoBtn = document.getElementById("guardar-contenido-btn");
const contenidoMsg = document.getElementById("contenido-msg");

let editContenidoId = null;

tipoContenidoSelect.innerHTML = `
  <option value="">Selecciona un tipo</option>
  <option value="carrousel">Carrousel</option>
  <option value="comunidad">Comunidad</option>
  <option value="logo_arriba">Logo Header</option>
  <option value="logo_abajo">Logo Info</option>
  <option value="logo_login">Logo login</option>
  <option value="logo_admin">Logo Admin</option>
  <option value="logo_gmail">Logo Gmail</option>
  <option value="logo_ig">Logo Instagram</option>
  <option value="logo_face">Logo Facebook</option>
`;

async function cargarContenidoPublico() {
  const { data: contenidos, error } = await supabase
    .from("contenido_publico")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar contenido público:", error);
    return;
  }

  // Limpiar todas las listas de subpestañas
  const listas = ["lista-carrousel", "lista-comunidad", "lista-assets"];
  listas.forEach(id => document.getElementById(id).innerHTML = "");

  // Clasificar según tipo de contenido
  contenidos.forEach((c) => {
    let targetDiv;

    if (c.tipo === "carrousel") targetDiv = document.getElementById("lista-carrousel");
    else if (c.tipo === "comunidad") targetDiv = document.getElementById("lista-comunidad");
    else targetDiv = document.getElementById("lista-assets");

    targetDiv.innerHTML += `
      <div class="product-item" data-id="${c.id}">
        <img src="${c.imagen}" alt="${c.tipo}" width="80" height="80">
        <div class="product-info">
          <strong>Tipo: ${c.tipo}</strong>
          ${c.TCG ? `<span>TCG: ${c.TCG}</span>` : ""}
        </div>
        <div class="product-actions">
          <button class="editar-contenido-btn">Editar</button>
          <button class="eliminar-contenido-btn">Eliminar</button>
        </div>
      </div>
    `;
  });

  // Botones eliminar
  document.querySelectorAll(".eliminar-contenido-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".product-item").dataset.id;
      const contenido = (await supabase.from("contenido_publico").select("imagen").eq("id", id).single()).data;
      if (!contenido) return alert("Contenido no encontrado");

      if (confirm("¿Eliminar este contenido?")) {
        const fileName = contenido.imagen.split("/").pop();
        await supabase.storage.from("contenido_publico").remove([fileName]);
        await supabase.from("contenido_publico").delete().eq("id", id);
        cargarContenidoPublico();
      }
    });
  });

  // Botones editar
  document.querySelectorAll(".editar-contenido-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".product-item").dataset.id;
      const contenido = contenidos.find((c) => c.id == id);
      if (!contenido) return;
      tipoContenidoSelect.value = contenido.tipo;
      tcgContenidoSelect.value = contenido.TCG || "";
      editContenidoId = contenido.id;
      contenidoMsg.textContent = "Editando contenido público...";
    });
  });
}

guardarContenidoBtn.addEventListener("click", async () => {
  const tipo = tipoContenidoSelect.value;
  const tcg = tcgContenidoSelect.value || null;
  const imagenFile = contenidoImagenInput.files[0];

  if (!tipo || !imagenFile) {
    return alert("Selecciona un tipo y un archivo de imagen.");
  }

  let publicUrl = null;
  const fileName = `${Date.now()}_${imagenFile.name}`;
  const { error: uploadError } = await supabase.storage
    .from("contenido_publico")
    .upload(fileName, imagenFile);
  if (uploadError) return alert("Error al subir imagen: " + uploadError.message);

  publicUrl = supabase.storage.from("contenido_publico").getPublicUrl(fileName).data.publicUrl;

  if (editContenidoId) {
    await supabase
      .from("contenido_publico")
      .update({ tipo, TCG: tcg, imagen: publicUrl })
      .eq("id", editContenidoId);
    contenidoMsg.textContent = "Contenido público actualizado correctamente!";
  } else {
    await supabase
      .from("contenido_publico")
      .insert([{ tipo, TCG: tcg, imagen: publicUrl }]);
    contenidoMsg.textContent = "Contenido público agregado correctamente!";
  }

  // limpiar formulario
  tipoContenidoSelect.value = "";
  tcgContenidoSelect.value = "";
  contenidoImagenInput.value = "";
  editContenidoId = null;

  cargarContenidoPublico();
});

// ===================================================
// =============== LOGOS DESDE SUPABASE ===============
// ===================================================
async function cargarLogosDesdeSupabase() {
  try {
    const { data, error } = await supabase
      .from("contenido_publico")
      .select("tipo, imagen")
      .in("tipo", ["logo_login", "logo_admin"]);

    if (error) {
      console.error("Error al obtener logos:", error);
      return;
    }

    data.forEach((item) => {
      if (item.tipo === "logo_login" && loginLogo) {
        loginLogo.src = item.imagen;
      }
      if (item.tipo === "logo_admin" && inicioLogo) {
        inicioLogo.src = item.imagen;
      }
    });

  } catch (err) {
    console.error("Error al cargar logos:", err);
  }
}


// Cambiar pestañas
const tabButtons = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // Activar botón
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Mostrar sección correspondiente
    const target = btn.dataset.tab;
    tabSections.forEach(sec => {
      sec.classList.toggle("active", sec.id === target);
    });
  });
});

// SUBPestañas dentro de CONTENIDO PÚBLICO 
const subtabButtons = document.querySelectorAll(".subtab-btn");
const subtabSections = document.querySelectorAll(".subtab-section");

subtabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    subtabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.subtab;
    subtabSections.forEach(sec => {
      sec.classList.toggle("active", sec.id === `subtab-${target}`);
    });
  });
});


// Cambiar subpestañas TCG dentro de Cartas
const tcgButtons = document.querySelectorAll(".tcg-btn");
const tcgLists = document.querySelectorAll(".tcg-list");

tcgButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tcgButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tcg = btn.dataset.tcg.toLowerCase().replace(" ", "");
    tcgLists.forEach(list => {
      list.classList.toggle("active", list.id === `lista-cartas-${tcg}`);
    });
  });
});


