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

  // Mostrar pantalla de inicio
  loginContainer.style.display = "none";
  adminPanel.style.display = "block";
  loginLogo.style.display = "none";
  inicioLogo.style.display = "block";
  loginH1.style.display = "none";

  // Cargar datos
  cargarProductosAdmin();
  cargarEventosAdmin();
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
const subTipoProductoInput = document.getElementById("sub_tipo_producto");
const ofertaInput = document.getElementById("oferta");
const cantidadOfertaInput = document.getElementById("cantidad_oferta");
const disponibleInput = document.getElementById("disponible");
const destacadoInput = document.getElementById("destacado");
const preventaInput = document.getElementById("preventa");
const cantidadInput = document.getElementById("cantidad");
const guardarBtn = document.getElementById("guardar-btn");
const saveMsg = document.getElementById("save-msg");


let scrollPos = 0;

// ==================== NUEVO: OPCIONES DE SUBTIPOS ====================
const subTiposPorTCG = {
  Magic: [
    "Sobre",
    "Sobre Collector",
    "Caja de sobres",
    "Caja de sobres Collector",
    "Precons",
    "Bundle",
    "Preerelease",
    "Cajas de escenas",
    "Productos raros",
  ],
  Pokemon: [
    "Sleeved Booster",
    "Checklane Blister",
    "Triple Blister",
    "Elite Trainer Box",
    "Build And Battle Box",
    "Collector Box",
    "Premium Collection",
    "Starter Deck",
    "Mini Tin",
  ],
  "One Piece": [
    "Booster Pack",
    "Booster Box",
    "Starter Deck",
    "Gift Collection",
  ],
  General: [
    "Sobre",
    "Caja de sobres",
    "Bundle",
  ],
};

// ============== ACTUALIZAR SUBTIPOS SEGÚN TIPO / TCG ==============
function actualizarSubTipos() {
  const tipo = tipoProductoInput.value;
  const tcg = tcgInput.value;
  subTipoProductoInput.innerHTML = ""; // limpiar opciones

  if (tipo === "Carta") {
    if (tcg && subTiposPorTCG[tcg]) {
      let todosSubTipos = [...subTiposPorTCG[tcg]];

      // Solo agregar los subtipos generales a Pokémon
      if (tcg === "Pokemon") {
        todosSubTipos.push("Sobre", "Caja de sobres");
      }

      todosSubTipos.forEach((st) => {
        const option = document.createElement("option");
        option.value = st;
        option.textContent = st;
        subTipoProductoInput.appendChild(option);
      });
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Selecciona un TCG primero";
      subTipoProductoInput.appendChild(option);
    }
  } else {
    // Para otros tipos, solo mostrar generales
    ["Sobre", "Caja de sobres"].forEach((st) => {
      const option = document.createElement("option");
      option.value = st;
      option.textContent = st;
      subTipoProductoInput.appendChild(option);
    });
  }
}


// Eventos para actualizar dinámicamente
tipoProductoInput.addEventListener("change", actualizarSubTipos);
tcgInput.addEventListener("change", actualizarSubTipos);

// Habilitar/deshabilitar según el checkbox de oferta
ofertaInput.addEventListener("change", () => {
  cantidadOfertaInput.disabled = !ofertaInput.checked;
  if (!ofertaInput.checked) cantidadOfertaInput.value = 0;
});

let editId = null;

