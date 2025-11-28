
import { db } from '../../js/config.js';
import { doc, writeBatch, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, showConfirmToast, renderIcons } from '../../js/utils.js';
import { fetchCollections } from '../collections/collections.js';

export class BulkActionManager {
    constructor(callbacks) {
        this.selectedIds = new Set();
        this.onRefresh = callbacks.onRefresh; // To reload library
        this.currentRenderedIds = []; // To handle Shift+Click logic
        this.lastCheckedId = null;
        this.container = null;
    }

    setRenderedIds(ids) {
        this.currentRenderedIds = ids;
    }

    render(container) {
        this.container = container; // We assume this is a wrapper or body where we append the bar
        
        // Create Bar HTML
        const bar = document.createElement('div');
        bar.className = 'bulk-action-bar';
        bar.id = 'bulkActionBar';
        bar.innerHTML = `
            <div class="bulk-info">
                <span id="bulkCount">0 Selected</span>
                <a href="#" id="bulkSelectAll" style="font-size:0.8rem; color:var(--primary); text-decoration:none;">Select All</a>
            </div>
            <div class="bulk-divider"></div>
            <div class="bulk-actions">
                <button class="bulk-btn" id="bulkMoveBtn">
                    <i data-feather="folder" width="16" height="16"></i> Move
                </button>
                <button class="bulk-btn" id="bulkTagBtn">
                    <i data-feather="tag" width="16" height="16"></i> Tag
                </button>
                <button class="bulk-btn danger" id="bulkDeleteBtn">
                    <i data-feather="trash-2" width="16" height="16"></i> Delete
                </button>
            </div>
            <button class="bulk-close-btn" id="bulkCancelBtn" title="Exit Selection Mode">
                <i data-feather="x" width="18" height="18"></i>
            </button>
        `;

        document.body.appendChild(bar);
        renderIcons();

        // Listeners
        document.getElementById('bulkCancelBtn').addEventListener('click', () => this.clearSelection());
        document.getElementById('bulkMoveBtn').addEventListener('click', () => this.handleMove());
        document.getElementById('bulkTagBtn').addEventListener('click', () => this.handleTag());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.handleDelete());
        document.getElementById('bulkSelectAll').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSelectAll();
        });
    }

    updateUI() {
        const bar = document.getElementById('bulkActionBar');
        const countSpan = document.getElementById('bulkCount');
        const count = this.selectedIds.size;

        if (count > 0) {
            bar.classList.add('visible');
            document.body.classList.add('is-bulk-selecting');
        } else {
            bar.classList.remove('visible');
            document.body.classList.remove('is-bulk-selecting');
        }

        countSpan.textContent = `${count} Selected`;

        // Update Cards/Rows visually
        document.querySelectorAll('.prompt-card, .list-row-item').forEach(el => {
            const id = el.dataset.id;
            if (this.selectedIds.has(id)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    toggle(id, isShiftKey) {
        if (isShiftKey && this.lastCheckedId && this.currentRenderedIds.includes(id) && this.currentRenderedIds.includes(this.lastCheckedId)) {
            // Range Selection
            const idx1 = this.currentRenderedIds.indexOf(this.lastCheckedId);
            const idx2 = this.currentRenderedIds.indexOf(id);
            const start = Math.min(idx1, idx2);
            const end = Math.max(idx1, idx2);
            
            // Check if we are selecting or deselecting based on the target state?
            // Standard behavior: select range.
            for (let i = start; i <= end; i++) {
                this.selectedIds.add(this.currentRenderedIds[i]);
            }
        } else {
            // Standard Toggle
            if (this.selectedIds.has(id)) {
                this.selectedIds.delete(id);
            } else {
                this.selectedIds.add(id);
            }
        }

        this.lastCheckedId = id;
        this.updateUI();
    }

    handleSelectAll() {
        // If all currently rendered are selected, deselect them. Otherwise select all.
        const allSelected = this.currentRenderedIds.every(id => this.selectedIds.has(id));
        
        if (allSelected) {
            this.currentRenderedIds.forEach(id => this.selectedIds.delete(id));
        } else {
            this.currentRenderedIds.forEach(id => this.selectedIds.add(id));
        }
        this.updateUI();
    }

    clearSelection() {
        this.selectedIds.clear();
        this.lastCheckedId = null;
        this.updateUI();
    }

    // --- Actions ---

    async handleMove() {
        // Fetch Collections
        const collections = await fetchCollections();
        
        // Modal
        const overlay = this.createModal('Move to Collection');
        const body = overlay.querySelector('.bulk-modal-content-body'); // custom class needed? No, just innerHTML
        
        const options = collections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Select Destination</label>
                <select id="bulkMoveSelect" class="form-select">
                    <option value="">None (Unorganized)</option>
                    ${options}
                </select>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                <button class="btn btn-secondary" id="bCancel">Cancel</button>
                <button class="btn btn-primary" id="bConfirm">Move ${this.selectedIds.size} Items</button>
            </div>
        `;
        
        const close = () => { overlay.remove(); };
        body.querySelector('#bCancel').addEventListener('click', close);
        
        body.querySelector('#bConfirm').addEventListener('click', async () => {
            const collectionId = body.querySelector('#bulkMoveSelect').value;
            const btn = body.querySelector('#bConfirm');
            btn.innerHTML = '<i data-feather="loader" class="spin"></i> Moving...';
            renderIcons();

            try {
                const batch = writeBatch(db);
                this.selectedIds.forEach(id => {
                    const ref = doc(db, "prompts", id);
                    batch.update(ref, { collectionId: collectionId });
                });
                await batch.commit();
                
                showToast(`Moved ${this.selectedIds.size} items`, 'success');
                this.clearSelection();
                close();
                this.onRefresh();
            } catch (e) {
                console.error(e);
                showToast('Failed to move items', 'error');
                btn.innerHTML = 'Try Again';
            }
        });
    }

    async handleTag() {
        const overlay = this.createModal('Add Tags');
        const body = overlay.querySelector('.bulk-modal-content-body');
        
        body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Add Tags (comma separated)</label>
                <input type="text" id="bulkTagsInput" class="form-input" placeholder="e.g. reviewed, 2024..." autocomplete="off">
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                <button class="btn btn-secondary" id="bCancel">Cancel</button>
                <button class="btn btn-primary" id="bConfirm">Apply</button>
            </div>
        `;

        const close = () => { overlay.remove(); };
        body.querySelector('#bCancel').addEventListener('click', close);
        
        body.querySelector('#bConfirm').addEventListener('click', async () => {
            const raw = body.querySelector('#bulkTagsInput').value;
            if (!raw.trim()) {
                 close(); 
                 return;
            }
            
            const tags = raw.split(',').map(t => t.trim()).filter(t => t.length > 0);
            const btn = body.querySelector('#bConfirm');
            btn.innerHTML = '<i data-feather="loader" class="spin"></i> Applying...';
            renderIcons();

            try {
                const batch = writeBatch(db);
                this.selectedIds.forEach(id => {
                    const ref = doc(db, "prompts", id);
                    // arrayUnion ensures uniqueness
                    batch.update(ref, { tags: arrayUnion(...tags) });
                });
                await batch.commit();
                
                showToast('Tags added successfully', 'success');
                this.clearSelection();
                close();
                this.onRefresh();
            } catch (e) {
                console.error(e);
                showToast('Failed to add tags', 'error');
                btn.innerHTML = 'Try Again';
            }
        });
        
        setTimeout(() => body.querySelector('input').focus(), 100);
    }

    handleDelete() {
        showConfirmToast(`Move ${this.selectedIds.size} items to trash?`, async () => {
            try {
                const batch = writeBatch(db);
                this.selectedIds.forEach(id => {
                    const ref = doc(db, "prompts", id);
                    batch.update(ref, { 
                        deleted: true,
                        deletedAt: serverTimestamp()
                    });
                });
                await batch.commit();
                
                showToast(`Deleted ${this.selectedIds.size} items`, 'success');
                this.clearSelection();
                this.onRefresh();
            } catch (e) {
                console.error(e);
                showToast('Failed to delete items', 'error');
            }
        });
    }

    // Helper: Create Simple Modal Overlay
    createModal(title) {
        const overlay = document.createElement('div');
        overlay.className = 'injector-overlay visible'; // Reuse
        overlay.style.zIndex = '5000'; // Above everything
        
        overlay.innerHTML = `
            <div class="bulk-modal-content">
                <div style="font-weight:600; font-size:1.1rem; color:var(--secondary); border-bottom:1px solid var(--border-color); padding-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                    ${title}
                    <i data-feather="x" style="cursor:pointer; opacity:0.5;" id="bmClose"></i>
                </div>
                <div class="bulk-modal-content-body"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        renderIcons();
        
        overlay.querySelector('#bmClose').addEventListener('click', () => overlay.remove());
        
        return overlay;
    }
}
