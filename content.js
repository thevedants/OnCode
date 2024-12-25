// content.js
async function analyzeCode() {
    const code = document.getElementById('code-input').value;
    const resultDiv = document.getElementById('analysis-result');
    
    resultDiv.innerHTML = '<p>Analyzing code...</p>';
    
    try {
        const problemStatement = document.querySelector('.problem-statement');
        const problemData = {
            statement: problemStatement?.querySelector('.header')?.textContent || '',
            inputSpec: problemStatement?.querySelector('.input-specification')?.textContent || '',
            outputSpec: problemStatement?.querySelector('.output-specification')?.textContent || ''
        };

        // First try to check if the server is running
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
            credentials: 'omit',  // Important: don't send credentials
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

// Add error boundary to the panel creation
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
                <button id="analyze-btn">Analyze</button>
                <div id="analysis-result"></div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('close-panel').onclick = () => panel.classList.toggle('hidden');
        document.getElementById('analyze-btn').onclick = analyzeCode;
    } catch (error) {
        console.error('Error creating panel:', error);
    }
}

// Create panel when content script loads
window.addEventListener('load', createHelperPanel);