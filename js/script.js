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

function loadSession() {
    sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) {
        startSession();
    }
}

function showInitialMessage() {
    const initialMessage = "Hi, I'm your data, AI, and strategic leadership chatbot. How can I help you?";
    addMessageToChat("Bot", initialMessage, "bot-message");
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
    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", className);
    const formattedMessage = marked.parse(message);
    messageElement.innerHTML = `${sender}: ${formattedMessage}`;
    chatHistory.appendChild(messageElement);
    scrollChatToBottom();
}

window.onload = () => {
    loadSession();
    showInitialMessage();
};