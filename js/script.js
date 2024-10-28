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
    // Show the initial message only if there is no existing chat history
    const chatData = JSON.parse(localStorage.getItem("chatHistory")) || [];
    if (chatData.length === 0) {
        const initialMessage = "Hi, I’m McAllister, your copilot and guide through the Data Science, Applied AI and Organizational Leadership program at DeGroote.";
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



window.onload = () => {
    loadSession();

    // Check if a new session started. If so, clear chat history
    if (!sessionStorage.getItem("sessionToken")) {
        localStorage.removeItem("chatHistory");
    }

    loadChatHistory();
    showInitialMessage();

    // Add event listeners for chat interactions
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    document.getElementById("chat-input").addEventListener("keydown", function (e) {
        if (e.key === "Enter") sendMessage();
    });
    //document.getElementById("new-chat-btn").addEventListener("click", clearChat);

    // Sidebar toggle button listener
    /*
    document.getElementById("open-sidebar-btn").addEventListener("click", function () {
        console.log("Sidebar toggle clicked");  // Temporary log for testing
        const sidebar = document.getElementById("sidebar");
        sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
    });
    

    // New Chat button listener inside the sidebar
    document.getElementById("new-chat-btn").addEventListener("click", function () {
        clearChat();
        showInitialMessage();  // Show the introductory message again
        document.getElementById("sidebar").style.width = "0";  // Close the sidebar
    });
    */
};