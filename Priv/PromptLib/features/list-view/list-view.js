
import { renderIcons } from '../../js/utils.js';
import { initDragAndDrop } from '../drag-and-drop/drag-and-drop.js';
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from '../../js/config.js';
import { showToast } from '../../js/utils.js';
import { openEditorModal } from '../editor/editor.js';
import { softDeletePrompt } from '../deleted-items/deleted-items.js';
import { showConfirmToast } from '../../js/utils.js';
import { handleSmartCopy } from '../variable-injector/variable-injector.js';
import { openQuickLook } from '../quick-look/quick-look.js';

export const renderListView = (container, prompts, collections, bulkManager, loadDataCallback, isQuickAccess = false) => {
    // If not Quick Access (or if we are the only list), wipe container. 
    // If we are part of a multi-list view, the parent should have managed the container, 
    // but here we append a wrapper.
    // To play safe with the new split logic in library.js which passes a dedicated container:
    container.innerHTML = '';
    
    if (prompts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="list" style="width: 48px; height: 48px; opacity: 0.5;"></i>
                <p>No prompts found.</p>
            </div>
        `;
        renderIcons();
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'list-view-container';
    
    // Header - Only show if not explicitly disabled or if it's the first one?
    // The library.js logic renders "Quick Access" items first, then "All". 
    // It's cleaner to show headers for both tables for alignment.
    
    const header = document.createElement('div');
    header.className = 'list-header';
    header.innerHTML = `
        <div class="col-checkbox"></div>
        <div class="col-pin" style="width: 40px; display:flex; justify-content:center;"></div>
        <div class="col-title">Title</div>
        <div class="col-collection">Collection</div>
        <div class="col-tags">Tags</div>
        <div class="col-date">Last Edited</div>
        <div class="col-actions"></div>
    `;
    wrapper.appendChild(header);

    const listBody = document.createElement('div');
    listBody.className = 'list-body';
    wrapper.appendChild(listBody);

    prompts.forEach(prompt => {
        const row = document.createElement('div');
        row.className = 'list-row-item';
        if (bulkManager.selectedIds.has(prompt.id)) {
            row.classList.add('selected');
        }
        row.dataset.id = prompt.id;

        const coll = collections.find(c => c.id === prompt.collectionId);
        const collName = coll ? coll.name : '—';
        const collIcon = coll && coll.coverImage ? `<div style="width:16px; height:16px; border-radius:3px; background-image:url('${coll.coverImage}'); background-size:cover;"></div>` : `<i data-feather="folder" width="14" height="14"></i>`;

        const dateObj = prompt.updatedAt ? prompt.updatedAt.toDate() : (prompt.createdAt ? prompt.createdAt.toDate() : new Date());
        const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        const tagsHtml = (prompt.tags || []).slice(0, 3).map(t => `<span class="tag" style="font-size:0.7rem; padding:2px 8px;">${t}</span>`).join('');
        const extraTags = (prompt.tags || []).length > 3 ? `<span class="tag" style="font-size:0.7rem;">+${prompt.tags.length - 3}</span>` : '';

        const isPinned = prompt.pinned === true;

        row.innerHTML = `
            <div class="col-checkbox">
                <div class="list-checkbox-wrapper" title="Select">
                    <i data-feather="check" width="12" height="12"></i>
                </div>
            </div>

            <div class="col-pin">
                <button class="list-pin-btn ${isPinned ? 'active' : ''}" title="${isPinned ? 'Unpin' : 'Pin'}">
                    <i data-feather="bookmark" width="16" height="16"></i>
                </button>
            </div>

            <div class="col-title">
                <div class="list-title-text">${escapeHtml(prompt.title)}</div>
                <div class="list-desc-text">${escapeHtml(prompt.description || '')}</div>
            </div>

            <div class="col-collection">
                <div class="list-collection-badge">
                    ${collIcon}
                    <span>${escapeHtml(collName)}</span>
                </div>
            </div>

            <div class="col-tags">
                ${tagsHtml} ${extraTags}
            </div>

            <div class="col-date">${dateStr}</div>

            <div class="col-actions">
                 <button class="list-action-btn quick-look-btn" title="Quick Look">
                    <i data-feather="eye" width="16" height="16"></i>
                 </button>
                 <button class="list-action-btn row-menu-btn" title="Actions">
                    <i data-feather="more-horizontal"></i>
                </button>
                 <div class="card-menu-dropdown">
                    <button class="card-menu-item copy-item" data-id="${prompt.id}" data-content="${encodeURIComponent(prompt.content || '')}">
                        <i data-feather="copy" width="16" height="16"></i> Copy
                    </button>
                    <button class="card-menu-item edit-item" data-id="${prompt.id}">
                        <i data-feather="edit-2" width="16" height="16"></i> Edit
                    </button>
                    <button class="card-menu-item duplicate-item" data-id="${prompt.id}">
                        <i data-feather="layers" width="16" height="16"></i> Duplicate
                    </button>
                    <button class="card-menu-item delete-item" data-id="${prompt.id}">
                        <i data-feather="trash-2" width="16" height="16"></i> Delete
                    </button>
                </div>
            </div>
        `;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.list-checkbox-wrapper')) {
                e.stopPropagation();
                bulkManager.toggle(prompt.id, e.shiftKey);
                return;
            }

            // Quick Look
            const qlBtn = e.target.closest('.quick-look-btn');
            if (qlBtn) {
                e.stopPropagation();
                openQuickLook(prompt, loadDataCallback);
                return;
            }

            // Pin is handled by library.js Delegation, but we should prevent row click event here if we clicked pin
            if (e.target.closest('.list-pin-btn')) {
                // Event bubble handled in library.js
                return;
            }

            const menuBtn = e.target.closest('.row-menu-btn');
            if (menuBtn) {
                e.stopPropagation();
                const dropdown = menuBtn.nextElementSibling;
                document.querySelectorAll('.card-menu-dropdown.active').forEach(el => {
                    if (el !== dropdown) el.classList.remove('active');
                });
                dropdown.classList.toggle('active');
                return;
            }

            const menuItem = e.target.closest('.card-menu-item');
            if (menuItem) {
                e.stopPropagation();
                const dropdown = menuItem.closest('.card-menu-dropdown');
                dropdown.classList.remove('active');
                
                if (menuItem.classList.contains('edit-item')) {
                    openEditorModal(prompt.id, loadDataCallback);
                } else if (menuItem.classList.contains('duplicate-item')) {
                    openEditorModal(null, loadDataCallback, prompt.id);
                } else if (menuItem.classList.contains('delete-item')) {
                    showConfirmToast('Move this prompt to trash?', async () => {
                         await softDeletePrompt(prompt.id);
                         loadDataCallback();
                    });
                } else if (menuItem.classList.contains('copy-item')) {
                    const content = decodeURIComponent(menuItem.dataset.content);
                    handleSmartCopy(prompt.id, content, 'copy');
                }
                return;
            }
        });

        listBody.appendChild(row);
    });

    container.appendChild(wrapper);
    
    // Register rendered IDs for bulk select
    const existing = bulkManager.currentRenderedIds || [];
    bulkManager.setRenderedIds([...existing, ...prompts.map(p => p.id)]);
    bulkManager.updateUI();
    
    renderIcons();

    // Only allow drag drop if it's the main list, OR allow on both but handle separately.
    // For Quick Access, drag drop might reorder pinned items (future feature).
    // For now, let's enable it everywhere, but the library.js logic handles the updateDoc based on ID.
    initDragAndDrop(listBody, async (newIds, oldIndex, newIndex) => {
        if (newIds.length < 2) return;
        const movedItemId = newIds[newIndex];
        const getOrder = (id) => {
            const p = prompts.find(x => x.id === id);
            return typeof p?.order === 'number' ? p.order : (p?.createdAt?.seconds * 1000 || 0);
        };

        const prevId = newIndex > 0 ? newIds[newIndex - 1] : null;
        const nextId = newIndex < newIds.length - 1 ? newIds[newIndex + 1] : null;
        let newOrder;

        if (!prevId) newOrder = getOrder(nextId) + 100000;
        else if (!nextId) newOrder = getOrder(prevId) - 100000;
        else newOrder = (getOrder(prevId) + getOrder(nextId)) / 2;
        
        try {
            await updateDoc(doc(db, "prompts", movedItemId), { order: newOrder });
        } catch (error) {
            console.error("Order update failed", error);
            showToast("Failed to reorder", "error");
        }
    }, {
        handle: '.list-row-item'
    });
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
