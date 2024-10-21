let sessionToken = null;

function startSession() {
    fetch("https://daiol-chatbot-c7c6bhf0cghgdtdj.canadacentral-01.azurewebsites.net/api/start")
    .then(response => response.json())
    .then(data => {
        sessionToken = data.token;
        localStorage.setItem("sessionToken", sessionToken);
    })
    .catch(error => console.error("Failed to start session:", error));
}

function scrollChatToBottom() {
    const chatHistory = document.getElementById("chat-history");
    chatHistory.scrollTop = chatHistory.scrollHeight;
}


function loadSession() {
    sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
        startSession();
    }
}

function showInitialMessage() {
    // Check if the intro message has already been shown
    const introShown = localStorage.getItem("introShown");

    if (!introShown) {
        const initialMessage = "Hi, I'm your data, AI, and strategic leadership chatbot. How can I help you?";
        addMessageToChat("Bot", initialMessage, "bot-message");
        localStorage.setItem("introShown", true);  // Set the flag to prevent future repeats
    }
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

function addMessageToChat(sender, message, className) {
    const chatHistory = document.getElementById("chat-history");
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
        // Standard message for user without icon
        messageContainer.classList.add("chat-message", className);
        const formattedMessage = marked.parse(message);
        messageContainer.innerHTML = formattedMessage;
    }
    
    chatHistory.appendChild(messageContainer);
    scrollChatToBottom();

    // Save message to local storage
    saveChatHistory(sender, message, className);
}



function saveChatHistory(sender, message, className) {
    const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatData.push({ sender, message, className });
    localStorage.setItem("chatHistory", JSON.stringify(chatData));
}

function loadChatHistory() {
    const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatData.forEach(chat => {
        const { sender, message, className } = chat;
        const chatHistory = document.getElementById("chat-history");
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message", className);
        const formattedMessage = marked.parse(message);
        messageElement.innerHTML = `${sender}: ${formattedMessage}`;
        chatHistory.appendChild(messageElement);
    });
    scrollChatToBottom();
}


window.onload = () => {
    loadSession();
    loadChatHistory();
    showInitialMessage();
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    document.getElementById("chat-input").addEventListener("keydown", function (e) {
        if (e.key === "Enter") sendMessage();
    });
};