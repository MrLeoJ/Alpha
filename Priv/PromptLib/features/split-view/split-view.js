
import { renderIcons } from '../../js/utils.js';
import { handleSmartCopy } from '../variable-injector/variable-injector.js';
import { openLaunchModal } from '../launch/launch.js';
import { openEditorModal } from '../editor/editor.js';
import { openQuickLook } from '../quick-look/quick-look.js'; // Fallback for mobile

let activePromptId = null;
let promptList = [];

export const renderSplitView = (container, prompts, collections, callbacks = {}) => {
    // 1. Reset Container
    container.innerHTML = '';
    promptList = prompts;
    
    // Safety check for empty
    if (prompts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="columns" style="width: 48px; height: 48px; opacity: 0.5;"></i>
                <p>No prompts found.</p>
            </div>
        `;
        renderIcons();
        return;
    }

    // 2. Select first item by default if nothing selected (or if active ID not in current list)
    if (!activePromptId || !prompts.find(p => p.id === activePromptId)) {
        activePromptId = prompts[0].id;
    }

    // 3. Render Skeleton
    const wrapper = document.createElement('div');
    wrapper.className = 'split-view-container';
    
    wrapper.innerHTML = `
        <div class="split-master-pane">
            <div class="split-master-header">
                <span>${prompts.length} Prompts</span>
                <i data-feather="arrow-down" width="14" height="14" title="Use arrow keys to navigate"></i>
            </div>
            <div class="split-master-scroll" id="masterList"></div>
        </div>
        <div class="split-detail-pane" id="detailPane">
            <!-- Content injected via JS -->
        </div>
    `;

    container.appendChild(wrapper);

    // 4. Render Master List
    const masterListEl = wrapper.querySelector('#masterList');
    
    const renderMasterList = () => {
        masterListEl.innerHTML = prompts.map(p => {
            const isActive = p.id === activePromptId;
            const coll = collections.find(c => c.id === p.collectionId);
            const collName = coll ? coll.name : null;
            
            // Just show first tag
            const firstTag = p.tags && p.tags.length > 0 ? p.tags[0] : null;

            return `
                <div class="split-item ${isActive ? 'active' : ''}" data-id="${p.id}">
                    <div class="split-item-top">
                        <div class="split-item-title">${escapeHtml(p.title)}</div>
                    </div>
                    <div class="split-item-meta">
                        ${collName ? `
                            <div class="split-coll-badge">
                                <i data-feather="folder" width="10" height="10"></i> ${escapeHtml(collName)}
                            </div>
                        ` : ''}
                        ${firstTag ? `<span>#${escapeHtml(firstTag)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    };
    renderMasterList();

    // 5. Render Detail Pane
    const detailPaneEl = wrapper.querySelector('#detailPane');
    
    const renderDetail = () => {
        const prompt = prompts.find(p => p.id === activePromptId);
        
        if (!prompt) {
            detailPaneEl.innerHTML = `
                <div class="split-detail-empty">
                    <i data-feather="layout" width="48" height="48" style="opacity:0.3"></i>
                    <p>Select a prompt to view details</p>
                </div>
            `;
            renderIcons();
            return;
        }

        const tagsHtml = (prompt.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        const dateObj = prompt.updatedAt ? prompt.updatedAt.toDate() : (prompt.createdAt ? prompt.createdAt.toDate() : new Date());
        const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        // Content placeholder if empty
        const contentHtml = prompt.content || '<p style="color:var(--text-light); font-style:italic;">No content provided.</p>';

        detailPaneEl.innerHTML = `
            <div class="split-detail-header">
                <div class="split-header-info">
                    <div class="split-detail-title">${escapeHtml(prompt.title)}</div>
                    <div class="split-detail-meta">
                        ${tagsHtml}
                        <span style="font-size:0.8rem; color:var(--text-light); display:flex; align-items:center; gap:4px; margin-left:8px;">
                            <i data-feather="clock" width="12" height="12"></i> ${dateStr}
                        </span>
                    </div>
                </div>
                <div class="split-detail-actions">
                     <button class="sd-btn" id="sdEditBtn" title="Edit">
                        <i data-feather="edit-2" width="16" height="16"></i>
                    </button>
                    <button class="sd-btn" id="sdCopyBtn" title="Copy">
                        <i data-feather="copy" width="16" height="16"></i> Copy
                    </button>
                    <button class="sd-btn primary" id="sdLaunchBtn" title="Launch to AI">
                        <i data-feather="zap" width="16" height="16"></i> Launch
                    </button>
                </div>
            </div>
            <div class="split-detail-content">
                <div class="split-markdown">${contentHtml}</div>
            </div>
        `;

        renderIcons();

        // Bind Actions
        detailPaneEl.querySelector('#sdCopyBtn').addEventListener('click', () => {
             handleSmartCopy(prompt.id, prompt.content, 'copy');
        });
        
        detailPaneEl.querySelector('#sdLaunchBtn').addEventListener('click', () => {
             // We can use handleSmartCopy with 'launch' intent or directly launch if no vars
             handleSmartCopy(prompt.id, prompt.content, 'launch');
        });

        detailPaneEl.querySelector('#sdEditBtn').addEventListener('click', () => {
            if (callbacks.onEdit) callbacks.onEdit(prompt.id);
        });
    };
    
    renderDetail();

    // 6. Interaction Logic
    
    // Click Handler (Delegation)
    masterListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.split-item');
        if (item) {
            const newId = item.dataset.id;
            
            // Mobile check: If detail pane is hidden (display: none via CSS), open QuickLook instead
            const detailStyle = window.getComputedStyle(detailPaneEl);
            if (detailStyle.display === 'none') {
                 const p = prompts.find(x => x.id === newId);
                 if(p) openQuickLook(p, callbacks.onRefresh);
                 return;
            }

            if (newId !== activePromptId) {
                activePromptId = newId;
                
                // Update active class
                masterListEl.querySelectorAll('.split-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                renderDetail();
            }
        }
    });

    // 7. Keyboard Navigation
    const handleKeydown = (e) => {
        if (!document.body.contains(wrapper)) {
            document.removeEventListener('keydown', handleKeydown);
            return;
        }

        // Only handle if no modal is open (simple check for overlays)
        if (document.querySelector('.injector-overlay.visible') || document.querySelector('.editor-modal-overlay.visible')) return;

        // Only handle Up/Down
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            
            const currentIndex = prompts.findIndex(p => p.id === activePromptId);
            if (currentIndex === -1) return;

            let newIndex = currentIndex;
            if (e.key === 'ArrowDown') {
                newIndex = Math.min(prompts.length - 1, currentIndex + 1);
            } else {
                newIndex = Math.max(0, currentIndex - 1);
            }

            if (newIndex !== currentIndex) {
                activePromptId = prompts[newIndex].id;
                
                // Update UI visually without full re-render of list if possible
                const items = masterListEl.querySelectorAll('.split-item');
                items[currentIndex].classList.remove('active');
                items[newIndex].classList.add('active');
                
                // Scroll into view
                items[newIndex].scrollIntoView({ block: 'nearest' });

                renderDetail();
            }
        }
    };

    document.addEventListener('keydown', handleKeydown);
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
