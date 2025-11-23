# Cover Letter Generator Chrome Extension

A Chrome Extension that generates tailored cover letters using OpenAI's API, your resume, and the job description from the current page.

## Setup Instructions

1.  **Load the Extension**:
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable **Developer mode** (toggle in the top right).
    *   Click **Load unpacked**.
    *   Select the `coverlettergenerator` folder (where this README is located).

2.  **Configure Settings**:
    *   Click the extension icon in the toolbar.
    *   Click the **Settings** (gear icon) button or "Open Setup".
    *   **Username**: Enter your name (used for filenames).
    *   **API Key**: Enter your OpenAI API Key (starts with `sk-...`).
    *   **System Prompt**: Enter a master prompt (e.g., "You are a professional career coach...").
    *   **Resume**: Upload your resume as a `.txt` file (preferred) or `.docx` (text will be extracted).
    *   Click **Save Settings**.

3.  **Usage**:
    *   Navigate to a job posting (e.g., LinkedIn, Indeed, or company site).
    *   Click the extension icon.
    *   Click **Generate Cover Letter**.
    *   Wait for the generation to complete.
    *   Edit the text if needed.
    *   Click **Download** to save as a `.txt` file or **Copy** to clipboard.

## Notes

*   **Resume Parsing**: `.txt` files work best. `.docx` support is basic (text extraction only).
*   **Job Description**: The extension attempts to automatically find the job description. If it fails, it will let you know.
*   **Security**: Your API key is stored locally in your browser (`chrome.storage.local`) and is only used to make requests to OpenAI.

## Troubleshooting

*   **"Error: Could not find job description"**: Try reloading the page or manually copying the description into the prompt if you modify the code to support manual input.
*   **API Errors**: specific OpenAI errors (like Quota exceeded) will be shown in the status area. Check your API key and billing status.
