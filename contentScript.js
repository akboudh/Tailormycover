// Content Script to scrape job descriptions
if (window.tailorMyCoverHasRun) {
    // Already injected, do nothing (listeners persist)
} else {
    window.tailorMyCoverHasRun = true;


    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getJobDescription") {
            const description = getJobDescription();
            sendResponse({ description: description });
        }
        // Return true to indicate we wish to send a response asynchronously (though here we are synchronous)
        // It's good practice in some cases, but for simple sync response it's not strictly needed.
        // However, if we were doing async work, we'd return true.
    });

    function getJobDescription() {
        // Heuristics to find the job description

        // 1. Common ID/Class selectors
        const selectors = [
            "#job-description",
            ".job-description",
            "[class*='job-description']",
            "[id*='job-description']",
            ".description",
            "#description",
            ".job-details",
            ".JobDetails",
            "[data-test='job-description']" // LinkedIn sometimes
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.length > 200) {
                console.log("Found job description via selector:", selector);
                return element.innerText.trim();
            }
        }

        // 2. Fallback: Find the largest block of text
        // This is a rough heuristic but often works for simple pages.
        const allElements = document.body.querySelectorAll('div, section, article, main');
        let maxTextLength = 0;
        let bestElement = null;

        allElements.forEach(el => {
            // Filter out hidden elements or nav/footer if possible (simple check)
            if (el.offsetParent === null) return; // Hidden

            // Get direct text or text of children, but we want a block that is mostly text
            // A simple proxy is innerText length, but we want to avoid the whole body
            // Let's check if it has a reasonable amount of text and isn't just a container of containers
            // For simplicity, we'll just take the element with the most text that isn't the body itself
            // and is somewhat deep in the DOM? No, let's just look for the largest text block.

            const text = el.innerText;
            if (text.length > maxTextLength && text.length < 50000) { // Cap to avoid huge logs
                // Avoid selecting the entire body or main wrapper if there's a more specific child
                // This is hard to do perfectly without complex logic.
                // Let's try to find a leaf-ish node or a node with high text density.

                // Simple approach: Just track max length.
                maxTextLength = text.length;
                bestElement = el;
            }
        });

        if (bestElement) {
            // Validate with keywords to avoid false positives on non-job pages
            const text = bestElement.innerText.trim();
            const keywords = [
                'responsibilities', 'requirements', 'qualifications', 'experience',
                'skills', 'benefits', 'apply', 'role', 'job description',
                'what you will do', 'about the job', 'summary', 'job title'
            ];
            const lowerText = text.toLowerCase();

            let matchCount = 0;
            for (const kw of keywords) {
                if (lowerText.includes(kw)) matchCount++;
            }

            // Require at least 2 keywords to consider it a job description
            if (matchCount >= 2) {
                console.log("Found job description via fallback (largest text block) with keywords.");
                return text;
            } else {
                console.log("Found large text block but missing job keywords. Ignoring.");
            }
        }

        return null; // Return null so popup knows we failed
    }
}
