let sessionToken = null;
let startParams = null;

// NEW: read params from the page URL
function getStartParamsFromURL() {
    const qs = new URLSearchParams(window.location.search);
    const params = {
        userName: qs.get("userName") || undefined,
        cohortId: qs.get("cohortId") || undefined,
        systemPrompt: qs.get("systemPrompt") || undefined,
        initialMessage: qs.get("initialMessage") || undefined,
    };
    // strip undefined to keep the POST body clean
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    return params;
}

function startSession(params = {}) {
  // make initialMessage available immediately
  if (params.initialMessage) {
    sessionStorage.setItem("initialMessage", params.initialMessage);
  }

  return fetch("https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net/api/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  .then(r => r.json())
  .then(data => {
    sessionToken = data.token;
    sessionStorage.setItem("sessionToken", sessionToken);
    sessionStorage.setItem("startParams", JSON.stringify(params || {}));
    if (data.initialMessage) {
      sessionStorage.setItem("initialMessage", data.initialMessage);
    }
    return true; // new session started
  })
  .catch(e => {
    console.error("Failed to start session:", e);
    return false;
  });
}


// before: function loadSession() { ... }
async function loadSession() {
  sessionToken = sessionStorage.getItem("sessionToken");
  startParams = JSON.parse(sessionStorage.getItem("startParams") || "{}");

  if (!sessionToken) {
    const paramsFromURL = getStartParamsFromURL();
    startParams = paramsFromURL;
    const started = await startSession(paramsFromURL);
    return started; // true if a new session was created now
  }
  return false; // an existing session was found
}




/* Old function replace
function showInitialMessage() {
    // Check if the intro message has already been shown
    const introShown = localStorage.getItem("introShown");

    if (!introShown) {
        const initialMessage = "Hi, I’m McAllister, your copilot and guide through the Data Science, Applied AI and Organizational Leadership program at DeGroote.";
        addMessageToChat("Bot", initialMessage, "bot-message");
        localStorage.setItem("introShown", true);  // Set the flag to prevent future repeats
    }
}

*/

function showInitialMessage() {
  const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
  if (chatData.length === 0) {
    const initialMessage =
      sessionStorage.getItem("initialMessage") ||
      (startParams && startParams.initialMessage) ||
      "Hi, I’m McAllister, your copilot and guide through the Data Science, Applied AI and Organizational Leadership program at DeGroote.";
    addMessageToChat("Bot", initialMessage, "bot-message");
  }
}



// Helper function to create message elements (user or bot)
function createMessageElement(message, className) {
    const messageContainer = document.createElement("div");

    if (className === "bot-message") {
        // Create a container to hold the icon and message
        messageContainer.classList.add("bot-message-container");

        // Create the bot icon
        const iconElement = document.createElement("img");
        iconElement.src = "images/bot-icon.png";  // Path to the bot icon
        iconElement.classList.add("bot-icon");

        // Create the message element
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message", className);
        const formattedMessage = marked.parse(message);
        messageElement.innerHTML = formattedMessage;

        // Append the icon and message to the container
        messageContainer.appendChild(iconElement);
        messageContainer.appendChild(messageElement);
    } else {
        // Create a standard user message
        messageContainer.classList.add("chat-message", className);
        const formattedMessage = marked.parse(message);
        messageContainer.innerHTML = formattedMessage;
    }

    return messageContainer;
}

function scrollChatToBottom() {
  const el = document.getElementById("chat-history");
  if (el) el.scrollTop = el.scrollHeight;
}

// before: function sendMessage() { ... }
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (message === "") return;

  if (!sessionToken) {
    await loadSession();
    if (!sessionToken) {
    console.error("No session token; cannot send.");
    addMessageToChat("Bot", "Couldn’t start a session. Please reload.", "bot-message");
    return;
    }
  }

  addMessageToChat("You", message, "user-message");

  try {
    const res = await fetch("https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": sessionToken, // server accepts raw token or Bearer
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    addMessageToChat("Bot", data.response, "bot-message");
  } catch (err) {
    console.error(err);
    addMessageToChat("Bot", "Sorry, there was an error. Please try again.", "bot-message");
  }

  input.value = "";
  scrollChatToBottom();
}


// Function to add a message to the chat, whether user or bot
function addMessageToChat(sender, message, className) {
    const chatHistory = document.getElementById("chat-history");
    const messageContainer = createMessageElement(message, className);
    chatHistory.appendChild(messageContainer);
    scrollChatToBottom();

    // Save message to local storage
    saveChatHistory(message, className);
}

function clearChat() {
    localStorage.removeItem("chatHistory");
    document.getElementById("chat-history").innerHTML = "";

    // Start a brand-new session with the same params (or URL params if none stored)
    sessionStorage.removeItem("sessionToken");
    const params = (startParams && Object.keys(startParams).length)
        ? startParams
        : getStartParamsFromURL();

    startSession(params).then(() => {
        showInitialMessage();  // Show the introductory message again
    });
}

// Save the message history without "Bot" or "You" labels
function saveChatHistory(message, className) {
    const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatData.push({ message, className });
    localStorage.setItem("chatHistory", JSON.stringify(chatData));
}

// Load the chat history from local storage
function loadChatHistory() {
    const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatData.forEach(chat => {
        const { message, className } = chat;
        const chatHistory = document.getElementById("chat-history");
        const messageContainer = createMessageElement(message, className);
        chatHistory.appendChild(messageContainer);
    });
    scrollChatToBottom();
}

/*
// Toggle the sidebar visibility
document.getElementById("open-sidebar-btn").addEventListener("click", function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
});

// New Chat button functionality
document.getElementById("new-chat-btn").addEventListener("click", function () {
    clearChat();
    showInitialMessage();  // Show the introductory message again
    document.getElementById("sidebar").style.width = "0";  // Close the sidebar
});
*/

// --- Sidebar controls (left, small, embed-friendly) ---
const SIDEBAR_WIDTH = 200; // px — tweak as you like

const sidebarEl = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("open-sidebar-btn");
const newChatBtn = document.getElementById("new-chat-btn");

function openSidebar() {
  if (!sidebarEl) return;
  sidebarEl.style.width = `${SIDEBAR_WIDTH}px`;
  openSidebarBtn?.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  if (!sidebarEl) return;
  sidebarEl.style.width = "0";
  openSidebarBtn?.setAttribute("aria-expanded", "false");
}

function isSidebarOpen() {
  if (!sidebarEl) return false;
  return parseInt(getComputedStyle(sidebarEl).width, 10) > 0;
}

// Toggle on hamburger
openSidebarBtn?.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent immediate outside-click close
  isSidebarOpen() ? closeSidebar() : openSidebar();
});

