
import { db } from '../../js/config.js';
import { doc, updateDoc, serverTimestamp, deleteDoc, collection, getDocs, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, showConfirmToast, renderIcons } from '../../js/utils.js';

/**
 * Soft deletes a prompt (sets deleted: true)
 */
export const softDeletePrompt = async (id) => {
    try {
        const ref = doc(db, "prompts", id);
        await updateDoc(ref, {
            deleted: true,
            deletedAt: serverTimestamp()
        });
        showToast('Moved to Trash', 'success');
        return true;
    } catch (error) {
        console.error("Soft delete failed", error);
        showToast('Failed to delete', 'error');
        return false;
    }
};

/**
 * Restores a prompt from trash
 */
export const restorePrompt = async (id) => {
    try {
        const ref = doc(db, "prompts", id);
        await updateDoc(ref, {
            deleted: false,
            deletedAt: null
        });
        showToast('Prompt restored', 'success');
        return true;
    } catch (error) {
        console.error("Restore failed", error);
        showToast('Failed to restore', 'error');
        return false;
    }
};

/**
 * Permanently deletes a prompt
 */
export const permanentDeletePrompt = async (id) => {
    try {
        await deleteDoc(doc(db, "prompts", id));
        showToast('Permanently deleted', 'success');
        return true;
    } catch (error) {
        console.error("Permanent delete failed", error);
        showToast('Failed to delete', 'error');
        return false;
    }
};

/**
 * Empties the entire trash
 */
export const emptyTrash = async () => {
    try {
        const q = query(collection(db, "prompts"), where("deleted", "==", true));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            showToast('Trash is already empty', 'info');
            return true;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        showToast('Trash emptied', 'success');
        return true;
    } catch (error) {
        console.error("Empty trash failed", error);
        showToast('Failed to empty trash', 'error');
        return false;
    }
};

/**
 * Renders the Trash Bin Modal
 */
export const renderTrashModal = async () => {
    showToast('Loading Trash...', 'info');

    // Fetch deleted items
    let deletedItems = [];
    try {
        const q = query(collection(db, "prompts"), where("deleted", "==", true));
        const snapshot = await getDocs(q);
        deletedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by deletedAt desc
        deletedItems.sort((a, b) => (b.deletedAt?.seconds || 0) - (a.deletedAt?.seconds || 0));
    } catch (e) {
        console.error(e);
        showToast('Failed to load trash', 'error');
        return;
    }

    // Create Modal UI
    const overlay = document.createElement('div');
    overlay.className = 'injector-overlay visible'; // Reuse existing overlay styles
    
    overlay.innerHTML = `
        <div class="manage-modal" style="height: 600px; max-height: 85vh;">
            <div class="manage-header">
                <div class="manage-title">Trash Bin</div>
                <button class="injector-close-btn" id="closeTrashBtn"><i data-feather="x"></i></button>
            </div>
            <div class="manage-body">
                ${deletedItems.length > 0 ? `
                <div class="trash-header-actions">
                    <button class="empty-trash-btn" id="emptyTrashBtn">
                        <i data-feather="trash-2" width="14" height="14"></i> Empty Trash
                    </button>
                </div>
                ` : ''}
                
                <div class="trash-list" id="trashList">
                    <!-- Items go here -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    const listContainer = overlay.querySelector('#trashList');

    const renderList = () => {
        listContainer.innerHTML = '';
        
        if (deletedItems.length === 0) {
            listContainer.innerHTML = `
                <div class="trash-empty-state">
                    <i data-feather="trash" width="48" height="48" style="opacity:0.2"></i>
                    <p>Trash is empty</p>
                </div>
            `;
            const headerActions = overlay.querySelector('.trash-header-actions');
            if (headerActions) headerActions.style.display = 'none';
        } else {
            deletedItems.forEach(item => {
                const el = document.createElement('div');
                el.className = 'trash-item';
                
                const dateStr = item.deletedAt ? new Date(item.deletedAt.seconds * 1000).toLocaleDateString() : 'Unknown date';

                el.innerHTML = `
                    <div class="trash-item-info">
                        <div class="trash-item-title" title="${item.title || 'Untitled'}">${item.title || 'Untitled'}</div>
                        <div class="trash-item-meta">
                            <i data-feather="calendar" width="12" height="12"></i> Deleted: ${dateStr}
                        </div>
                    </div>
                    <div class="trash-actions">
                        <button class="icon-btn restore-btn" title="Restore" data-id="${item.id}">
                            <i data-feather="rotate-ccw" width="18" height="18"></i>
                        </button>
                        <button class="icon-btn danger delete-forever-btn" title="Delete Forever" data-id="${item.id}">
                            <i data-feather="x-circle" width="18" height="18"></i>
                        </button>
                    </div>
                `;

                // Restore
                el.querySelector('.restore-btn').addEventListener('click', async () => {
                    await restorePrompt(item.id);
                    deletedItems = deletedItems.filter(i => i.id !== item.id);
                    renderList();
                });

                // Delete Forever
                el.querySelector('.delete-forever-btn').addEventListener('click', () => {
                    showConfirmToast('Permanently delete this prompt? This cannot be undone.', async () => {
                        await permanentDeletePrompt(item.id);
                        deletedItems = deletedItems.filter(i => i.id !== item.id);
                        renderList();
                    });
                });

                listContainer.appendChild(el);
            });
        }
        renderIcons();
    };

    renderList();

    // Event Listeners
    const close = () => {
        overlay.remove();
        // Trigger a refresh on the main library just in case restored items need to appear
        // Dispatching a custom event or calling a global reload would be ideal.
        // For now, we rely on the user refreshing or the next interaction, 
        // OR we can trigger a navigation reload if we import router.
        // Let's use a simple event dispatch that library.js listens to?
        // Or simpler: reload logic is tied to library render.
        const event = new CustomEvent('library-data-changed');
        window.dispatchEvent(event);
    };

    overlay.querySelector('#closeTrashBtn').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
    });

    const emptyBtn = overlay.querySelector('#emptyTrashBtn');
    if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
            showConfirmToast('Are you sure you want to empty the trash? All items will be permanently lost.', async () => {
                await emptyTrash();
                deletedItems = [];
                renderList();
            });
        });
    }
};
