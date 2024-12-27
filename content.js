// Helper function to get platform-specific selectors
const PLATFORM_CONFIG = {
    codeforces: {
        matchURL: (host) => host.includes('codeforces.com'),
        problemIdRegex: /problem\/(\d+[A-Z]\d*)/i,
        selectors: {
            statement: '.problem-statement',
            header: '.header',
            inputSpec: '.input-specification',
            outputSpec: '.output-specification',
            samples: {
                container: '.sample-tests',
                input: '.input pre',
                output: '.output pre'
            }
        }
    },
    codechef: {
        matchURL: (host) => host.includes('codechef.com'),
        problemIdRegex: /problems\/([A-Z0-9]+)/i,
        selectors: {
            statement: '#problem-statement',
            header: 'h3',
            samples: {
                input: '._values__container_x0ehp_226 ._values_x0ehp_226:first-child pre',
                output: '._values__container_x0ehp_226 ._values_x0ehp_226:last-child pre'
            },
            editor: '#submit-ide-v2 .ace_layer.ace_text-layer .ace_line'
        }
    },
    atcoder: {
        matchURL: (host) => host.includes('atcoder.jp'),
        problemIdRegex: /tasks\/([a-z0-9_]+)/i,
        selectors: {
            statement: '#task-statement',
            header: 'div.h2',
            problem: 'section',
            editor: '#editor .ace_layer.ace_text-layer .ace_line'
        }
    },
    leetcode: {
        matchURL: (host) => host.includes('leetcode.com'),
        problemIdRegex: /(problems|explore)\/([^/]+)/i,
        selectors: {
            statement: '[data-track-load="description_content"]',
            samples: {
                container: '.example-testcases'
            },
            editor: '.monaco-editor .view-lines .view-line'
        }
    }
};

function getCurrentPlatform() {
    const host = window.location.hostname;
    return Object.keys(PLATFORM_CONFIG).find(platform => 
        PLATFORM_CONFIG[platform].matchURL(host)
    );
}

function getProblemId() {
    const platform = getCurrentPlatform();
    if (!platform) return 'unknown';

    const match = window.location.pathname.match(PLATFORM_CONFIG[platform].problemIdRegex);
    
    // Special handling for LeetCode
    if (platform === 'leetcode') {
        return match ? match[2] : 'unknown';  // Use second capture group for LeetCode
    }
    
    // Default handling for other platforms
    return match ? match[1] : 'unknown';
}