// Esc to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isSidebarOpen()) closeSidebar();
});

// Click outside to close
document.addEventListener("click", (e) => {
  if (!isSidebarOpen()) return;
  const clickInsideSidebar = sidebarEl.contains(e.target);
  const clickOnToggle = openSidebarBtn.contains(e.target);
  if (!clickInsideSidebar && !clickOnToggle) closeSidebar();
});

// Close after starting a new chat
newChatBtn?.addEventListener("click", () => {
  // If you have your own clearChat/showInitialMessage functions, keep them:
  try {
    if (typeof clearChat === "function") clearChat();
    if (typeof showInitialMessage === "function") showInitialMessage();
  } catch (_) {}
  closeSidebar();
});

// before: window.onload = () => { ... }
window.onload = async () => {
  const newSession = await loadSession();
  if (newSession) localStorage.removeItem("chatHistory");

  try { loadChatHistory(); } catch (e) { console.error("loadChatHistory failed:", e); }
  showInitialMessage();

  document.getElementById("send-btn").addEventListener("click", sendMessage);
  document.getElementById("chat-input").addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

  document.getElementById("open-sidebar-btn").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
  });

  document.getElementById("new-chat-btn").addEventListener("click", () => {
    clearChat();
    showInitialMessage();
    document.getElementById("sidebar").style.width = "0";
  });
};



