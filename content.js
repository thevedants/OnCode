function getProblemId() {
    const url = window.location.pathname;
    const host = window.location.hostname;

    if (host.includes('codechef.com')) {
        const match = url.match(/problems\/([A-Z0-9]+)/i);
        return match ? match[1] : 'unknown';
    } else {
        // Original Codeforces logic
        const match = url.match(/problem\/(\d+[A-Z]\d*)/i);
        return match ? match[1] : 'unknown';
    }
}

function getCodeFromCodeChefIDE() {
    try {
        // Use a more specific selector to get just the visible text layer
        const textLayer = document.querySelector('#submit-ide-v2 .ace_layer.ace_text-layer');
        if (!textLayer) return '';

        // Get only the unique lines by using the line numbers
        const lineElements = Array.from(textLayer.querySelectorAll('.ace_line'));
        const code = lineElements
            .map(line => line.textContent)
            .join('\n');
            
        return code;
    } catch (error) {
        console.error('Error getting code from CodeChef IDE:', error);
        return '';
    }
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

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant-message loading';
    loadingDiv.innerHTML = `
        <strong>Assistant:</strong>
        <p>Thinking...</p>
        <div class="loading-dots">
            <span>.</span><span>.</span><span>.</span>
        </div>
    `;
    resultDiv.appendChild(loadingDiv);
    resultDiv.scrollTop = resultDiv.scrollHeight;
    
    try {
        const problemId = getProblemId();
        const host = window.location.hostname;
        let problemData;

        if (host.includes('codechef.com')) {
            const problemStatement = document.querySelector('#problem-statement');
            const getContentAfterHeading = (headingText) => {
                const headings = Array.from(problemStatement?.querySelectorAll('h3') || []);
                const heading = headings.find(h3 => h3.textContent.includes(headingText));
                return heading?.nextElementSibling?.textContent || '';
            };
        
            problemData = {
                statement: problemStatement?.querySelector('h3')?.textContent || '',
                inputSpec: getContentAfterHeading('Input Format'),
                outputSpec: getContentAfterHeading('Output Format'),
                sampleTests: {
                    inputs: Array.from(problemStatement.querySelectorAll('._values__container_x0ehp_226 ._values_x0ehp_226:first-child pre') || [])
                        .map(pre => pre.textContent),
                    outputs: Array.from(problemStatement.querySelectorAll('._values__container_x0ehp_226 ._values_x0ehp_226:last-child pre') || [])
                        .map(pre => pre.textContent)
                }
            };
        } else {
            // Your existing Codeforces code
            const problemStatement = document.querySelector('.problem-statement');
            const sampleTests = document.querySelector('.sample-tests');
            problemData = {
                statement: problemStatement?.querySelector('.header')?.textContent || '',
                inputSpec: problemStatement?.querySelector('.input-specification')?.textContent || '',
                outputSpec: problemStatement?.querySelector('.output-specification')?.textContent || '',
                sampleTests: {
                    inputs: Array.from(sampleTests?.querySelectorAll('.input pre') || []).map(pre => pre.textContent),
                    outputs: Array.from(sampleTests?.querySelectorAll('.output pre') || []).map(pre => pre.textContent)
                }
            };
        }

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
        loadingDiv.remove();
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
            ${window.location.hostname.includes('codechef.com') ? 
                '<button id="use-ide-code" class="secondary-btn">Use IDE Code</button>' : 
                ''}
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
                .loading-dots {
        display: inline-block;
    }
    
    .loading-dots span {
        animation: dots 1.5s infinite;
        opacity: 0;
        margin-left: 2px;
    }
    
    .loading-dots span:nth-child(2) {
        animation-delay: 0.5s;
    }
    
    .loading-dots span:nth-child(3) {
        animation-delay: 1s;
    }
    
    @keyframes dots {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
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
                        .secondary-btn {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .secondary-btn:hover {
            background: #5a6268;
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
        
        if (window.location.hostname.includes('codechef.com')) {
            document.getElementById('use-ide-code').onclick = () => {
                const code = getCodeFromCodeChefIDE();
                if (code) {
                    document.getElementById('code-input').value = code;
                } else {
                    alert('Could not fetch code from IDE. Please make sure you have some code in the editor.');
                }
            };
        }
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