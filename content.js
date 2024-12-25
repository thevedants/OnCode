async function analyzeCode() {
    const code = document.getElementById('code-input').value;
    const resultDiv = document.getElementById('analysis-result');
    
    resultDiv.innerHTML = '<p>Analyzing code...</p>';
    
    try {
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

        try {
            await fetch('http://127.0.0.1:8000/');
        } catch (error) {
            throw new Error('Backend server is not running. Please start the server first.');
        }

        const response = await fetch('http://127.0.0.1:8000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'omit',
            mode: 'cors',
            body: JSON.stringify({
                code: code,
                problem_data: problemData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${errorText}`);
        }

        const data = await response.json();
        
        resultDiv.innerHTML = `
            <h4>Suggestions:</h4>
            <ul>
                ${data.suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <h4>Hints:</h4>
            <ul>
                ${data.hints.map(h => `<li>${h}</li>`).join('')}
            </ul>
        `;
    } catch (error) {
        console.error('Error details:', error);
        resultDiv.innerHTML = `
            <p class="error">Error: ${error.message}</p>
            <p class="error">Please check if the backend server is running at http://127.0.0.1:8000</p>
        `;
    }
}

// Add conversation display to panel
function createHelperPanel() {
    try {
        const existingPanel = document.getElementById('cf-helper-panel');
        if (existingPanel) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'cf-helper-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Code Analysis</h3>
                <button id="close-panel">×</button>
            </div>
            <div class="panel-content">
                <textarea id="code-input" placeholder="Paste your code here..."></textarea>
                <input type="text" id="message-input" placeholder="Ask a question..." class="w-full p-2 mb-2 border rounded">
                <button id="analyze-btn">Send</button>
                <div id="conversation-history" class="mt-4 max-h-96 overflow-y-auto"></div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('close-panel').onclick = () => panel.classList.toggle('hidden');
        document.getElementById('analyze-btn').onclick = sendMessage;

        // Load existing conversation
        loadConversation();
    } catch (error) {
        console.error('Error creating panel:', error);
    }
}

async function loadConversation() {
    try {
        const problemId = getProblemId(); // You'll need to implement this
        const response = await fetch(`http://127.0.0.1:8000/conversation/${problemId}`);
        const data = await response.json();
        displayConversation(data.conversation_history);
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

function displayConversation(history) {
    const conversationDiv = document.getElementById('conversation-history');
    conversationDiv.innerHTML = history.map(msg => `
        <div class="message ${msg.role}">
            <strong>${msg.role}:</strong>
            <p>${msg.content}</p>
        </div>
    `).join('');
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
}

async function sendMessage() {
    const code = document.getElementById('code-input').value;
    const message = document.getElementById('message-input').value;
    const resultDiv = document.getElementById('conversation-history');
    
    try {
        const problemId = getProblemId(); // Implement this to get unique problem identifier
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

// Helper function to get problem ID from URL or page
function getProblemId() {
    // Extract problem ID from Codeforces URL or page
    // Example: from https://codeforces.com/problemset/problem/1A
    const match = window.location.pathname.match(/problem\/(\d+[A-Z]\d*)/i);
    return match ? match[1] : 'unknown';
}