// ===================================================
// ========== CARGAR PRODUCTOS ADMIN ================
// ===================================================
async function cargarProductosAdmin() {
  const { data: productos, error } = await supabase
    .from("productos")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar productos:", error);
    return;
  }

  // Limpiar todas las listas principales
  const listas = [
    "lista-cartas-magic",
    "lista-cartas-pokemon",
    "lista-cartas-onepiece",
    "lista-carpetas",
    "lista-protectores",
    "lista-cajas",
    "lista-otros",
  ];
  listas.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.querySelectorAll(".subtcg-section").forEach(sub => sub.innerHTML = "");
  });

  productos.forEach(p => {
    let targetDiv, html = "";

    if (p.tipo_producto === "Carta") {
      // Normalizar TCG
      let baseId = "";
      if (p.TCG === "Magic") baseId = "magic";
      else if (p.TCG === "Pokemon") baseId = "pokemon";
      else if (p.TCG === "One Piece") baseId = "onepiece";
      else return; // si no tiene TCG válido, ignorar

     // subtipo exactamente como viene (lowercase para match consistente)
     const subtipo = (p.sub_tipo_producto || "").trim().toLowerCase();

     // Mapas EXACTOS (solo las opciones que definiste en el HTML)
     const mapaGeneral = {
       "sobre": "magic-sobre",
       "caja de sobres": "magic-caja",
     };

     // --- MAGIC ---
     const mapaMagic = {
       "sobre": "magic-sobres",
       "sobre collector": "magic-sobres-collector",
       "caja de sobres": "magic-caja-sobres",
       "caja de sobres collector": "magic-caja-sobres-collector",
       "precons": "magic-precons",
       "bundle": "magic-bundle",
       "preerelease": "magic-preerelease",
       "cajas de escenas": "magic-cajas-escenas",
       "productos raros": "magic-productos-raros",
     };

     // --- POKEMON ---
     const mapaPokemon = {
       "sobre": "pokemon-sobres",
       "caja de sobres": "pokemon-caja-sobres",
       "sleeved booster": "pokemon-sleeved-booster",
       "checklane blister": "pokemon-checklane-blister",
       "triple blister": "pokemon-triple-blister",
       "elite trainer box": "pokemon-elite-trainer-box",
       "build and battle box": "pokemon-build-battle-box",
       "collector box": "pokemon-collector-box",
       "premium collection": "pokemon-premium-collection",
       "starter deck": "pokemon-starter-deck",
       "mini tin": "pokemon-mini-tin",
     };


     // One Piece ya no tiene subpestañas, así que todos los productos van al contenedor general
     const mapaOnePiece = {
       "booster pack": "lista-onepiece-productos",
       "booster box": "lista-onepiece-productos",
       "starter deck": "lista-onepiece-productos",
       "gift collection": "lista-onepiece-productos",
       "sobre": "lista-onepiece-productos",
       "caja de sobres": "lista-onepiece-productos",
     };

     // Elegir destino según TCG
     if (baseId === "magic") {
       const destinoId = mapaMagic[subtipo] || mapaGeneral[subtipo] || "magic-otros";
       targetDiv = document.getElementById(destinoId);
     } else if (baseId === "pokemon") {
       const destinoId = mapaPokemon[subtipo] || mapaGeneral[subtipo] || "pokemon-otros";
       targetDiv = document.getElementById(destinoId);
     } else if (baseId === "onepiece") {
       // 🔥 Para One Piece: enviar todo al único contenedor principal
       targetDiv = document.getElementById("lista-onepiece-productos");
     }


      // Si no existe el contenedor, salir (evita errores en consola)
      if (!targetDiv) return;

      // HTML del item 
      html = `
        <div class="product-item carta" data-id="${p.id}">
          <img src="${p.imagen}" alt="${p.nombre}">
          <div class="product-info">
            <strong>${p.nombre}</strong>
            <div class="product-data">
              <span>Precio: $${p.precio}</span>
              <span>Subtipo: ${p.sub_tipo_producto || "-"}</span>
              <span>TCG: ${p.TCG || "-"}</span>
              <span>Cantidad: ${p.cantidad}</span>
              <span>Oferta: ${p.oferta && p.cantidad_oferta > 0 ? `Sí (${p.cantidad_oferta}%)` : "No"}</span>
              <span>Preventa: ${p.preventa ? "Sí" : "No"}</span>
              <span>Disponible: ${p.disponible ? "Sí" : "No"}</span>
            </div>
          </div>
          <div class="product-actions">
            <button class="editar-btn">Editar</button>
            <button class="eliminar-btn">Eliminar</button>
          </div>
        </div>
      `;
    } else {
      // ACCESORIOS
      if (p.tipo_producto === "Carpeta") targetDiv = document.getElementById("lista-carpetas");
      else if (p.tipo_producto === "Protector") targetDiv = document.getElementById("lista-protectores");
      else if (p.tipo_producto === "Caja para deck") targetDiv = document.getElementById("lista-cajas");
      else targetDiv = document.getElementById("lista-otros");

      html = `
        <div class="product-item accesorio" data-id="${p.id}">
          <img src="${p.imagen}" alt="${p.nombre}">
          <div class="product-info">
            <strong>${p.nombre}</strong>
            <div class="product-data">
              <span>Precio: $${p.precio}</span>
              <span>Cantidad: ${p.cantidad}</span>
              <span>Disponible: ${p.disponible ? "Sí" : "No"}</span>
              <span>Oferta: ${p.oferta && p.cantidad_oferta > 0 ? `Sí (${p.cantidad_oferta}%)` : "No"}</span>
            </div>
          </div>
          <div class="product-actions">
            <button class="editar-btn">Editar</button>
            <button class="eliminar-btn">Eliminar</button>
          </div>
        </div>
      `;
    }

    // Agregar HTML si existe el contenedor
    if (targetDiv) targetDiv.innerHTML += html;
  });

  // Eventos eliminar y editar (igual que antes)
  document.querySelectorAll(".eliminar-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".product-item").dataset.id;
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
      const id = btn.closest(".product-item").dataset.id;
      const producto = productos.find((p) => p.id == id);
      if (!producto) return;

      nombreInput.value = producto.nombre;
      descripcionInput.value = producto.descripcion;
      precioInput.value = producto.precio;
      tcgInput.value = producto.TCG;
      tipoProductoInput.value = producto.tipo_producto;
      actualizarSubTipos();
      subTipoProductoInput.value = producto.sub_tipo_producto || "";
      ofertaInput.checked = producto.oferta;
      cantidadOfertaInput.value = producto.cantidad_oferta || 0;
      cantidadOfertaInput.disabled = !producto.oferta;
      disponibleInput.checked = producto.disponible;
      destacadoInput.checked = producto.destacado;
      preventaInput.checked = producto.preventa;
      cantidadInput.value = producto.cantidad;
      editId = producto.id;
      saveMsg.textContent = "Editando producto...";
      scrollPos = window.scrollY;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ===================================================
// ============== GUARDAR PRODUCTO ===================
// ===================================================
guardarBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value.trim();
  const descripcion = descripcionInput.value.trim();
  const precio = parseFloat(precioInput.value);
  const tcg = tcgInput.value;
  const tipo_producto = tipoProductoInput.value;
  const sub_tipo_producto = subTipoProductoInput.value;
  const oferta = ofertaInput.checked;
  const cantidadOferta = oferta ? parseFloat(cantidadOfertaInput.value) || 0 : 0;
  const disponible = disponibleInput.checked;
  const destacado = destacadoInput.checked;
  const preventa = preventaInput.checked;
  const cantidad = parseInt(cantidadInput.value) || 0;
  const imagenFile = imagenInput.files[0];

  if (!nombre || !descripcion || isNaN(precio) || !tipo_producto || (tipo_producto === "Carta" && !tcg)) {
    alert("Completa todos los campos. TCG es obligatorio solo si es una carta.");
    return;
  }

  let publicUrl = null;

  if (imagenFile) {
    const fileName = `${Date.now()}_${imagenFile.name}`;
    const { error: uploadError } = await supabase.storage.from("productos").upload(fileName, imagenFile);
    if (uploadError) return alert("Error al subir imagen: " + uploadError.message);
    publicUrl = supabase.storage.from("productos").getPublicUrl(fileName).data.publicUrl;
  }

  const updateData = {
    nombre,
    descripcion,
    precio,
    TCG: tcg || null,
    tipo_producto,
    sub_tipo_producto: sub_tipo_producto || null, // nuevo campo
    oferta,
    cantidad_oferta: cantidadOferta,
    disponible,
    destacado,
    preventa,
    cantidad,
  };

  if (publicUrl) updateData.imagen = publicUrl;

  if (editId) {
    const productoActual = (await supabase.from("productos").select("imagen").eq("id", editId).single()).data;
    if (publicUrl && productoActual.imagen) {
      const oldFileName = productoActual.imagen.split("/").pop();
      await supabase.storage.from("productos").remove([oldFileName]);
    }

    await supabase.from("productos").update(updateData).eq("id", editId);
    saveMsg.textContent = "Producto actualizado correctamente!";
  } else {
    if (!publicUrl) return alert("Selecciona una imagen para el producto nuevo");
    await supabase.from("productos").insert([updateData]);
    saveMsg.textContent = "Producto agregado correctamente!";
  }

  // Limpiar formulario
  nombreInput.value = "";
  descripcionInput.value = "";
  precioInput.value = "";
  cantidadInput.value = 0;
  tcgInput.value = "";
  tipoProductoInput.value = "";
  subTipoProductoInput.innerHTML = "";
  imagenInput.value = "";
  ofertaInput.checked = false;
  cantidadOfertaInput.value = 0;
  cantidadOfertaInput.disabled = true;
  disponibleInput.checked = true;
  destacadoInput.checked = false;
  preventaInput.checked = false;
  editId = null;

  // Recargar productos
  await cargarProductosAdmin();

  // ------------------------------
  // Volver al scroll guardado si venías de editar
  if (scrollPos) {
    setTimeout(() => {
      window.scrollTo({ top: scrollPos, behavior: "smooth" });
      scrollPos = 0; // reset
    }, 500);
  }
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
        <div class="evento-texto">
          <strong>${e.titulo}</strong>
          <span>${e.fecha}</span>
        </div>
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
  <option value="logo_pestaña">Logo Pestaña</option>
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


// ======================================================
//                      SORTEOS 
// ======================================================

let participantes = []
let sorteoActual = null

// Elementos del DOM
const canvas = document.getElementById("ruletaCanvas")
const ctx = canvas ? canvas.getContext("2d") : null

const inputNombreSorteo = document.getElementById("sorteo-nombre")
const inputDescripcionSorteo = document.getElementById("sorteo-descripcion")
const btnCrearSorteo = document.getElementById("crear-sorteo-btn")
const inputParticipante = document.getElementById("participante-nombre")
const btnAgregarParticipante = document.getElementById("agregar-participante-btn")
const listaParticipantes = document.getElementById("lista-participantes")
const btnGirar = document.getElementById("girar-btn")
const lblGanador = document.getElementById("ganador")

//  Contenedor donde mostraremos la lista de sorteos existentes
const contenedorSorteos = document.getElementById("lista-sorteos");

// -----------------------------
// 🧱 Crear sorteo
// -----------------------------
async function crearSorteo() {
  const nombre = inputNombreSorteo.value.trim()
  const descripcion = inputDescripcionSorteo.value.trim()

  if (!nombre) return alert("⚠️ Debes ingresar un nombre para el sorteo.")

  const { data, error } = await supabase
    .from("sorteos")
    .insert([{ nombre, descripcion }])
    .select()
    .single()

  if (error) {
    console.error(error)
    return alert("❌ Error al crear el sorteo.")
  }

  sorteoActual = data
  participantes = []
  listaParticipantes.innerHTML = ""
  lblGanador.textContent = ""

  alert(`✅ Sorteo "${nombre}" creado correctamente.`)
  cargarSorteos()
}

btnCrearSorteo?.addEventListener("click", crearSorteo)

// -----------------------------
// 📋 Cargar lista de sorteos existentes
// -----------------------------
async function cargarSorteos() {
  const { data, error } = await supabase.from("sorteos").select("*")

  if (error) {
    console.error("Error al cargar sorteos:", error)
    return
  }

  // Limpia la lista
  contenedorSorteos.innerHTML = ""

  // Crea la estructura tipo lista (como los participantes)
  data.forEach((sorteo) => {
    const li = document.createElement("li")
    li.className = "sorteo-item"
    li.innerHTML = `
      <span class="sorteo-nombre">${sorteo.nombre}</span>
      <div class="botones-sorteo">
        <button class="btn-cargar" data-id="${sorteo.id}">Seleccionar</button>
        <button class="btn-eliminar" data-id="${sorteo.id}">Borrar</button>
      </div>
    `
    contenedorSorteos.appendChild(li)
  })

  // Eventos: cargar sorteo
  document.querySelectorAll(".btn-cargar").forEach((btn) => {
    btn.addEventListener("click", () => {
      sorteoActual = { id: btn.dataset.id }
      cargarParticipantes(sorteoActual.id)
      alert(`📂 Sorteo cargado (ID: ${sorteoActual.id})`)
    })
  })

  // Eventos: eliminar sorteo
  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", () => eliminarSorteo(btn.dataset.id))
  })
}

