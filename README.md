# OnCode

OnCode is a browser extension that enhances competitive programming platforms by providing AI-powered analysis and assistance. Currently supports LeetCode, Codeforces, CodeChef and AtCoder.

## Features

- 🤖 AI-powered code analysis and suggestions
- 💬 Interactive chat interface for problem-specific discussions
- 💾 Automatic code extraction from platform's built-in IDE
- 📝 Persistent conversation history for each problem
- ⚡ Real-time responses

## Supported Platforms

- Leetcode
- Codeforces
- CodeChef
- AtCoder


## Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/OnCode.git
```
2. Set up the backend
```bash
cd backend
pip install -r requirements.txt
```
3. Create a .env file in the backend directory and add your Mistral API Key
```python
MISTRAL_API_KEY="your_api_key_here"
```
4. Start the backend server
```bash
uvicorn main:app --reload
```
5. Load the extension in Chrome
  - Open Chrome and go to `chrome://extensions/`
  - Enable "Developer mode"
  - Click "Load unpacked"
  - Select the extension directory

## Usage
1. Navigate to any supported competitive programming problem
2. Click the OnCode extension icon
3. The assistant panel will appear on the right side of the page
4. Paste your code or use the "Use IDE Code" button
5. Ask questions about the problem or request code analysis
6. Use Ctrl/Cmd + Enter to quickly send messages

## Tech Stack
- Frontend: Vanilla JavaScript, Chrome Extension API
- Backend: FastAPI, Python  
- AI: Mistral AI
- Storage: In-memory conversation history (per problem)

## Contributing
Feel free to open issues or submit pull requests. Some areas for contribution:
- Adding support for more platforms
- Implementing persistent storage for conversations 
- Improving code analysis capabilities
- Enhancing the UI/UX

## License
MIT License
