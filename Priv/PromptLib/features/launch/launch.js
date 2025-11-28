

import { showToast, renderIcons } from '../../js/utils.js';
import { db } from '../../js/config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Default Configuration
const DEFAULT_PROVIDERS = [
    {
        id: 'gemini',
        name: 'Gemini',
        desc: 'Google',
        url: 'https://gemini.google.com/app'
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        desc: 'Search',
        url: 'https://www.perplexity.ai/',
        supportsAutoPaste: true
    },
    {
        id: 'chatgpt',
        name: 'Chat GPT',
        desc: 'OpenAI',
        url: 'https://chatgpt.com/',
        supportsAutoPaste: true
    },
    {
        id: 'claude',
        name: 'Claude',
        desc: 'Anthropic',
        url: 'https://claude.ai/new',
        supportsAutoPaste: true
    },
    {
        id: 'grok',
        name: 'Grok',
        desc: 'xAI',
        url: 'https://grok.com/'
    }
];

// Cached Providers
let currentProviders = null;

/**
 * Fetch LLMs from DB or return defaults
 */
export const getLLMs = async () => {
    if (currentProviders) return currentProviders;

    try {
        if (!db) return DEFAULT_PROVIDERS;
        const docRef = doc(db, 'settings', 'llms');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().providers) {
            currentProviders = docSnap.data().providers;
        } else {
            currentProviders = DEFAULT_PROVIDERS;
        }
    } catch (error) {
        console.warn("Failed to fetch LLMs, using defaults", error);
        currentProviders = DEFAULT_PROVIDERS;
    }
    return currentProviders;
};

/**
 * Save LLMs to DB
 */
export const saveLLMs = async (providers) => {
    try {
        await setDoc(doc(db, 'settings', 'llms'), { providers });
        currentProviders = providers;
        return true;
    } catch (error) {
        console.error("Error saving LLMs", error);
        return false;
    }
};

/**
 * Reset to defaults
 */
export const resetLLMs = async () => {
    return await saveLLMs(DEFAULT_PROVIDERS);
};

/**
 * Opens the Modal to select an LLM
 * @param {string} promptText - The text to copy/use
 */
export const openLaunchModal = async (promptText) => {
    // 1. Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'injector-overlay'; // Reuse generic overlay class
    
    // Fetch Providers first
    const providers = await getLLMs();

    // 2. Build Cards HTML
    const cardsHtml = providers.map(llm => {
        let href = llm.url;
        
        // Handle Auto-Paste URL construction
        if (llm.supportsAutoPaste && promptText) {
            const encoded = encodeURIComponent(promptText);
            // Check for reasonable length before injecting into URL
            if (encoded.length < 6000) {
                if (llm.id === 'perplexity') {
                     href = 'https://www.perplexity.ai/search?q=' + encoded;
                } else if (llm.id === 'chatgpt') {
                     href = 'https://chatgpt.com/?q=' + encoded;
                } else if (llm.id === 'claude') {
                     href = 'https://claude.ai/new?q=' + encoded;
                } else {
                    // Fallback for custom providers or others
                    // If the user setup the URL like "https://custom.com/search?q=" we just append
                    href += encoded;
                }
            }
        }

        return `
        <a href="${href}" target="_blank" rel="noopener" class="llm-card" data-id="${llm.id}" aria-label="Open ${llm.name} in new tab">
            <div>
                <div class="llm-name">${llm.name}</div>
                <div class="llm-desc">${llm.desc}</div>
            </div>
        </a>
        `;
    }).join('');

    overlay.innerHTML = `
        <div class="launch-modal">
            <div class="launch-header">
                <div class="launch-title">
                    <i data-feather="external-link" width="20" height="20" style="color:var(--primary);"></i>
                    Launch in...
                </div>
                <button class="injector-close-btn" title="Close"><i data-feather="x" width="20" height="20"></i></button>
            </div>
            
            <div class="launch-body">
                ${cardsHtml}
            </div>

            <div class="launch-footer">
                Prompt will be copied to clipboard automatically.
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    // Trigger Animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // --- Logic ---
    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 250);
    };

    // Close Events
    overlay.querySelector('.injector-close-btn').addEventListener('click', (e) => {
        e.preventDefault(); 
        close();
    });
    
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
    });

    // Handle Selection (Clipboard + Animation)
    // Navigation is handled natively by the <a> tag
    overlay.querySelectorAll('.llm-card').forEach(card => {
        card.addEventListener('click', () => {
            // We do NOT prevent default, allowing the new tab to open immediately.
            
            // Perform clipboard copy
            if (promptText) {
                navigator.clipboard.writeText(promptText).then(() => {
                    showToast('Copied to clipboard!', 'success');
                }).catch(err => {
                    console.warn('Clipboard failed', err);
                });
            }

            // Close modal shortly after
            setTimeout(close, 100);
        });
    });
};
