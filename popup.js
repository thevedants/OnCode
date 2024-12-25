document.addEventListener('DOMContentLoaded', async () => {
    // Load saved settings
    const settings = await chrome.storage.local.get(['backendUrl', 'apiKey', 'autoAnalyze']);
    
    document.getElementById('backend-url').value = settings.backendUrl || 'http://localhost:8000';
    document.getElementById('api-key').value = settings.apiKey || '';
    document.getElementById('auto-analyze').checked = settings.autoAnalyze || false;
    
    // Save settings
    document.getElementById('save-settings').addEventListener('click', async () => {
      const backendUrl = document.getElementById('backend-url').value.trim();
      const apiKey = document.getElementById('api-key').value.trim();
      const autoAnalyze = document.getElementById('auto-analyze').checked;
      
      await chrome.storage.local.set({
        backendUrl,
        apiKey,
        autoAnalyze
      });
      
      // Show success message
      const message = document.createElement('div');
      message.className = 'success-message';
      message.textContent = 'Settings saved successfully!';
      document.body.appendChild(message);
      
      setTimeout(() => {
        message.remove();
      }, 2000);
    });
  });