// -----------------------------
// ❌ Eliminar sorteo
// -----------------------------
async function eliminarSorteo(id) {
  if (!confirm("¿Seguro que deseas eliminar este sorteo?")) return

  // Borrar participantes relacionados
  await supabase.from("participantes").delete().eq("sorteo_id", id)

  // Borrar el sorteo
  const { error } = await supabase.from("sorteos").delete().eq("id", id)

  if (error) {
    console.error(error)
    alert("❌ Error eliminando el sorteo.")
  } else {
    alert("✅ Sorteo eliminado.")
    if (sorteoActual?.id === id) {
      sorteoActual = null
      participantes = []
      listaParticipantes.innerHTML = ""
      lblGanador.textContent = ""
      dibujarRuleta()
    }
    cargarSorteos()
  }
}

// -----------------------------
// ➕ Agregar participante
// -----------------------------
btnAgregarParticipante?.addEventListener("click", async () => {
  const nombre = inputParticipante.value.trim()
  if (!nombre) return alert("⚠️ Ingresa un nombre de participante.")
  if (!sorteoActual) return alert("⚠️ Crea o carga un sorteo antes de agregar participantes.")

  const { data, error } = await supabase
    .from("participantes")
    .insert([{ nombre, sorteo_id: sorteoActual.id }])
    .select()
    .single()

  if (error) {
    console.error(error)
    return alert("❌ No se pudo agregar el participante.")
  }

  participantes.push({ id: data.id, nombre: data.nombre })
  renderParticipantes()
  inputParticipante.value = ""
  dibujarRuleta()
})

