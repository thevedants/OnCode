chrome.runtime.onInstalled.addListener(() => {
    // Initialize extension settings
    chrome.storage.local.set({
      apiKey: '',
      settings: {
        autoAnalyze: true,
        showHints: true,
        showEdgeCases: true
      }
    });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_CODE') {
      // Handle code analysis request
      analyzeCode(request.code, request.problemData)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Will respond asynchronously
    }
  });