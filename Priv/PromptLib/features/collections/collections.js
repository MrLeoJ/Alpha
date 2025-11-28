
import { db } from '../../js/config.js';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, showConfirmToast, renderIcons } from '../../js/utils.js';
import { initDragAndDrop } from '../drag-and-drop/drag-and-drop.js';

/**
 * Fetches all collections from Firestore
 */
export const fetchCollections = async () => {
    try {
        if (!db) return [];
        // We still fetch by createdAt to have a deterministic query, but we will sort by 'order' in JS
        const q = query(collection(db, "collections"));
        const snapshot = await getDocs(q);
        let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort by order (asc), fallback to createdAt
        items.sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : ((a.createdAt?.seconds || 0) * 1000);
            const orderB = typeof b.order === 'number' ? b.order : ((b.createdAt?.seconds || 0) * 1000);
            return orderA - orderB;
        });
        
        return items;
    } catch (error) {
        console.error("Error fetching collections:", error);
        return [];
    }
};

/**
 * Creates a new collection document
 */
export const createCollection = async (data) => {
    try {
        await addDoc(collection(db, "collections"), {
            name: data.name.trim(),
            coverImage: data.coverImage || null,
            createdAt: serverTimestamp(),
            order: Date.now(), // Use timestamp as default order for now
            color: '#fe6a5f' 
        });
        showToast('Collection created', 'success');
        return true;
    } catch (error) {
        console.error("Error creating collection:", error);
        showToast('Failed to create collection', 'error');
        return false;
    }
};

/**
 * Updates an existing collection
 */
export const updateCollection = async (id, data) => {
    try {
        await updateDoc(doc(db, "collections", id), {
            name: data.name.trim(),
            coverImage: data.coverImage || null,
            updatedAt: serverTimestamp()
        });
        showToast('Collection updated', 'success');
        return true;
    } catch (error) {
        console.error("Error updating collection:", error);
        showToast('Failed to update collection', 'error');
        return false;
    }
};

/**
 * Deletes a collection
 */
export const deleteCollection = async (id) => {
    try {
        await deleteDoc(doc(db, "collections", id));
        showToast('Collection deleted', 'success');
        return true;
    } catch (error) {
        console.error("Error deleting collection:", error);
        showToast('Failed to delete', 'error');
        return false;
    }
};

/**
 * Reorders a collection
 */
export const reorderCollection = async (id, newOrder) => {
    try {
        await updateDoc(doc(db, "collections", id), { order: newOrder });
    } catch (error) {
        console.error("Error reordering:", error);
    }
};

/**
 * Renders the modal to create OR edit a collection
 */