// -----------------------------
// ✏️ Renderizar lista de participantes con botones de editar/eliminar
// -----------------------------
function renderParticipantes() {
  listaParticipantes.innerHTML = ""

  participantes.forEach((p) => {
    const li = document.createElement("li")
    li.innerHTML = `
      <span contenteditable="true" class="editable-nombre" data-id="${p.id}">${p.nombre}</span>
      <div class="botones-participante">
        <button class="btn-guardar" data-id="${p.id}">Actualizar</button>
        <button class="btn-borrar" data-id="${p.id}">Borrar</button>
      </div>
    `
    listaParticipantes.appendChild(li)
  })

  document.querySelectorAll(".btn-borrar").forEach((btn) => {
    btn.addEventListener("click", () => eliminarParticipante(btn.dataset.id))
  })

  document.querySelectorAll(".btn-guardar").forEach((btn) => {
    btn.addEventListener("click", () => editarParticipante(btn.dataset.id))
  })
}

// -----------------------------
// 🗑️ Eliminar participante
// -----------------------------
async function eliminarParticipante(id) {
  const { error } = await supabase.from("participantes").delete().eq("id", id)
  if (error) {
    console.error(error)
    return alert("❌ Error al eliminar participante.")
  }

  participantes = participantes.filter((p) => p.id != id)
  renderParticipantes()
  dibujarRuleta()
}

