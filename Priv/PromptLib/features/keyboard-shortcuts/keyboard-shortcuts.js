
import { renderIcons } from '../../js/utils.js';

export const initKeyboardShortcuts = () => {
    document.addEventListener('keydown', (e) => {
        // Platform agnostic modifier (Cmd on Mac, Ctrl on Win)
        const isCmdOrCtrl = e.metaKey || e.ctrlKey;
        
        // Check if user is typing in an input/textarea/editor
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isContentEditable = document.activeElement && document.activeElement.isContentEditable;
        const isInputActive = (activeTag === 'input' || activeTag === 'textarea' || isContentEditable);

        // 1. Search (Cmd+K)
        // Allow even if input is active (to jump back to search)
        if (isCmdOrCtrl && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.cb-search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        // 2. New Prompt (Cmd+N)
        if (isCmdOrCtrl && e.key === 'n') {
            e.preventDefault();
            // Prevent stacking if editor is already open
            if (!document.querySelector('.editor-modal-overlay')) {
                // Simulate click on the 'Add' button in Command Bar
                const addBtn = document.querySelector('.cb-add-btn');
                if (addBtn) {
                    addBtn.click();
                }
            }
            return;
        }

        // 3. Cheat Sheet (?) (Shift + /)
        // Only if NOT typing
        if (e.key === '?' && !isInputActive) {
            e.preventDefault();
            toggleCheatSheet();
            return;
        }

        // 4. Escape: General cleanup 
        // Note: Specific modals (Editor, Injector) have their own Esc listeners that usually fire first or bubble.
        if (e.key === 'Escape') {
             // If search is focused, blur it to return focus to body
             const searchInput = document.querySelector('.cb-search-input');
             if (document.activeElement === searchInput) {
                 searchInput.blur();
             }
        }
    });
};

export const toggleCheatSheet = () => {
    const existing = document.querySelector('.shortcut-modal-overlay');
    if (existing) {
        existing.classList.remove('visible');
        setTimeout(() => existing.remove(), 200);
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'shortcut-modal-overlay';
    
    // Determine modifier symbol based on platform roughly
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? '⌘' : 'Ctrl';

    overlay.innerHTML = `
        <div class="shortcut-modal">
            <div class="shortcut-header">
                <h3>Keyboard Shortcuts</h3>
                <button class="shortcut-close-btn" title="Close"><i data-feather="x" width="20" height="20"></i></button>
            </div>
            <div class="shortcut-list">
                <div class="shortcut-item">
                    <span class="shortcut-desc">Focus Search</span>
                    <span class="shortcut-keys"><kbd>${mod}</kbd> <kbd>K</kbd></span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-desc">New Prompt</span>
                    <span class="shortcut-keys"><kbd>${mod}</kbd> <kbd>N</kbd></span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-desc">Save Prompt (in Editor)</span>
                    <span class="shortcut-keys"><kbd>${mod}</kbd> <kbd>S</kbd></span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-desc">Close Modal / Clear</span>
                    <span class="shortcut-keys"><kbd>Esc</kbd></span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-desc">Show Shortcuts</span>
                    <span class="shortcut-keys"><kbd>?</kbd></span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();
    
    // Trigger animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('.shortcut-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
};