export const openCollectionModal = (existingData = null, onSuccess) => {
    const isEdit = !!existingData;
    const overlay = document.createElement('div');
    overlay.className = 'collection-modal-overlay';
    
    // Initial Image State
    let currentImageBase64 = existingData?.coverImage || null;

    overlay.innerHTML = `
        <div class="collection-modal">
            <div class="cm-title">${isEdit ? 'Edit Collection' : 'New Collection'}</div>
            
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" id="collNameInput" class="form-input" placeholder="e.g. Q3 Marketing" autocomplete="off" value="${isEdit ? escapeHtml(existingData.name) : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Collection Icon</label>
                <div class="cm-preview" id="imagePreview" ${currentImageBase64 ? `style="background-image:url('${currentImageBase64}')"` : ''}>
                    ${currentImageBase64 ? '' : `
                    <div class="cm-preview-text">
                        <i data-feather="image" width="24" height="24"></i>
                        <span>Upload Icon</span>
                    </div>
                    `}
                </div>
                <input type="file" id="fileInput" accept="image/*" style="display:none;">
                ${currentImageBase64 ? '<div style="margin-top:4px;"><small id="removeImageBtn" style="color:red; cursor:pointer;">Remove Icon</small></div>' : ''}
            </div>

            <div class="cm-actions">
                <button class="btn btn-secondary" id="cmCancel">Cancel</button>
                <button class="btn btn-primary" id="cmSave">${isEdit ? 'Save Changes' : 'Create'}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    renderIcons();
    
    // Animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const input = overlay.querySelector('#collNameInput');
    const cancelBtn = overlay.querySelector('#cmCancel');
    const saveBtn = overlay.querySelector('#cmSave');
    const fileInput = overlay.querySelector('#fileInput');
    const imagePreview = overlay.querySelector('#imagePreview');
    const removeImageBtn = overlay.querySelector('#removeImageBtn');

    setTimeout(() => input.focus(), 100);

    // --- Image Upload Logic ---
    imagePreview.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Limit size? 500KB roughly
            if (file.size > 500 * 1024) {
                showToast('Image too large. Please use < 500KB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                currentImageBase64 = ev.target.result;
                imagePreview.style.backgroundImage = `url('${currentImageBase64}')`;
                imagePreview.innerHTML = ''; // Remove placeholder text
                // Check if we need to add remove button dynamically
                if(!overlay.querySelector('#removeImageBtn')) {
                     const btnHtml = '<div style="margin-top:4px;"><small id="removeImageBtn" style="color:red; cursor:pointer;">Remove Icon</small></div>';
                     imagePreview.insertAdjacentHTML('afterend', btnHtml);
                     overlay.querySelector('#removeImageBtn').addEventListener('click', clearImage);
                }
            };
            reader.readAsDataURL(file);
        }
    });

    const clearImage = () => {
        currentImageBase64 = null;
        imagePreview.style.backgroundImage = 'none';
        imagePreview.innerHTML = `
            <div class="cm-preview-text">
                <i data-feather="image" width="24" height="24"></i>
                <span>Upload Icon</span>
            </div>
        `;
        renderIcons();
        const btn = overlay.querySelector('#removeImageBtn');
        if(btn) btn.parentElement.remove();
        fileInput.value = '';
    };

    if (removeImageBtn) removeImageBtn.addEventListener('click', clearImage);

    // --- Close Logic ---
    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 250);
    };

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    // --- Save Logic ---
    const submit = async () => {
        const name = input.value;
        if (!name) return;
        
        saveBtn.innerHTML = '<i data-feather="loader" class="spin"></i> Saving...';
        renderIcons();
        
        let success = false;
        if (isEdit) {
            success = await updateCollection(existingData.id, { name, coverImage: currentImageBase64 });
        } else {
            success = await createCollection({ name, coverImage: currentImageBase64 });
        }

        if (success) {
            close();
            if (onSuccess) onSuccess();
        } else {
            saveBtn.innerHTML = isEdit ? 'Save Changes' : 'Create';
        }
    };

    saveBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
    });
};

/**
 * Renders the grid of collections
 */
export const renderCollectionsGrid = (container, collections, allPrompts, onFolderClick, onRefresh) => {
    container.innerHTML = '';
    container.className = 'collections-grid';

    // Sort collections locally to ensure UI reflects 'order' updates even if 'collections' array wasn't re-fetched
    const sortedCollections = [...collections].sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : ((a.createdAt?.seconds || 0) * 1000);
        const orderB = typeof b.order === 'number' ? b.order : ((b.createdAt?.seconds || 0) * 1000);
        return orderA - orderB;
    });

    // 1. "Create New" Card (Fixed position)
    const createCard = document.createElement('div');
    createCard.className = 'collection-card create-collection-card';
    createCard.innerHTML = `
        <i data-feather="folder-plus" width="32" height="32"></i>
        <span>New Collection</span>
    `;
    createCard.addEventListener('click', () => {
        openCollectionModal(null, onRefresh);
    });
    
    // Wrapper for sortable items
    container.appendChild(createCard);

    // 2. Render Collection Cards
    sortedCollections.forEach(coll => {
        // Count prompts in this collection
        const count = allPrompts.filter(p => p.collectionId === coll.id).length;
        const hasImage = !!coll.coverImage;

        const card = document.createElement('div');
        card.className = 'collection-card';
        card.dataset.id = coll.id; // For drag and drop identification

        card.innerHTML = `
            <div class="collection-actions">
                <button class="collection-action-btn edit-coll-btn" title="Edit Collection">
                    <i data-feather="edit-2" width="14" height="14"></i>
                </button>
                <button class="collection-action-btn delete-coll-btn" title="Delete Collection">
                    <i data-feather="trash-2" width="14" height="14"></i>
                </button>
            </div>
            
            <div class="collection-icon" ${hasImage ? `style="background-image: url('${coll.coverImage}')"` : ''}>
                ${!hasImage ? '<i data-feather="folder" width="28" height="28"></i>' : ''}
            </div>
            
            <div class="collection-info">
                <div class="collection-name">${escapeHtml(coll.name)}</div>
                <div class="collection-count">${count} prompt${count !== 1 ? 's' : ''}</div>
            </div>
        `;

        // Click on folder (navigate)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.collection-actions')) return;
            onFolderClick(coll);
        });

        // Edit action
        const editBtn = card.querySelector('.edit-coll-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCollectionModal(coll, onRefresh);
        });

        // Delete action
        const deleteBtn = card.querySelector('.delete-coll-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmToast(`Delete "${coll.name}"? Prompts will remain but be unorganized.`, async () => {
                await deleteCollection(coll.id);
                onRefresh();
            });
        });

        container.appendChild(card);
    });

    renderIcons();

    // 3. Init Drag & Drop
    // SortableJS will see the 'Create Card' as index 0 (even though it's not draggable).
    // Our 'collections' array and 'newIds' map (from filtered children) only contains the actual collection items.
    
    // Determine offset: If 'Create Card' exists, Sortable indices are shifted by 1 relative to our data array.
    const hasCreateCard = container.querySelector('.create-collection-card');
    const indexOffset = hasCreateCard ? 1 : 0;

    initDragAndDrop(container, async (newIds, oldIndex, newIndex) => {
        // Adjust index to match the newIds array (which excludes create-card)
        const adjustedNewIndex = newIndex - indexOffset;
        
        // Safety check
        if (adjustedNewIndex < 0 || adjustedNewIndex >= newIds.length) return;
        if (newIds.length < 2) return;
        
        const movedId = newIds[adjustedNewIndex];
        
        // Calculate new order value
        // We look at neighbors in the NEW list.
        const prevId = adjustedNewIndex > 0 ? newIds[adjustedNewIndex - 1] : null;
        const nextId = adjustedNewIndex < newIds.length - 1 ? newIds[adjustedNewIndex + 1] : null;

        // Helper to get current order
        const getOrder = (id) => {
            const c = collections.find(x => x.id === id);
            return typeof c?.order === 'number' ? c.order : ((c?.createdAt?.seconds || 0) * 1000);
        };

        let newOrderVal;
        
        // Logic for ASCENDING sort (Small -> Large)
        // Top of list (visual) = Smallest Order value
        
        if (!prevId) {
            // Moved to top (visually first after create card). 
            // Should be smaller than the new 'next' item.
            newOrderVal = getOrder(nextId) - 100000;
        } else if (!nextId) {
            // Moved to bottom. Larger than 'prev'.
            newOrderVal = getOrder(prevId) + 100000;
        } else {
            // Between
            newOrderVal = (getOrder(prevId) + getOrder(nextId)) / 2;
        }

        // Optimistic update
        const cIndex = collections.findIndex(c => c.id === movedId);
        if(cIndex > -1) collections[cIndex].order = newOrderVal;

        await reorderCollection(movedId, newOrderVal);

    }, {
        draggable: '.collection-card[data-id]', // Only drag cards with ID (excludes Create Card)
        filter: '.create-collection-card', // Explicitly prevent dragging the create card
    });
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
