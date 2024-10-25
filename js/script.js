let sessionToken = null;

function startSession() {
    fetch("https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net/api/start")
    .then(response => response.json())
    .then(data => {
        sessionToken = data.token;
        // Store session token in sessionStorage for this browser session
        sessionStorage.setItem("sessionToken", sessionToken);
    })
    .catch(error => console.error("Failed to start session:", error));
}

function scrollChatToBottom() {
    const chatHistory = document.getElementById("chat-history");
    chatHistory.scrollTop = chatHistory.scrollHeight;
}


function loadSession() {
    // Check sessionStorage to determine if there's already a session for this page session
    sessionToken = sessionStorage.getItem("sessionToken");
    if (!sessionToken) {
        // No session exists, meaning it's a new browser session, so we start a new one
        startSession();
    }
}

function showInitialMessage() {
    // Check if the intro message has already been shown
    const introShown = localStorage.getItem("introShown");

    if (!introShown) {
        const initialMessage = "Hi, I’m McAllister, your copilot and guide through the Data Science, Applied AI and Organizational Leadership program at DeGroote.";
        addMessageToChat("Bot", initialMessage, "bot-message");
        localStorage.setItem("introShown", true);  // Set the flag to prevent future repeats
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
            "Authorization": sessionToken,
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
    startSession();
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

window.onload = () => {
    loadSession();

    // Check if a new session started. If so, clear chat history
    if (!sessionStorage.getItem("sessionToken")) {
        localStorage.removeItem("chatHistory");
    }

    loadChatHistory();
    showInitialMessage();
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    document.getElementById("chat-input").addEventListener("keydown", function (e) {
        if (e.key === "Enter") sendMessage();
    });
    //document.getElementById("new-chat-btn").addEventListener("click", clearChat);
};