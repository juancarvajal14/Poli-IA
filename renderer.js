const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("input");
  const chatContainer = document.getElementById("chat-container");
  const sendButton = document.getElementById("send-button");
  const minimizeButton = document.getElementById("minimize-button");
  const closeButton = document.getElementById("close-button");

  ipcRenderer.on("bot-welcome", (_, mensaje) => {
    mostrarMensaje(mensaje, "bot-message");
  });

  inputField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      enviarMensaje();
    }
  });

  sendButton.addEventListener("click", enviarMensaje);

  function mostrarMensaje(texto, clase) {
    if (!texto) return;
    const mensajeDiv = document.createElement("div");
    mensajeDiv.classList.add("message", clase);
    mensajeDiv.textContent = texto;
    chatContainer.appendChild(mensajeDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async function enviarMensaje() {
    const userText = inputField.value.trim();
    if (!userText) return;

    mostrarMensaje(userText, "user-message");
    inputField.value = "";

    try {
      let botResponse = await ipcRenderer.invoke("chat-message", userText);
      botResponse = botResponse.replace(/<think>.*?<\/think>/gis, "").trim();

      mostrarMensaje(botResponse, "bot-message");
    } catch (error) {
      console.error("Error al obtener respuesta del bot:", error);
      mostrarMensaje("❌ Ocurrió un error, intenta nuevamente.", "bot-message");
    }
  }

  // 🔹 Minimizar ventana
  minimizeButton.addEventListener("click", () => {
    ipcRenderer.send("minimize-window");
  });

  // 🔹 Cerrar ventana
  closeButton.addEventListener("click", () => {
    ipcRenderer.send("close-window");
  });
});
