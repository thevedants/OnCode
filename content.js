// Helper function to get problem ID from URL
function getProblemId() {
    const match = window.location.pathname.match(/problem\/(\d+[A-Z]\d*)/i);
    return match ? match[1] : 'unknown';
}

function displayConversation(history) {
    const conversationDiv = document.getElementById('conversation-history');
    conversationDiv.innerHTML = history
        .filter(msg => msg.role !== 'system') // Filter out system messages
        .map(msg => `
            <div class="message ${msg.role} ${msg.role === 'assistant' ? 'assistant-message' : 'user-message'}">
                <strong>${msg.role === 'assistant' ? 'Assistant' : 'You'}:</strong>
                <p>${msg.content}</p>
            </div>
        `).join('');
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
}

async function loadConversation() {
    try {
        const problemId = getProblemId();
        const response = await fetch(`http://127.0.0.1:8000/conversation/${problemId}`);
        const data = await response.json();
        displayConversation(data.conversation_history);
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

async function sendMessage() {
    const code = document.getElementById('code-input').value;
    const message = document.getElementById('message-input').value;
    const resultDiv = document.getElementById('conversation-history');
    
    if (!message.trim()) {
        resultDiv.innerHTML += `<p class="error">Please enter a message</p>`;
        return;
    }
    
    try {
        const problemId = getProblemId();
        const problemStatement = document.querySelector('.problem-statement');
        const sampleTests = document.querySelector('.sample-tests');
        
        const problemData = {
            statement: problemStatement?.querySelector('.header')?.textContent || '',
            inputSpec: problemStatement?.querySelector('.input-specification')?.textContent || '',
            outputSpec: problemStatement?.querySelector('.output-specification')?.textContent || '',
            sampleTests: {
                inputs: Array.from(sampleTests?.querySelectorAll('.input pre') || []).map(pre => pre.textContent),
                outputs: Array.from(sampleTests?.querySelectorAll('.output pre') || []).map(pre => pre.textContent)
            }
        };

        const response = await fetch('http://127.0.0.1:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                code,
                message,
                problem_id: problemId,
                problem_data: problemData
            })
        });

        const data = await response.json();
        displayConversation(data.conversation_history);
        
        // Clear message input but keep code
        document.getElementById('message-input').value = '';
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML += `<p class="error">Error: ${error.message}</p>`;
    }
}

function createHelperPanel() {
    try {
        const existingPanel = document.getElementById('cf-helper-panel');
        if (existingPanel) {
            existingPanel.classList.remove('hidden'); // Show panel if it exists
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'cf-helper-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>OnCode</h3>
                <button id="close-panel">×</button>
            </div>
            <div class="panel-content">
                <textarea id="code-input" placeholder="Paste your code here..."></textarea>
                <textarea id="message-input" placeholder="Ask a question..." class="message-input"></textarea>
                <button id="analyze-btn">Send</button>
                <div id="conversation-history"></div>
            </div>
        `;
        document.body.appendChild(panel);

        // Add styles for better scrolling and auto-expanding textarea
        const style = document.createElement('style');
        style.textContent = `
            #conversation-history {
                max-height: 300px;
                overflow-y: auto;
                padding: 10px;
                margin-top: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            
            .message {
                margin-bottom: 10px;
                padding: 8px;
                border-radius: 4px;
            }
            
            .assistant-message {
                background-color: #f5f5f5;
            }
            
            .user-message {
                background-color: #e3f2fd;
            }
            
            #cf-helper-panel {
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .message p {
                white-space: pre-wrap;
                margin: 5px 0;
            }

            #message-input {
                width: 100%;
                min-height: 50px;
                max-height: 150px;
                padding: 8px;
                margin-bottom: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                resize: none;
                overflow-y: hidden;
            }
        `;
        document.head.appendChild(style);

        // Auto-expand textarea as user types
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        document.getElementById('close-panel').onclick = () => {
            panel.classList.add('hidden');
        };
        
        document.getElementById('analyze-btn').onclick = sendMessage;
        
        // Add enter key support for the message input (Ctrl/Cmd + Enter to send)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Load existing conversation
        loadConversation();
        
    } 
    
    catch (error) {
        console.error('Error creating panel:', error);
    }
}

// Create panel when content script loads AND listen for visibility changes
createHelperPanel();
window.addEventListener('load', createHelperPanel);