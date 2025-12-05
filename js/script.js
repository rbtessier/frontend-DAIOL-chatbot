let sessionToken = null;
let startParams = null;

// Font size management
const DEFAULT_FONT_SIZE = 100; // percentage
const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;
const FONT_SIZE_STEP = 10;

function getFontSize() {
  const stored = localStorage.getItem("chatFontSize");
  return stored ? parseInt(stored, 10) : DEFAULT_FONT_SIZE;
}

function setFontSize(size) {
  // Clamp between min and max
  const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
  localStorage.setItem("chatFontSize", clampedSize);
  
  // Apply to chat history
  const chatHistory = document.getElementById("chat-history");
  if (chatHistory) {
    chatHistory.style.fontSize = clampedSize + "%";
  }
  
  // Update button states
  updateFontSizeButtons();
}

function updateFontSizeButtons() {
  const currentSize = getFontSize();
  const decreaseBtn = document.getElementById("decrease-font-btn");
  const increaseBtn = document.getElementById("increase-font-btn");
  const resetBtn = document.getElementById("reset-font-btn");
  
  if (decreaseBtn) {
    decreaseBtn.disabled = currentSize <= MIN_FONT_SIZE;
  }
  if (increaseBtn) {
    increaseBtn.disabled = currentSize >= MAX_FONT_SIZE;
  }
  if (resetBtn) {
    resetBtn.style.opacity = currentSize === DEFAULT_FONT_SIZE ? "0.5" : "1";
  }
}

function initializeFontSize() {
  const size = getFontSize();
  const chatHistory = document.getElementById("chat-history");
  if (chatHistory) {
    chatHistory.style.fontSize = size + "%";
  }
  updateFontSizeButtons();
}

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
      "Hi, I'm McAllister, your copilot and guide through the Data Science, Applied AI and Organizational Leadership program at DeGroote.";
    addMessageToChat("Bot", initialMessage, "bot-message");
    
    // Only show starter prompts if there's no custom initialMessage from parameters
    const hasCustomInitialMessage = 
      sessionStorage.getItem("initialMessage") || 
      (startParams && startParams.initialMessage);
    
    if (!hasCustomInitialMessage) {
      showStarterPrompts();
    }
  }
}

// Show starter prompts for new users
function showStarterPrompts() {
  const chatHistory = document.getElementById("chat-history");
  const starterPromptsContainer = document.createElement("div");
  starterPromptsContainer.className = "starter-prompts";
  starterPromptsContainer.id = "starter-prompts";
  
  const title = document.createElement("div");
  title.className = "starter-prompts-title";
  title.textContent = "Try asking me about:";
  starterPromptsContainer.appendChild(title);
  
  const prompts = [
    "What is organizational leadership?",
    "How can AI improve business strategy?",
    "Explain data-driven decision making",
    "What are key leadership skills for the AI era?"
  ];
  
  prompts.forEach(promptText => {
    const promptBtn = document.createElement("button");
    promptBtn.className = "starter-prompt-btn";
    promptBtn.textContent = promptText;
    promptBtn.onclick = () => {
      document.getElementById("chat-input").value = promptText;
      removeStarterPrompts();
      sendMessage();
    };
    starterPromptsContainer.appendChild(promptBtn);
  });
  
  chatHistory.appendChild(starterPromptsContainer);
  scrollChatToBottom();
}

function removeStarterPrompts() {
  const starterPrompts = document.getElementById("starter-prompts");
  if (starterPrompts) {
    starterPrompts.remove();
  }
}


// Helper function to enhance code blocks with copy buttons
function enhanceCodeBlocks(container) {
  const codeBlocks = container.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    // Apply syntax highlighting
    if (typeof hljs !== 'undefined') {
      hljs.highlightElement(block);
    }
    
    // Add copy button
    const pre = block.parentElement;
    if (!pre.querySelector('.copy-btn')) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerHTML = '📋 Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(block.textContent).then(() => {
          copyBtn.innerHTML = '✓ Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '📋 Copy';
          }, 2000);
        });
      };
      pre.style.position = 'relative';
      pre.appendChild(copyBtn);
    }
  });
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
        
        // Enhance code blocks with syntax highlighting and copy buttons
        enhanceCodeBlocks(messageElement);

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

// Typing indicator functions
function showTypingIndicator() {
  const chatHistory = document.getElementById("chat-history");
  
  // Create typing indicator container
  const typingContainer = document.createElement("div");
  typingContainer.classList.add("bot-message-container", "typing-indicator-container");
  typingContainer.id = "typing-indicator";
  
  // Bot icon
  const iconElement = document.createElement("img");
  iconElement.src = "images/bot-icon.png";
  iconElement.classList.add("bot-icon");
  
  // Typing message
  const typingElement = document.createElement("div");
  typingElement.classList.add("chat-message", "bot-message", "typing-indicator");
  typingElement.innerHTML = "McAllister is typing<span class='typing-dots'><span>.</span><span>.</span><span>.</span></span>";
  
  typingContainer.appendChild(iconElement);
  typingContainer.appendChild(typingElement);
  chatHistory.appendChild(typingContainer);
  
  scrollChatToBottom();
}

function hideTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

// before: function sendMessage() { ... }
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (message === "") return;
  
  // Remove starter prompts on first message
  removeStarterPrompts();

  if (!sessionToken) {
    await loadSession();
    if (!sessionToken) {
    console.error("No session token; cannot send.");
    addMessageToChat("Bot", "Couldn’t start a session. Please reload.", "bot-message");
    return;
    }
  }

  // IMMEDIATE FEEDBACK: Clear input and add user message right away
  addMessageToChat("You", message, "user-message");
  input.value = "";
  scrollChatToBottom();

  // SHOW TYPING INDICATOR
  showTypingIndicator();

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
    
    // HIDE TYPING INDICATOR
    hideTypingIndicator();
    
    addMessageToChat("Bot", data.response, "bot-message");
  } catch (err) {
    console.error(err);
    
    // HIDE TYPING INDICATOR on error too
    hideTypingIndicator();
    
    addMessageToChat("Bot", "Sorry, there was an error. Please try again.", "bot-message");
  }

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
  // Initialize font size
  initializeFontSize();
  
  const newSession = await loadSession();
  if (newSession) localStorage.removeItem("chatHistory");

  try { loadChatHistory(); } catch (e) { console.error("loadChatHistory failed:", e); }
  showInitialMessage();

  document.getElementById("send-btn").addEventListener("click", sendMessage);
  document.getElementById("chat-input").addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });
  
  // New Chat button in main UI
  document.getElementById("new-chat-main-btn")?.addEventListener("click", () => {
    clearChat();
    showInitialMessage();
  });
  
  // Font size control listeners
  document.getElementById("decrease-font-btn")?.addEventListener("click", () => {
    const currentSize = getFontSize();
    setFontSize(currentSize - FONT_SIZE_STEP);
  });
  
  document.getElementById("increase-font-btn")?.addEventListener("click", () => {
    const currentSize = getFontSize();
    setFontSize(currentSize + FONT_SIZE_STEP);
  });
  
  document.getElementById("reset-font-btn")?.addEventListener("click", () => {
    setFontSize(DEFAULT_FONT_SIZE);
  });
/*
  document.getElementById("open-sidebar-btn").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
  });

  document.getElementById("new-chat-btn").addEventListener("click", () => {
    clearChat();
    showInitialMessage();
    document.getElementById("sidebar").style.width = "0";
  });
  */
};



