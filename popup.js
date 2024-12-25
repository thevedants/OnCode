// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze');
    const codeInput = document.getElementById('code-input');
    const resultDiv = document.getElementById('result');

    analyzeButton.addEventListener('click', async () => {
        const code = codeInput.value;
        if (!code.trim()) {
            resultDiv.textContent = 'Please enter some code first.';
            return;
        }

        try {
            resultDiv.textContent = 'Analyzing code...';
            // Your code analysis logic here
        } catch (error) {
            resultDiv.textContent = 'Error analyzing code. Please try again.';
            console.error('Error:', error);
        }
    });
});