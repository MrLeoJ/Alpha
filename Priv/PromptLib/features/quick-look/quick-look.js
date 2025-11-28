
import { renderIcons } from '../../js/utils.js';
import { handleSmartCopy } from '../variable-injector/variable-injector.js';
import { openEditorModal } from '../editor/editor.js';

export const openQuickLook = (promptData, onUpdateCallback = null) => {
    // 1. Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'ql-overlay';

    // 2. Prepare Data
    const title = promptData.title || 'Untitled Prompt';
    // Content is stored as HTML from the editor. 
    // We render it directly to preserve formatting (Bold, Lists, Headers).
    const displayContent = promptData.content || '<p style="color:var(--text-light); font-style:italic;">No content provided.</p>';
    
    const tagsHtml = (promptData.tags || [])
        .map(t => `<span class="ql-badge"><i data-feather="hash" width="10" height="10"></i> ${t}</span>`)
        .join('');

    // Usage Stats (if available)
    const usageCount = promptData.usageCount || 0;

    overlay.innerHTML = `
        <div class="ql-modal">
            <div class="ql-header">
                <div class="ql-title-group">
                    <div class="ql-title">${title}</div>
                    <div class="ql-meta">
                        ${tagsHtml}
                        ${usageCount > 0 ? `<span class="ql-badge" style="background:rgba(254,106,95,0.1); color:var(--primary);"><i data-feather="activity" width="10" height="10"></i> Used ${usageCount} times</span>` : ''}
                    </div>
                </div>
                <button class="ql-close-btn" id="qlCloseBtn" title="Close (Esc)">
                    <i data-feather="x" width="24" height="24"></i>
                </button>
            </div>
            
            <div class="ql-content-scroll">
                <div class="ql-markdown-preview">${displayContent}</div>
            </div>

            <div class="ql-footer">
                <div class="ql-footer-left">
                    Press <strong>Esc</strong> to close
                </div>
                <div class="ql-footer-actions">
                    <button class="ql-btn ql-btn-secondary" id="qlEditBtn">
                        <i data-feather="edit-2" width="16" height="16"></i> Edit
                    </button>
                    <button class="ql-btn ql-btn-primary" id="qlUseBtn">
                        <i data-feather="zap" width="16" height="16"></i> Use Prompt
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    // Animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // --- Logic ---
    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 250);
    };

    // Close Button
    overlay.querySelector('#qlCloseBtn').addEventListener('click', close);
    // Overlay Click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    // Edit Button
    overlay.querySelector('#qlEditBtn').addEventListener('click', () => {
        close();
        setTimeout(() => {
            openEditorModal(promptData.id, onUpdateCallback);
        }, 250);
    });

    // Use Button (Smart Copy)
    overlay.querySelector('#qlUseBtn').addEventListener('click', () => {
        // Pass ID for analytics
        handleSmartCopy(promptData.id, promptData.content, 'copy');
        close();
    });

    // Esc Key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};
