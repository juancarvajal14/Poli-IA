const { app, BrowserWindow, ipcMain } = require("electron");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

let mainWindow;
let dataset = {};

// Cargar dataset JSON (Información) con validación
try {
  const dataPath = path.join(__dirname, "/data/dataset.json");
  if (fs.existsSync(dataPath)) {
    dataset = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } else {
    console.warn(
      "⚠️ El archivo dataset.json no existe. Se usará un dataset vacío."
    );
  }
} catch (error) {
  console.error("❌ Error al cargar el dataset JSON:", error);
}

// Unificar preguntas_respuestas e informacion_profunda con etiquetas clave
function extraerInformacion(dataset) {
  let datos = [];

  if (dataset.preguntas_respuestas) {
    dataset.preguntas_respuestas.forEach((item) => {
      datos.push({
        tipo: "pregunta",
        clave: item.pregunta.toLowerCase(),
        respuesta: item.respuesta,
        etiquetas: [],
      });
    });
  }

  if (dataset.informacion_profunda) {
    recorrerObjeto(dataset.informacion_profunda);
  }

  function recorrerObjeto(obj, contexto = "", etiquetas = []) {
    for (const clave in obj) {
      const valor = obj[clave];
      const nuevoContexto = contexto ? `${contexto} > ${clave}` : clave;
      const nuevasEtiquetas = [...etiquetas, clave.toLowerCase()];

      if (typeof valor === "string") {
        datos.push({
          tipo: "informacion",
          clave: nuevoContexto.toLowerCase(),
          respuesta: valor,
          etiquetas: nuevasEtiquetas,
        });
      } else if (typeof valor === "object") {
        recorrerObjeto(valor, nuevoContexto, nuevasEtiquetas);
      }
    }
  }

  // if (dataset.informacion_profunda) {
  //     recorrerObjeto(dataset.informacion_profunda);
  // }

  return datos;
}

const datosUnificados = extraerInformacion(dataset);

// Función mejorada para buscar en el dataset
function buscarEnDataset(pregunta) {
  const preguntaNormalizada = pregunta.toLowerCase();
  let mejorCoincidencia = null;
  let mayorSimilitud = 0;

  const palabrasClave = preguntaNormalizada.split(/\s+/);
  const palabrasClaveImportantes = palabrasClave.filter((palabra) =>
    [
      "horario",
      "ubicación",
      "trámite",
      "solicitar",
      "certificado",
      "bloque",
      "facultad",
    ].includes(palabra)
  );

  for (const item of datosUnificados) {
    const similitud = calcularSimilitud(preguntaNormalizada, item.clave);
    const contienePalabraClave = palabrasClaveImportantes.some((palabra) =>
      item.etiquetas?.includes(palabra)
    );

    if (contienePalabraClave) {
      return item.respuesta; // ✅ Devuelve la respuesta directamente si hay coincidencia exacta
    }

    if (similitud > mayorSimilitud) {
      mayorSimilitud = similitud;
      mejorCoincidencia = item.respuesta;
    }
  }

  return mayorSimilitud >= 0.4 ? mejorCoincidencia : null;
}

// Función de similitud optimizada
function calcularSimilitud(texto1, texto2) {
  texto1 = texto1.toLowerCase().replace(/[^\w\s]/g, "");
  texto2 = texto2.toLowerCase().replace(/[^\w\s]/g, "");

  const palabras1 = new Set(texto1.split(/\s+/));
  const palabras2 = new Set(texto2.split(/\s+/));

  const interseccion = [...palabras1].filter((palabra) =>
    palabras2.has(palabra)
  );
  return interseccion.length / Math.max(palabras1.size, palabras2.size);
}

// Manejador de mensajes del chatbot
ipcMain.handle("chat-message", async (_, mensaje) => {
  const respuestaDataset = buscarEnDataset(mensaje);

  if (respuestaDataset) {
    return respuestaDataset;
  }

  const contexto = `
        Eres un chatbot universitario nombrado "Poli-IA". Responde **solo con la información proporcionada y solamente en Español**.
        Si no hay información relevante en la base de datos, indica que no tienes respuesta en lugar de inventar datos.
        Si la pregunta es lógica, matemática o informativa, respóndela normalmente.
    `;

  try {
    const response = await axios.post(
      "http://localhost:1234/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          { role: "user", content: mensaje },
          { role: "system", content: contexto },
        ],
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error en la solicitud a DeepSeek:", error);
    return "⚠️ Hubo un problema al procesar tu solicitud.";
  }
});

// Creación de la ventana principal
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    resizable: false,
    frame: false, // Quitar la barra superior
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  console.log("🚀 Ventana emergente iniciada correctamente.");

  // Cargar el archivo index.html (Pagina principal)
  mainWindow.loadURL(`file://${path.join(__dirname, "index.html")}`);

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send(
      "bot-welcome",
      "👋 ¡Hola! Soy Poli-IA, ¿en qué puedo ayudarte hoy?"
    );
  });

  mainWindow.on("closed", () => (mainWindow = null));

  // Función para minimizar la ventana
  ipcMain.on("minimize-window", () => {
    if (mainWindow) mainWindow.minimize();
  });

  // Función para cerrar la ventana
  ipcMain.on("close-window", () => {
    if (mainWindow) mainWindow.close();
    console.log("⚔️ Ventana emergente cerrada correctamente.");
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});