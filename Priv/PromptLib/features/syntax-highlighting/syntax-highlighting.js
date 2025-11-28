
import { showToast, renderIcons } from '../../js/utils.js';

/**
 * Applies syntax highlighting to all <pre> blocks within the container.
 * Also injects a "Copy" button into each block.
 * Uses highlight.js (expected to be loaded globally via CDN).
 * 
 * @param {HTMLElement} container - The root element to search for code blocks.
 */
export const applySyntaxHighlighting = (container) => {
    if (!window.hljs) {
        console.warn('highlight.js is not loaded.');
        return;
    }

    const preBlocks = container.querySelectorAll('pre');

    preBlocks.forEach((pre) => {
        // 1. Prepare Structure: Ensure <pre> contains <code>
        // Some editors just make <pre>text</pre>. hljs wants <pre><code>text</code></pre>
        if (!pre.querySelector('code')) {
            const code = document.createElement('code');
            // Move all child nodes of pre into code
            while (pre.firstChild) {
                code.appendChild(pre.firstChild);
            }
            pre.appendChild(code);
        }

        const codeBlock = pre.querySelector('code');

        // 2. Highlight
        // add 'hljs' class to prevent double init or aid styling
        codeBlock.classList.add('hljs');
        // remove existing manual highlighting attributes if any to let auto-detect work
        // unless specific class exists.
        hljs.highlightElement(codeBlock);

        // 3. Inject Copy Button
        // Check if button already exists to prevent duplicates
        if (pre.querySelector('.code-block-copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'code-block-copy-btn';
        btn.innerHTML = `<i data-feather="copy" width="14" height="14"></i> Copy`;
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = codeBlock.innerText; // Get text content
            navigator.clipboard.writeText(text).then(() => {
                // Feedback state
                const originalHtml = btn.innerHTML;
                btn.innerHTML = `<i data-feather="check" width="14" height="14"></i> Copied!`;
                btn.classList.add('copied');
                
                if (window.feather) window.feather.replace();

                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.classList.remove('copied');
                    if (window.feather) window.feather.replace();
                }, 2000);
            }).catch(err => {
                console.error('Copy code failed', err);
                showToast('Failed to copy code', 'error');
            });
        });

        pre.appendChild(btn);
    });

    // Re-render icons for the new buttons
    if (window.feather) window.feather.replace();
};
