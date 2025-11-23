document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const openSetupBtn = document.getElementById('openSetup');
    const resultText = document.getElementById('resultText');
    const statusDiv = document.getElementById('status');
    const setupWarning = document.getElementById('setupWarning');
    const showPromptBtn = document.getElementById('showPromptBtn');

    let lastGeneratedPrompt = "";
    let lastGeneratedCoverLetter = "";
    let isShowingPrompt = false;

    // Check setup on load
    chrome.storage.local.get(['apiKey', 'resumeText', 'username'], (items) => {
        if (!items.apiKey || !items.resumeText) {
            setupWarning.classList.remove('hidden');
            generateBtn.disabled = true;
        }
    });

    // Open Options
    openSetupBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Generate Cover Letter
    generateBtn.addEventListener('click', async () => {
        statusDiv.textContent = 'Getting job description...';
        statusDiv.parentElement.classList.add('pulsing'); // Add pulse animation
        generateBtn.disabled = true;
        showPromptBtn.disabled = true;
        generateBtn.classList.add('wiggle'); // Add wiggle animation

        try {
            // 1. Get Job Description from Content Script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error("No active tab found.");
            }

            // Execute script if not already injected (optional safety, but manifest handles it usually)
            // We'll rely on manifest content_scripts for now.

            chrome.tabs.sendMessage(tab.id, { action: "getJobDescription" }, async (response) => {
                if (chrome.runtime.lastError) {
                    statusDiv.textContent = 'Error: Could not connect to page. Try reloading the tab.';
                    console.error(chrome.runtime.lastError);
                    generateBtn.disabled = false;
                    return;
                }

                if (!response || !response.description) {
                    statusDiv.textContent = 'No job description detected. Please navigate to a job post.';
                    generateBtn.disabled = false;
                    return;
                }

                const jobDescription = response.description;
                statusDiv.textContent = 'Generating cover letter...';

                // 2. Call OpenAI API
                try {
                    const { content, fullPrompt } = await generateCoverLetter(jobDescription);

                    lastGeneratedCoverLetter = content;
                    lastGeneratedPrompt = fullPrompt;

                    // Reset view to cover letter
                    isShowingPrompt = false;
                    showPromptBtn.textContent = "Show Prompt";
                    resultText.value = content;

                    statusDiv.textContent = 'Done!';
                    showPromptBtn.disabled = false;
                } catch (err) {
                    statusDiv.textContent = 'Error generating: ' + err.message;
                } finally {
                    generateBtn.disabled = false;
                    statusDiv.parentElement.classList.remove('pulsing');
                    generateBtn.classList.remove('wiggle');
                }
            });

        } catch (err) {
            statusDiv.textContent = 'Error: ' + err.message;
            generateBtn.disabled = false;
            statusDiv.parentElement.classList.remove('pulsing');
            generateBtn.classList.remove('wiggle');
        }
    });

    // Toggle Show Prompt
    showPromptBtn.addEventListener('click', () => {
        if (isShowingPrompt) {
            // Switch back to Cover Letter
            resultText.value = lastGeneratedCoverLetter; // Note: this overwrites manual edits if we don't save them. 
            // Ideally we should track current value, but for simplicity let's just swap.
            // Better UX: Save current edits if we are in "Cover Letter" mode.

            showPromptBtn.textContent = "Show Prompt";
            statusDiv.textContent = "Showing Cover Letter";
        } else {
            // Save current edits before switching
            lastGeneratedCoverLetter = resultText.value;

            // Switch to Prompt
            resultText.value = lastGeneratedPrompt;
            showPromptBtn.textContent = "Show Result";
            statusDiv.textContent = "Showing Prompt used for generation";
        }
        isShowingPrompt = !isShowingPrompt;
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        resultText.select();
        document.execCommand('copy'); // Fallback or use Clipboard API
        // navigator.clipboard.writeText(resultText.value); // Modern way
        statusDiv.textContent = 'Copied to clipboard!';
        setTimeout(() => statusDiv.textContent = '', 2000);
    });

    // Download as .docx
    downloadBtn.addEventListener('click', () => {
        if (typeof chrome.downloads === 'undefined') {
            statusDiv.textContent = "Error: Please RELOAD the extension in chrome://extensions to enable downloads.";
            return;
        }

        chrome.storage.local.get(['username'], (items) => {
            const username = items.username ? items.username.replace(/\s+/g, '_') : 'user';

            if (isShowingPrompt) {
                // Keep prompt as text file
                const filename = 'prompt.txt';
                const content = resultText.value;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                chrome.downloads.download({ url: url, filename: filename, saveAs: true });
            } else {
                // Download Cover Letter as .docx using docx library
                const filename = `${username}_coverletter.docx`;
                const content = resultText.value;

                // Split content into paragraphs
                const paragraphs = content.split('\n').map(line => {
                    return new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: line,
                                font: "Calibri",
                                size: 22, // 11pt
                            }),
                        ],
                        spacing: {
                            after: 0, // No extra spacing after paragraphs to mimic single spacing if desired, or adjust
                        }
                    });
                });

                const doc = new docx.Document({
                    sections: [{
                        properties: {},
                        children: paragraphs,
                    }],
                });

                docx.Packer.toBlob(doc).then(blob => {
                    const url = URL.createObjectURL(blob);
                    chrome.downloads.download({
                        url: url,
                        filename: filename,
                        saveAs: true
                    });
                });
            }
        });
    });

    async function generateCoverLetter(jobDescription) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['apiKey', 'systemPrompt', 'resumeText'], async (items) => {
                if (!items.apiKey) return reject(new Error("No API Key found."));

                let systemPrompt = items.systemPrompt || "You are a helpful assistant writing a professional cover letter.";

                // Inject date and strict output constraints
                const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                systemPrompt += `\n\nToday's date is ${today}.\nCRITICAL INSTRUCTION: Output ONLY the cover letter content. Do not include any introductory text (like "Here is your cover letter") or concluding remarks. Start directly with the header or date.`;
                let resumeText = items.resumeText || "";

                // Sanitize inputs
                resumeText = cleanText(resumeText);
                jobDescription = cleanText(jobDescription);

                // Truncate inputs to avoid token limits (approx 4 chars per token)
                // Target max ~12k tokens total input to be safe for 16k context
                // Reserve ~1k for system prompt + overhead
                // Split remaining: ~4k tokens (16k chars) for resume, ~7k tokens (28k chars) for JD

                const MAX_RESUME_CHARS = 16000;
                const MAX_JD_CHARS = 28000;

                if (resumeText.length > MAX_RESUME_CHARS) {
                    resumeText = resumeText.substring(0, MAX_RESUME_CHARS) + "\n...[Resume Truncated]";
                }

                if (jobDescription.length > MAX_JD_CHARS) {
                    jobDescription = jobDescription.substring(0, MAX_JD_CHARS) + "\n...[Job Description Truncated]";
                }

                const userMessage = `
Here is my resume:
${resumeText}

Here is the job description:
${jobDescription}

Generate a professional cover letter tailored to this job.
        `.trim();

                const fullPrompt = `--- SYSTEM PROMPT ---\n${systemPrompt}\n\n--- USER MESSAGE ---\n${userMessage}`;

                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${items.apiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-3.5-turbo",
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userMessage }
                            ],
                            temperature: 0.7
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || 'API request failed');
                    }

                    const data = await response.json();
                    let content = data.choices[0].message.content;

                    // Sanitize output as well
                    content = cleanText(content);

                    resolve({ content, fullPrompt });

                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    function cleanText(text) {
        if (!text) return "";
        return text
            .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
            .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
            .replace(/[\u2013\u2014]/g, '-') // En-dash, Em-dash
            .replace(/\u2026/g, '...')       // Ellipsis
            // Remove ONLY characters that are truly problematic (non-printable control chars), 
            // but keep newlines (\n, \r), tabs (\t), and all normal visible characters.
            // The previous regex [^\x00-\x7F] removed accented chars and symbols which might be desired.
            // Let's just strip control characters that aren't whitespace.
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim();
    }
});