// -----------------------------
// ✏️ Editar participante
// -----------------------------
async function editarParticipante(id) {
  const span = document.querySelector(`.editable-nombre[data-id="${id}"]`)
  const nuevoNombre = span.textContent.trim()

  const { error } = await supabase.from("participantes").update({ nombre: nuevoNombre }).eq("id", id)
  if (error) {
    console.error(error)
    alert("❌ Error al editar participante.")
    return
  }

  const participante = participantes.find((p) => p.id == id)
  if (participante) participante.nombre = nuevoNombre
  alert("✅ Participante actualizado.")
  dibujarRuleta()
}

// -----------------------------
// 🔄 Cargar participantes desde Supabase
// -----------------------------
async function cargarParticipantes(sorteoId) {
  const { data, error } = await supabase
    .from("participantes")
    .select("id, nombre")
    .eq("sorteo_id", sorteoId)

  if (error) {
    console.error("Error al cargar participantes:", error)
    return
  }

  participantes = data
  renderParticipantes()
  dibujarRuleta()
}

// -----------------------------
// 🌀 Dibujar ruleta
// -----------------------------
function dibujarRuleta() {
  if (!ctx) return
  const total = participantes.length
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (total === 0) return

  const angulo = (2 * Math.PI) / total
  const colores = ["#ff7675", "#74b9ff", "#55efc4", "#ffeaa7", "#fd79a8", "#a29bfe"]

  for (let i = 0; i < total; i++) {
    ctx.beginPath()
    ctx.moveTo(200, 200)
    ctx.fillStyle = colores[i % colores.length]
    ctx.arc(200, 200, 200, i * angulo, (i + 1) * angulo)
    ctx.fill()

    ctx.save()
    ctx.translate(200, 200)
    ctx.rotate(i * angulo + angulo / 2)
    ctx.fillStyle = "#000"
    ctx.textAlign = "right"
    ctx.font = "16px Arial"
    ctx.fillText(participantes[i].nombre, 190, 10)
    ctx.restore()
  }
}

// -----------------------------
// 🎯 Girar ruleta con animación
// -----------------------------
let anguloActual = 0
let animando = false