function getCodeFromIDE() {
    const platform = getCurrentPlatform();
    if (!platform) return '';

    try {
        const selector = PLATFORM_CONFIG[platform].selectors.editor;
        const lines = document.querySelectorAll(selector);
        if (!lines.length) return '';

        return Array.from(lines)
            .map(line => line.textContent)
            .join('\n');
    } catch (error) {
        console.error(`Error getting code from ${platform} IDE:`, error);
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
        const platform = getCurrentPlatform();
        const problemId = getProblemId();
        let problemData;

        const config = PLATFORM_CONFIG[platform];
        const base = document.querySelector(config.selectors.statement);
        
        if (base) {
            switch(platform) {
                case 'codeforces': {
                    problemData = {
                        statement: base?.querySelector(config.selectors.header)?.textContent || '',
                        inputSpec: base?.querySelector(config.selectors.inputSpec)?.textContent || '',
                        outputSpec: base?.querySelector(config.selectors.outputSpec)?.textContent || '',
                        sampleTests: {
                            inputs: Array.from(document.querySelectorAll(`${config.selectors.samples.container} ${config.selectors.samples.input}`))
                                .map(pre => pre.textContent),
                            outputs: Array.from(document.querySelectorAll(`${config.selectors.samples.container} ${config.selectors.samples.output}`))
                                .map(pre => pre.textContent)
                        }
                    };
                    break;
                }
                case 'codechef': {
                    const findSectionContent = (headingText) => {
                        const headings = Array.from(base.querySelectorAll('h3'));
                        const heading = headings.find(h3 => h3.textContent.includes(headingText));
                        return heading?.nextElementSibling?.textContent || '';
                    };

                    problemData = {
                        statement: base.querySelector(config.selectors.header)?.textContent || '',
                        inputSpec: findSectionContent('Input Format'),
                        outputSpec: findSectionContent('Output Format'),
                        sampleTests: {
                            inputs: Array.from(base.querySelectorAll(config.selectors.samples.input))
                                .map(pre => pre.textContent),
                            outputs: Array.from(base.querySelectorAll(config.selectors.samples.output))
                                .map(pre => pre.textContent)
                        }
                    };
                    break;
                }
                case 'atcoder': {
                    const statement = base;
                    const sections = Array.from(statement?.querySelectorAll('section') || []);
                    let inputSpec = '', outputSpec = '';
                    
                    // Find input/output sections
                    for (const section of sections) {
                        const title = section.querySelector('h3')?.textContent || '';
                        if (title.includes('Input')) {
                            inputSpec = section.textContent.replace(title, '').trim();
                        } else if (title.includes('Output')) {
                            outputSpec = section.textContent.replace(title, '').trim();
                        }
                    }
                
                    // Get all h3s and find adjacent pre elements for samples
                    const h3Elements = Array.from(statement?.querySelectorAll('h3') || []);
                    const sampleInputs = [];
                    const sampleOutputs = [];
                
                    h3Elements.forEach(h3 => {
                        const text = h3.textContent;
                        const nextPre = h3.nextElementSibling;
                        if (text.includes('Sample Input') && nextPre?.tagName === 'PRE') {
                            sampleInputs.push(nextPre.textContent);
                        } else if (text.includes('Sample Output') && nextPre?.tagName === 'PRE') {
                            sampleOutputs.push(nextPre.textContent);
                        }
                    });
                
                    problemData = {
                        statement: statement?.querySelector('div.h2')?.textContent || '',
                        inputSpec: inputSpec,
                        outputSpec: outputSpec,
                        sampleTests: {
                            inputs: sampleInputs,
                            outputs: sampleOutputs
                        }
                    };
                    break;
                }
                case 'leetcode': {
                    const content = base.textContent;
                    problemData = {
                        statement: content,
                        inputSpec: '',
                        outputSpec: '',
                        sampleTests: {
                            inputs: Array.from(document.querySelectorAll(config.selectors.samples.container))
                                .map(example => example.textContent)
                        }
                    };
                    break;
                }
            }
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
        
        document.getElementById('message-input').value = '';
    } catch (error) {
        loadingDiv.remove();
        console.error('Error:', error);
        resultDiv.innerHTML += `<p class="error">Error: ${error.message}</p>`;
    }
}

function createHelperPanel() {
    try {
        const existingPanel = document.getElementById('cf-helper-panel');
        if (existingPanel) {
            existingPanel.classList.remove('hidden');
            return;
        }

        const platform = getCurrentPlatform();
        const buttonLabel = platform ? `Use ${platform.charAt(0).toUpperCase() + platform.slice(1)} IDE Code` : '';

        const panel = document.createElement('div');
        panel.id = 'cf-helper-panel';
        panel.innerHTML = `
        <div class="panel-header">
            <h3>OnCode</h3>
            <button id="close-panel">×</button>
        </div>
        <div class="panel-content">
            <textarea id="code-input" placeholder="Paste your code here..."></textarea>
            ${platform ? `<button id="use-ide-code" class="secondary-btn">${buttonLabel}</button>` : ''}
            <textarea id="message-input" placeholder="Ask a question..." class="message-input"></textarea>
            <button id="analyze-btn">Send</button>
            <div id="conversation-history"></div>
        </div>
    `;
        document.body.appendChild(panel);

        // Your existing styles remain the same
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
            #cf-helper-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 350px;
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 9999;  // Increased z-index
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #333;  // Ensure text is visible
                }

                #cf-helper-panel * {
                    color: inherit;  // Make sure all text inherits color
                }

                .message strong {
                    color: #000;  // Make usernames clearly visible
                }

                .message p {
                    color: #333;  // Ensure message content is visible
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
            #cf-helper-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                max-height: 80vh;
                overflow-y: auto;
            }
            #cf-helper-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;  // Slightly wider for better readability
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 9999;  // Higher z-index to ensure it's above site elements
                max-height: 80vh;
                overflow-y: auto;
            }

            .panel-header {
                padding: 10px;
                background: #f8f9fa;
                border-bottom: 1px solid #eee;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .panel-content {
                padding: 15px;
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
            .error {
                color: #721c24;
                background-color: #f8d7da;
                border-color: #f5c6cb;
                padding: 10px;
                border-radius: 4px;
                margin: 5px 0;
            }

            #conversation-history::-webkit-scrollbar {
                width: 8px;
            }

            #conversation-history::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }

            #conversation-history::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
            }

            #conversation-history::-webkit-scrollbar-thumb:hover {
                background: #555;
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
        
        // Add IDE button handler if on a supported platform
        if (platform && document.getElementById('use-ide-code')) {
            document.getElementById('use-ide-code').onclick = () => {
                const code = getCodeFromIDE();
                if (code) {
                    document.getElementById('code-input').value = code;
                } else {
                    alert(`Could not fetch code from ${platform} IDE. Please make sure you have some code in the editor.`);
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
    } catch (error) {
        console.error('Error creating panel:', error);
    }
}

// Create panel when content script loads AND listen for visibility changes
createHelperPanel();
window.addEventListener('load', createHelperPanel);