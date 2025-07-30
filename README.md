# JARVIS - AI Chat Interface

This project is a web-based chat interface for a "JARVIS" (Just A Rather Very Intelligent System) AI assistant, inspired by the one from Iron Man. It uses the Google Gemini API to provide intelligent and conversational responses, as well as for text-to-speech synthesis.

## Features

- **Conversational AI:** Chat with a JARVIS-like AI that is witty, sophisticated, and helpful.
- **Voice Commands:** Use your microphone to speak commands directly to JARVIS.
- **Password Protected:** The interface is protected by a password ('ironman').
- **Responsive Design:** The interface is designed to work on different screen sizes.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/jarvis-interface.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd jarvis-interface
    ```
3.  **Configure the API Key:**
    - Open the `index.html` file.
    - Find the line `const apiKey = "YOUR_API_KEY_HERE";`
    - Replace `"YOUR_API_KEY_HERE"` with your own Google Gemini API key.
4.  **Open the interface:**
    - Open the `index.html` file in your web browser.

## Usage

1.  **Enter the password:**
    - When you first open the page, you will be prompted for a password.
    - The password is `ironman`.
2.  **Chat with JARVIS:**
    - Once you've entered the correct password, you can start chatting with JARVIS.
    - You can either type your messages or use the microphone button to speak your commands.

## Technologies Used

-   **HTML**
-   **Tailwind CSS**
-   **Google Gemini API** (for text generation and text-to-speech)