btnGirar?.addEventListener("click", () => {
  if (animando) return
  if (participantes.length === 0) return alert("⚠️ Agrega participantes primero.")
  if (!sorteoActual) return alert("⚠️ Crea o carga un sorteo antes de girar la ruleta.")

  // 🧹 Limpiar el texto y efecto del ganador anterior
  lblGanador.textContent = ""
  lblGanador.classList.remove("mostrar-ganador")

  animando = true
  const total = participantes.length
  const velocidadInicial = Math.random() * 0.3 + 0.35 // velocidad aleatoria inicial
  const duracion = 5000 // duración total de la animación en ms
  const tiempoInicio = performance.now()

  function animar(tiempo) {
    let progreso = (tiempo - tiempoInicio) / duracion
    if (progreso > 1) progreso = 1
    const factorDesaceleracion = Math.pow(1 - progreso, 2)
    anguloActual += velocidadInicial * factorDesaceleracion

    dibujarRuletaAnimada(anguloActual)

    if (progreso < 1) {
      requestAnimationFrame(animar)
    } else {
      // Calcular ganador corregido
      const anguloFinal = (anguloActual % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
      const indiceGanador = Math.floor(
        ((2 * Math.PI) - anguloFinal + Math.PI / 2) / ((2 * Math.PI) / total)
      ) % total
      const ganador = participantes[indiceGanador].nombre

      // Mostrar ganador con animación
      lblGanador.textContent = `🎉 ${ganador} 🎉`
      lblGanador.classList.add("mostrar-ganador")

      // Lanzar confeti durante 2 segundos
      const duration = 2000
      const end = Date.now() + duration

      function lanzarConfeti() {
        confetti({
          particleCount: 6,
          spread: 70,
          origin: { y: 0.6 },
        })
        if (Date.now() < end) {
          requestAnimationFrame(lanzarConfeti)
        } else {
          animando = false
        }
      }

      lanzarConfeti()
    }
  }
  requestAnimationFrame(animar)
})


function dibujarRuletaAnimada(rotacion) {
  if (!ctx) return
  const total = participantes.length
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (total === 0) return

  const angulo = (2 * Math.PI) / total
  const colores = ["#ff7675", "#74b9ff", "#55efc4", "#ffeaa7", "#fd79a8", "#a29bfe"]

  for (let i = 0; i < total; i++) {
    ctx.beginPath()
    ctx.moveTo(200, 200)
    ctx.fillStyle = colores[i % colores.length]
    ctx.arc(200, 200, 200, rotacion + i * angulo, rotacion + (i + 1) * angulo)
    ctx.fill()

    ctx.save()
    ctx.translate(200, 200)
    ctx.rotate(rotacion + i * angulo + angulo / 2)
    ctx.fillStyle = "#000"
    ctx.textAlign = "right"
    ctx.font = "16px Arial"
    ctx.fillText(participantes[i].nombre, 190, 10)
    ctx.restore()
  }
}
// Inicializar al abrir
cargarSorteos()

// ==========================
//  PANEL DE RESERVAS
// ==========================

async function cargarReservas() {
  try {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) throw error;

    const contenedor = document.getElementById("reservas-lista");
    contenedor.innerHTML = "";

    // ⚡️ Elimina cualquier clase previa
    contenedor.classList.remove("vacio");

    if (!data.length) {
      // ⚡️ Aplica la clase "vacio" en lugar de solo texto
      contenedor.classList.add("vacio");
      return;
    }

    data.forEach((reserva) => {
      const div = document.createElement("div");
      div.className = "reserva-item";
      div.innerHTML = `
        <p><strong>Producto:</strong> ${reserva.producto}</p>
        <p><strong>Nombre:</strong> ${reserva.nombre}</p>
        <p><strong>RUT:</strong> ${reserva.rut}</p>
        <p><strong>Correo:</strong> ${reserva.correo}</p>
        <p><strong>Fecha:</strong> ${new Date(reserva.fecha).toLocaleString("es-CL")}</p>
        <p><strong>Estado:</strong> ${reserva.confirmada ? "✅ Confirmada" : "⏳ Pendiente"}</p>
        <div class="acciones">
          ${
            !reserva.confirmada
              ? `<button class="btn-confirmar" data-id="${reserva.id}">Confirmar</button>`
              : ""
          }
          <button class="btn-eliminar" data-id="${reserva.id}">Eliminar</button>
        </div>
      `;
      contenedor.appendChild(div);
    });

    // Asignar eventos a los botones
    document.querySelectorAll(".btn-confirmar").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        await confirmarReserva(id);
      });
    });

    document.querySelectorAll(".btn-eliminar").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        await eliminarReserva(id);
      });
    });
  } catch (err) {
    console.error("Error al cargar reservas:", err);
  }
}

