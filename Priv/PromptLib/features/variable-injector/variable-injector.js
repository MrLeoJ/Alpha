
import { showToast, renderIcons } from '../../js/utils.js';
import { openLaunchModal } from '../launch/launch.js';
import { incrementUsage } from '../analytics/analytics.js';

/**
 * Main entry point for the Smart Copy/Launch feature.
 * @param {string} promptId - The ID of the prompt (for analytics)
 * @param {string} htmlContent - The raw HTML content from the prompt.
 * @param {string} initialIntent - 'copy' or 'launch'
 */
export const handleSmartCopy = (promptId, htmlContent, initialIntent = 'copy') => {
    // 1. Convert HTML to Plain Text while preserving structure and Markdown syntax
    const tempDiv = document.createElement("div");
    
    // Inject HTML
    tempDiv.innerHTML = htmlContent;

    // --- Markdown Syntax Injection ---
    // We wrap content in markdown symbols so they survive innerText extraction
    
    // Bold
    tempDiv.querySelectorAll('b, strong').forEach(el => {
        el.innerHTML = `**${el.innerHTML}**`;
    });

    // Italic
    tempDiv.querySelectorAll('i, em').forEach(el => {
        el.innerHTML = `*${el.innerHTML}*`;
    });

    // Headings
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const level = tag.replace('h', '');
        const prefix = '#'.repeat(parseInt(level));
        tempDiv.querySelectorAll(tag).forEach(el => {
            el.innerHTML = `${prefix} ${el.innerHTML}`;
        });
    });

    // Lists
    // Unordered
    tempDiv.querySelectorAll('ul').forEach(ul => {
        Array.from(ul.children).forEach(li => {
            if (li.tagName === 'LI') {
                 li.innerHTML = `- ${li.innerHTML}`;
            }
        });
    });

    // Ordered
    tempDiv.querySelectorAll('ol').forEach(ol => {
        let index = 1;
        Array.from(ol.children).forEach(li => {
            if (li.tagName === 'LI') {
                li.innerHTML = `${index}. ${li.innerHTML}`;
                index++;
            }
        });
    });

    // Horizontal Rule
    tempDiv.querySelectorAll('hr').forEach(hr => {
        const replacement = document.createElement('div');
        replacement.innerText = '---';
        hr.replaceWith(replacement);
    });

    // Code blocks (pre)
    tempDiv.querySelectorAll('pre').forEach(pre => {
        pre.innerHTML = `\`\`\`\n${pre.innerHTML}\n\`\`\``;
    });
    
    // Blockquotes
    tempDiv.querySelectorAll('blockquote').forEach(bq => {
        bq.innerHTML = `> ${bq.innerHTML}`;
    });

    // 2. Extract Text with Layout awareness
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.whiteSpace = 'pre-wrap'; 
    
    const style = document.createElement('style');
    style.textContent = `
        #smart-copy-temp li { display: block; } 
        #smart-copy-temp ul, #smart-copy-temp ol { list-style: none; padding: 0; }
    `;
    tempDiv.id = 'smart-copy-temp';
    tempDiv.appendChild(style);

    document.body.appendChild(tempDiv);
    
    const plainText = tempDiv.innerText;
    
    document.body.removeChild(tempDiv);

    // 3. Scan for variables
    const regex = /(\\)?{{\s*([^{}]+?)\s*}}/g;
    const matches = [...plainText.matchAll(regex)];
    
    const validMatches = matches.filter(m => !m[1]);
    const variables = [...new Set(validMatches.map(m => m[2]))];

    if (variables.length === 0) {
        // No variables needed
        // Track usage immediately since action is complete or hand-off to launch
        incrementUsage(promptId);
        
        if (initialIntent === 'launch') {
            openLaunchModal(plainText);
        } else {
            copyToClipboard(plainText);
        }
    } else {
        // Variables exist -> Open Injector (Usage tracked when they actually finish)
        openInjectorModal(promptId, plainText, variables);
    }
};

const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch((err) => {
        console.error('Copy failed', err);
        showToast('Failed to copy', 'error');
    });
};

const openInjectorModal = (promptId, templateText, variables) => {
    // Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'injector-overlay';
    
    // Generate Fields HTML
    const fieldsHtml = variables.map((v, index) => `
        <div class="var-field">
            <label class="var-label">
                <span class="var-badge">${v}</span>
                <span>Variable ${index + 1}</span>
            </label>
            <textarea class="var-input" data-var="${v}" placeholder="Enter value..." rows="3"></textarea>
        </div>
    `).join('');

    overlay.innerHTML = `
        <div class="injector-modal">
            <div class="injector-header">
                <div class="injector-title">Customize Prompt</div>
                <button class="injector-close-btn" title="Close"><i data-feather="x" width="20" height="20"></i></button>
            </div>
            
            <div class="injector-body">
                <div class="injector-intro">
                    This prompt contains <strong>${variables.length}</strong> placeholder${variables.length > 1 ? 's' : ''}. 
                    Fill them in below to generate the ready-to-use prompt.
                </div>
                <form id="injectorForm">
                    ${fieldsHtml}
                </form>
            </div>

            <div class="injector-footer">
                <div class="footer-left">
                    <button class="btn btn-secondary" id="copyOriginalBtn" title="Copy un-filled template">Raw Copy</button>
                </div>
                <div class="footer-right">
                    <button class="btn btn-secondary" id="copyFilledBtn">
                        <i data-feather="copy" width="16" height="16"></i> Copy
                    </button>
                    <button class="btn btn-primary" id="launchFilledBtn">
                        <i data-feather="external-link" width="16" height="16"></i> Launch
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    requestAnimationFrame(() => overlay.classList.add('visible'));

    // --- Logic ---
    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 250);
    };

    const getFilledText = () => {
        let finalText = templateText;
        const inputs = overlay.querySelectorAll('.var-input');
        
        inputs.forEach(input => {
            const varName = input.dataset.var;
            const value = input.value; 
            
            const safeVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const replaceRegex = new RegExp(`(\\\\)?{{\\s*${safeVarName}\\s*}}`, 'g');
            
            finalText = finalText.replace(replaceRegex, (match, escaped) => {
                if (escaped) return match; 
                return value;
            });
        });
        return finalText;
    };

    // Close Events
    overlay.querySelector('.injector-close-btn').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
    });

    // Copy Original
    overlay.querySelector('#copyOriginalBtn').addEventListener('click', () => {
        copyToClipboard(templateText);
        // Track usage even for raw copy
        incrementUsage(promptId);
        close();
    });

    // Copy Filled
    overlay.querySelector('#copyFilledBtn').addEventListener('click', () => {
        copyToClipboard(getFilledText());
        incrementUsage(promptId);
        close();
    });

    // Launch Filled
    overlay.querySelector('#launchFilledBtn').addEventListener('click', () => {
        const text = getFilledText();
        incrementUsage(promptId);
        
        overlay.classList.remove('visible'); 
        setTimeout(() => {
            overlay.remove();
            openLaunchModal(text);
        }, 250);
    });

    setTimeout(() => {
        const firstInput = overlay.querySelector('textarea');
        if (firstInput) firstInput.focus();
    }, 100);

    overlay.querySelector('#injectorForm').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            overlay.querySelector('#launchFilledBtn').click();
        }
    });
};
