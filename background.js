// Background service worker
// Currently minimal as most logic is in popup and content script.
// Can be used for context menus or handling installation events in the future.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Cover Letter Generator extension installed.");
});
