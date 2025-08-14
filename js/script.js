// === CONFIG ===
const API_BASE = "https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net";
const START_ENDPOINT = `${API_BASE}/api/start`;
const CHAT_ENDPOINT  = `${API_BASE}/api/chat`;

// === STATE ===
let sessionToken = null;
let startParams  = null;

// === PARAM INGEST ===
// Accept from URL: ?userName=...&cohortId=...&systemPrompt=...&initialMessage=...
function getStartParamsFromURL() {
  const qs = new URLSearchParams(window.location.search);
  const params = {
    userName:      qs.get("userName")      || undefined,
    cohortId:      qs.get("cohortId")      || undefined,
    systemPrompt:  qs.get("systemPrompt")  || undefined,
    initialMessage:qs.get("initialMessage")|| undefined,
  };
  // Remove undefined keys for a clean JSON body
  Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
  return params;
}

// === SESSION MGMT ===
function startSession(params = {}) {
  const hadToken = !!sessionStorage.getItem("sessionToken");

  return fetch(START_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  .then(res => res.json())
  .then(data => {
    sessionToken = data.token;
    sessionStorage.setItem("sessionToken", sessionToken);
    sessionStorage.setItem("startParams", JSON.stringify(params || {}));

    // Source of truth for the welcome message comes from backend
    if (data.initialMessage) {
      sessionStorage.setItem("initialMessage", data.initialMessage);
    }

    // If this is a brand-new session, clear old chat and show welcome
    if (!hadToken) {
      localStorage.removeItem("chatHistory");
      document.getElementById("chat-history").innerHTML = "";
      showInitialMessage();
    }
  })
  .catch(err => console.error("Failed to start session:", err));
}

function loadSession() {
  sessionToken = sessionStorage.getItem("sessionToken");
  const stored = sessionStorage.getItem("startParams");
  startParams  = stored ? JSON.parse(stored) : {};

  const urlParams = getStartParamsFromURL();
  const paramsChanged = JSON.stringify(urlParams) !== JSON.stringify(startParams);

  if (!sessionToken || paramsChanged) {
    // Reset if no token or if URL params changed, so we honor new settings
    sessionStorage.removeItem("sessionToken");
    startParams = urlParams;
    return startSession(urlParams);
  }
  // else: keep existing session
  return Promise.resolve();
}

// === UI HELPERS ===
function scrollChatToBottom() {
  const chatHistory = document.getElementById("chat-history");
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function createMessageElement(message, className) {
  const messageContainer = document.createElement("div");

  if (className === "bot-message") {
    messageContainer.classList.add("bot-message-container");

    const iconElement = document.createElement("img");
    iconElement.src = "images/bot-icon.png";
    iconElement.classList.add("bot-icon");

    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", className);

    // Render Markdown safely
    const html = marked.parse(message ?? "");
    const safeHtml = DOMPurify.sanitize(html);
    messageElement.innerHTML = safeHtml;

    messageContainer.appendChild(iconElement);
    messageContainer.appendChild(messageElement);
  } else {
    messageContainer.classList.add("chat-message", className);

    const html = marked.parse(message ?? "");
    const safeHtml = DOMPurify.sanitize(html);
    messageContainer.innerHTML = safeHtml;
  }

  return messageContainer;
}

function addMessageToChat(_sender, message, className) {
  const chatHistory = document.getElementById("chat-history");
  const el = createMessageElement(message, className);
  chatHistory.appendChild(el);
  scrollChatToBottom();
  saveChatHistory(message, className);
}

function showInitialMessage() {
  const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
  if (chatData.length === 0) {
    const initialMessage =
      sessionStorage.getItem("initialMessage")
      || "Hi, I’m McAllister, your copilot and guide through the Data Science, Applied AI and Organizational Leadership program at DeGroote.";
    addMessageToChat("Bot", initialMessage, "bot-message");
  }
}

// === CHAT ===
function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = (input.value || "").trim();
  if (!message) return;

  addMessageToChat("You", message, "user-message");

  fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Your backend currently expects the raw token. If you switch to Bearer, use:
      // "Authorization": `Bearer ${sessionToken}`,
      "Authorization": sessionToken,
    },
    body: JSON.stringify({ message }),
  })
  .then(res => {
    if (!res || !res.ok) throw new Error(`HTTP ${res ? res.status : "Unknown"}`);
    return res.json();
  })
  .then(data => {
    addMessageToChat("Bot", data.response, "bot-message");
  })
  .catch(err => {
    console.error("Error:", err);
    addMessageToChat("Bot", "Sorry, there was an error. Please try again.", "bot-message");
  });

  input.value = "";
  scrollChatToBottom();
}

// === HISTORY ===
function saveChatHistory(message, className) {
  const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
  chatData.push({ message, className });
  localStorage.setItem("chatHistory", JSON.stringify(chatData));
}

function loadChatHistory() {
  const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
  const chatHistory = document.getElementById("chat-history");
  chatData.forEach(({ message, className }) => {
    const el = createMessageElement(message, className);
    chatHistory.appendChild(el);
  });
  scrollChatToBottom();
}

function clearChat() {
  localStorage.removeItem("chatHistory");
  document.getElementById("chat-history").innerHTML = "";

  // Reset session and start a new one with the same params (or fresh from URL)
  sessionStorage.removeItem("sessionToken");
  const params = startParams && Object.keys(startParams).length
    ? startParams
    : getStartParamsFromURL();

  startSession(params).then(() => {
    // Blade can close after starting a fresh session
    document.getElementById("sidebar").classList.remove("open");
  });
}

// === EVENT WIRING ===
window.onload = async () => {
  await loadSession();   // ensures token is ready (or started)
  loadChatHistory();
  showInitialMessage();

  document.getElementById("send-btn").addEventListener("click", sendMessage);
  document.getElementById("chat-input").addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });

  // Left blade toggle
  document.getElementById("open-sidebar-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // New Chat
  document.getElementById("new-chat-btn").addEventListener("click", clearChat);
};
