// Save settings to chrome.storage
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);

function saveOptions() {
    const username = document.getElementById('username').value;
    const apiKey = document.getElementById('apiKey').value;
    const systemPrompt = document.getElementById('systemPrompt').value;
    const resumeText = document.getElementById('resumeText').value;
    const status = document.getElementById('status');

    const dataToSave = {
        username,
        apiKey,
        systemPrompt,
        resumeText
    };

    chrome.storage.local.set(dataToSave, () => {
        status.textContent = 'Settings saved successfully!';
        status.className = 'status-message status-success';
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status-message';
        }, 2000);
    });
}

function restoreOptions() {
    chrome.storage.local.get(['username', 'apiKey', 'systemPrompt', 'resumeText'], (items) => {
        document.getElementById('username').value = items.username || '';
        document.getElementById('apiKey').value = items.apiKey || '';
        document.getElementById('systemPrompt').value = items.systemPrompt || '';
        document.getElementById('resumeText').value = items.resumeText || '';
    });
}
