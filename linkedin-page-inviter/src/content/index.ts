/**
 * LinkedIn Page Inviter Chrome Extension
 * Content Script - Handles the actual invitation process on LinkedIn event pages
 */

import { TranslationData } from '../types/chrome';

// Keep track of ongoing invitation processes
let isProcessing = false;
let shouldStopProcessing = false;
let invitedCount = 0;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startInvites" || message.action === "invitePeople") {
    // This check prevents starting a new invite process if one is already running
    if (isProcessing) {
      sendResponse({ error: "Already processing invitations", success: false });
      return true;
    }
    
    isProcessing = true;
    shouldStopProcessing = false;
    
    // If we're continuing from a previous session, keep the invitedCount
    // otherwise, reset it
    if (!message.isContinuation) {
      invitedCount = 0;
    }
    
    // Use setTimeout to allow the sendResponse to happen immediately
    setTimeout(() => {
      invitePeople(message.names, message.translations, message.message, message.isContinuation)
        .then(result => {
          isProcessing = false;
          
          // If the process was stopped by the user, report differently
          if (shouldStopProcessing) {
            chrome.runtime.sendMessage({
              action: "inviteStopped",
              count: result.added,
              total: result.total
            });
            console.log(`Invitation process stopped by user, sent count: ${result.added}`);
          } else {
            // Process completed normally
            chrome.runtime.sendMessage({
              action: "inviteComplete",
              count: result.added,
              total: result.total
            });
            console.log(`Invitation process completed successfully, sent count: ${result.added}`);
          }
        })
        .catch(error => {
          isProcessing = false;
          
          // Check if this was a user-initiated stop
          if (error.message === "Process was stopped by user") {
            chrome.runtime.sendMessage({
              action: "inviteStopped", 
              count: invitedCount,
              total: message.names.length
            });
            console.log(`Invitation process stopped by user, sent count: ${invitedCount}`);
          } else {
            // Report completion with error to background script
            chrome.runtime.sendMessage({
              action: "inviteComplete",
              count: invitedCount,
              total: message.names.length,
              error: error.message
            });
            console.error("Invitation process failed:", error);
          }
        });
    }, 0);
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "ping") {
    // Include the current invite count in the ping response
    sendResponse({ 
      status: "alive",
      invitedCount: invitedCount,
      isProcessing: isProcessing 
    });
    
    return true;
  }
  else if (message.action === "stopInvites") {
    shouldStopProcessing = true;
    // Immediately set isProcessing to false so new invites can be started right away
    isProcessing = false;
    sendResponse({ status: "stopping" });
    
    // If process was running, send a message that we're stopping
    // We still emit the message even though we've reset isProcessing
    // to maintain the flow of status updates
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: "inviteStopped",
        count: invitedCount,
        total: invitedCount, // The total is just what we've done so far
      });
    }, 500);
    
    return true;
  }
});

// Ensure the document stays active
function keepAlive() {
  if (document.hidden) {
    // Create and dispatch events to keep the page active
    const keepAliveEvent = new Event('focus', { bubbles: true });
    document.dispatchEvent(keepAliveEvent);
    window.dispatchEvent(keepAliveEvent);
  }
}

// Set up interval to keep the page active
setInterval(keepAlive, 5000);

// Utility to throw if stopped
function throwIfStopped() {
  if (shouldStopProcessing) {
    throw new Error("Process was stopped by user");
  }
}

/**
 * Invite people to a LinkedIn event
 * @param {string[]} names - Array of names to invite
 * @param {Object} translations - Translations object for UI messages
 * @param {string} customMessage - Optional custom invitation message
 * @param {boolean} isContinuation - Whether this is continuing an existing invitation session
 */