async function confirmarReserva(id) {
  try {
    const { error } = await supabase
      .from("reservas")
      .update({ confirmada: true })
      .eq("id", id);

    if (error) throw error;
    mostrarMensaje("✅ Reserva confirmada correctamente.", "green");
    cargarReservas();
  } catch (err) {
    console.error("Error al confirmar:", err);
    mostrarMensaje("❌ Error al confirmar reserva.", "red");
  }
}

async function eliminarReserva(id) {
  if (!confirm("¿Seguro que deseas eliminar esta reserva?")) return;
  try {
    const { error } = await supabase.from("reservas").delete().eq("id", id);
    if (error) throw error;
    mostrarMensaje("🗑️ Reserva eliminada correctamente.", "green");
    cargarReservas();
  } catch (err) {
    console.error("Error al eliminar:", err);
    mostrarMensaje("❌ Error al eliminar reserva.", "red");
  }
}

// Mostrar mensajes dentro del panel
function mostrarMensaje(texto, color = "green") {
  const msg = document.getElementById("reservas-msg");
  msg.textContent = texto;
  msg.style.color = color;
  setTimeout(() => (msg.textContent = ""), 3000);
}

// Cargar reservas al abrir la pestaña
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const tab = e.target.dataset.tab;
    if (tab === "reservas-tab") {
      cargarReservas();
    }
  });
});


// ===================================================
// =============== LOGOS DESDE SUPABASE ===============
// ===================================================
async function cargarLogosDesdeSupabase() {
  try {
    const { data, error } = await supabase
      .from("contenido_publico")
      .select("tipo, imagen")
      .in("tipo", ["logo_login", "logo_admin", "logo_pestaña"]);

    if (error) {
      console.error("Error al obtener logos:", error);
      return;
    }

    data.forEach((item) => {
      if (item.tipo === "logo_login") {
        const loginLogo = document.getElementById("login-logo");
        if (loginLogo) loginLogo.src = item.imagen;
      }

      if (item.tipo === "logo_admin") {
        const inicioLogo = document.getElementById("inicio-logo");
        if (inicioLogo) inicioLogo.src = item.imagen;
      }

      if (item.tipo === "logo_pestaña") {
        const favicon = document.getElementById("favicon");
        if (favicon) {
          favicon.href = item.imagen;
        } else {
          // Si el link no existe, lo crea
          const newFavicon = document.createElement("link");
          newFavicon.rel = "icon";
          newFavicon.type = "image/png";
          newFavicon.href = item.imagen;
          document.head.appendChild(newFavicon);
        }
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

// ====================== CONTROL DE SUBPESTAÑAS POR TCG ======================
document.querySelectorAll(".tcg-list").forEach(tcgList => {
  const subtcgTabs = tcgList.querySelector(".subtcg-tabs");
  const subtcgButtons = subtcgTabs ? subtcgTabs.querySelectorAll(".subtcg-btn") : [];
  const subtcgSections = tcgList.querySelectorAll(".subtcg-section");

  subtcgButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Desactivar todo dentro del TCG actual
      subtcgButtons.forEach(b => b.classList.remove("active"));
      subtcgSections.forEach(s => s.classList.remove("active"));

      // Activar el botón y la sección correspondiente
      btn.classList.add("active");
      const target = btn.dataset.subtcg;
      const targetSection = tcgList.querySelector(`#${target}`);
      if (targetSection) targetSection.classList.add("active");
    });
  });

  // Al cargar, aseguramos que solo la primera sección esté activa
  if (subtcgButtons.length > 0) {
    const firstBtn = subtcgButtons[0];
    const firstTarget = firstBtn.dataset.subtcg;
    const firstSection = tcgList.querySelector(`#${firstTarget}`);
    subtcgButtons.forEach(b => b.classList.remove("active"));
    subtcgSections.forEach(s => s.classList.remove("active"));
    firstBtn.classList.add("active");
    if (firstSection) firstSection.classList.add("active");
  }
});

// ====================== CONTROL PRINCIPAL DE TCG (Magic / Pokémon / One Piece) ======================
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
