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
    // Optimistically store so showInitialMessage can use it immediately
    if (params.initialMessage) {
        sessionStorage.setItem("initialMessage", params.initialMessage);
    }

    return fetch("https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    })
    .then(response => response.json())
    .then(data => {
        sessionToken = data.token;
        sessionStorage.setItem("sessionToken", sessionToken);
        sessionStorage.setItem("startParams", JSON.stringify(params || {}));
        if (data.initialMessage) {
            sessionStorage.setItem("initialMessage", data.initialMessage);
        }
        return true; // new session started
    })
    .catch(error => {
        console.error("Failed to start session:", error);
        return false;
    });
}

async function loadSession() {
    sessionToken = sessionStorage.getItem("sessionToken");
    startParams = JSON.parse(sessionStorage.getItem("startParams") || "{}");

    if (!sessionToken) {
        const paramsFromURL = getStartParamsFromURL();
        startParams = paramsFromURL;
        const started = await startSession(paramsFromURL);
        return started; // true if we created a session now
    }
    return false; // we already had a session
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

function sendMessage() {
    const message = document.getElementById("chat-input").value.trim();
    if (message === "") return;
    addMessageToChat("You", message, "user-message");

    fetch("https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": sessionToken, // switch to `Bearer ${sessionToken}` if your backend changes
        },
        body: JSON.stringify({ message }),
    })
    .then(response => {
        if (!response || !response.ok) {
            throw new Error(`HTTP error! Status: ${response ? response.status : 'Unknown'}`);
        }
        return response.json();
    })
    .then(data => {
        addMessageToChat("Bot", data.response, "bot-message");
    })
    .catch(error => {
        console.error("Error:", error);
        addMessageToChat("Bot", "Sorry, there was an error. Please try again.", "bot-message");
    });

    document.getElementById("chat-input").value = "";
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


window.onload = async () => {
    const newSession = await loadSession();

    // If we truly started a brand-new session this page load, clear history
    if (newSession) {
        localStorage.removeItem("chatHistory");
    }

    loadChatHistory();
    showInitialMessage(); // now sessionStorage.initialMessage is guaranteed to exist (or fall back)

    // Event listeners
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    document.getElementById("chat-input").addEventListener("keydown", function (e) {
        if (e.key === "Enter") sendMessage();
    });

    document.getElementById("open-sidebar-btn").addEventListener("click", function () {
        const sidebar = document.getElementById("sidebar");
        sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
    });

    document.getElementById("new-chat-btn").addEventListener("click", function () {
        clearChat();
        showInitialMessage();
        document.getElementById("sidebar").style.width = "0";
    });
};