async function invitePeople(
  names: string[], 
  translations: TranslationData = {}, 
  customMessage?: string,
  isContinuation: boolean = false
): Promise<{added: number, total: number}> {
  // Helper functions
  const waitForElement = (selector: string, timeout = 10000): Promise<Element> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        throwIfStopped();
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startTime > timeout) {
          const errorMessage = translations.elementNotFound 
            ? translations.elementNotFound.replace('$SELECTOR$', selector)
            : `Element ${selector} not found`;
          reject(new Error(errorMessage));
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  };

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => {
      const checkAndResolve = () => {
        throwIfStopped();
        resolve();
      };
      setTimeout(checkAndResolve, ms);
    });
  };

  const searchAndSelect = async (name: string, maxRetries = 3): Promise<boolean> => {
    throwIfStopped();
    try {
      // Check if the search box is already present (if invite popup is already open)
      let searchBox = document.querySelector(".invitee-picker-content__search-container input") as HTMLInputElement;
      let inviteDialogIsOpen = !!searchBox;
      
      // If search box isn't found, try to open the invite dialog
      if (!searchBox) {
        try {
          // Click invite button
          const inviteBtn = document.querySelector("#org-menu-INVITE_TO_FOLLOW") as HTMLElement;
          inviteBtn.click();
          await sleep(100);
          
          // Now try to get the search box again
          searchBox = await waitForElement(".invitee-picker-content__search-container input") as HTMLInputElement;
        } catch (error) {
          console.error("Failed to open invite dialog:", error);
          return false;
        }
      }
      
      // Check if this person is already selected in the pills
      const selectedPills = document.querySelectorAll('.invitee-picker-connections-pill');
      let alreadySelected = false;
      
      if (selectedPills.length > 0) {
        // Check each pill to see if the name is already selected
        for (const pill of Array.from(selectedPills)) {
          const pillText = pill.textContent?.trim().toLowerCase();
          const normalizedName = name.toLowerCase();
          
          // Check if the pill contains the name we're looking for
          if (pillText?.includes(normalizedName) || normalizedName.includes(pillText || '')) {
            console.log(`${name} is already in selected pills, skipping search`);
            alreadySelected = true;
            
            // Count as successfully invited
            invitedCount++;
            
            // Notify background script about this successful invite
            chrome.runtime.sendMessage({
              action: 'individualInviteSuccess',
              name: name,
              currentInviteCount: invitedCount
            });
            
            return true;
          }
        }
      }
      
      // If not already selected in pills, proceed with searching
      if (!alreadySelected) {
        // Clear any existing text in the search box
        searchBox.value = '';
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(100);
        
        // Set the name in the search box
        searchBox.value = name;
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          throwIfStopped();
          await sleep(1000); // Wait for search results
          
          // Check for search results
          const searchResults = document.querySelectorAll("li[role='option']");
          
          // If no results are found, try again with variations of the name
          if (searchResults.length === 0 && attempt < maxRetries - 1) {
            const attemptMessage = translations.attemptSearch
              ? translations.attemptSearch
                  .replace('$ATTEMPT$', (attempt + 1).toString())
                  .replace('$NAME$', name)
              : `Attempt ${attempt + 1}: No results for "${name}"`;
            console.log(attemptMessage);
            
            // Clear and retry with a modified search - try splitting the name 
            // (e.g. "John Smith" -> try just "John" or just "Smith")
            searchBox.value = '';
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(300);
            
            // On second attempt, try first name only
            if (attempt === 1 && name.includes(' ')) {
              const firstName = name.split(' ')[0];
              searchBox.value = firstName;
              console.log(`Trying with first name only: "${firstName}"`);
            }
            // On third attempt, try last name only
            else if (attempt === 2 && name.includes(' ')) {
              const nameParts = name.split(' ');
              const lastName = nameParts[nameParts.length - 1];
              searchBox.value = lastName;
              console.log(`Trying with last name only: "${lastName}"`);
            } else {
              searchBox.value = name;
            }
            
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
            continue;
          }
          
          // Find the option and check if it's already selected
          const optionItem = document.querySelector("li[role='option']");
          const checkbox = optionItem?.querySelector("input") as HTMLInputElement;
          
          if (checkbox) {
            // Check if the option is already selected (either by aria-selected or by checking if checkbox is checked)
            const isSelected = 
              optionItem?.getAttribute('aria-selected') === 'true' || 
              checkbox.checked;
            
            if (!isSelected) {
              // Only click if not already selected
              checkbox.click();
              await sleep(100);
              
              const logMessage = translations.nameAdded
                ? translations.nameAdded.replace('$NAME$', name)
                : `${name} added`;
              console.log(logMessage);
            } else {
              // If already selected, just log that it was already selected
              console.log(`${name} was already selected, keeping selection`);
            }
            
            // Whether newly selected or already selected, we count it as successfully added
            invitedCount++;
            
            // Notify background script about this successful invite
            chrome.runtime.sendMessage({
              action: 'individualInviteSuccess',
              name: name,
              currentInviteCount: invitedCount
            });
            
            return true;
          }
          
          if (attempt < maxRetries - 1) {
            const attemptMessage = translations.attemptSearch
              ? translations.attemptSearch
                  .replace('$ATTEMPT$', (attempt + 1).toString())
                  .replace('$NAME$', name)
              : `Attempt ${attempt + 1}: No results for "${name}"`;
            console.log(attemptMessage);
            
            // Clear and retry the search
            searchBox.value = '';
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(300);
            
            searchBox.value = name;
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
      
      const notFoundMessage = translations.nameNotFound
        ? translations.nameNotFound
            .replace('$NAME$', name)
            .replace('$ATTEMPTS$', maxRetries.toString())
        : `${name} not found after ${maxRetries} attempts`;
      console.log(notFoundMessage);
      
      return false;
    } catch (error) {
      console.error(`Error inviting ${name}:`, error);
      return false;
    }
  };

  try {
    // Log whether this is a continuation of a previous session
    if (isContinuation) {
      console.log("Continuing invitation process from previous session");
    }
    
    // Keep the tab active
    keepAlive();
    
    // Process each name, with minimal delays to speed up the process
    let added = 0;
    for (let i = 0; i < names.length; i++) {
      throwIfStopped();
      const name = names[i].trim();
      if (!name) continue;
      
      if (await searchAndSelect(name)) {
        added++;
      }
      
      // Brief pause between invites to give LinkedIn a chance to process
      if (i < names.length - 1) {
        await sleep(500);
      }
    }
    
    const summaryMessage = translations.invitationSummary
      ? translations.invitationSummary
          .replace('$ADDED$', added.toString())
          .replace('$TOTAL$', names.length.toString())
      : `Done. ${added} of ${names.length} names added`;
    console.log(summaryMessage);
    
    return { added, total: names.length };
  } catch (error) {
    console.error("Invitation process error:", error);
    throw error;
  }
}

// Log that the content script is loaded
console.log('LinkedIn Page Inviter content script loaded'); 