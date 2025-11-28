
import { db } from '../../js/config.js';
import { collection, getDocs, orderBy, query, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, showConfirmToast, renderIcons } from '../../js/utils.js';
import { router } from '../../js/app.js';
import { renderCommandBar } from '../command-bar/command-bar.js';
import { initDragAndDrop } from '../drag-and-drop/drag-and-drop.js';
import { getCategories } from '../categories/categories.js';
import { openEditorModal } from '../editor/editor.js';
import { handleSmartCopy } from '../variable-injector/variable-injector.js';
import { fetchCollections, renderCollectionsGrid } from '../collections/collections.js';
import { softDeletePrompt } from '../deleted-items/deleted-items.js';
import { BulkActionManager } from '../bulk-edit/bulk-edit.js';
import { renderListView } from '../list-view/list-view.js';
import { openQuickLook } from '../quick-look/quick-look.js';
import { renderSplitView } from '../split-view/split-view.js';
import { togglePin } from '../quick-access/quick-access.js';

let allPrompts = [];
let allCollections = [];
let currentCategories = {};

// View State: GRID, LIST, SPLIT, COLLECTIONS
let viewState = 'GRID'; 
let activeCollection = null;

let currentFilterState = {
    search: '',
    filters: {
        sort: 'custom', 
        categories: [],
        tags: []
    }
};

// Initialize Bulk Manager
const bulkManager = new BulkActionManager({
    onRefresh: () => loadData()
});

let loadDataRef = null;

export const renderLibrary = async (container) => {
    container.innerHTML = `
        <div class="library-container container">
            <div id="command-bar-slot"></div>
            
            <div class="library-header-controls">
                <div class="view-tabs" id="viewTabs">
                    <button class="view-tab active" data-view="GRID">
                        <i data-feather="grid" width="16" height="16"></i> Cards
                    </button>
                    <button class="view-tab" data-view="LIST">
                        <i data-feather="list" width="16" height="16"></i> List
                    </button>
                    <button class="view-tab" data-view="SPLIT">
                        <i data-feather="columns" width="16" height="16"></i> Split View
                    </button>
                    <button class="view-tab" data-view="COLLECTIONS">
                        <i data-feather="folder" width="16" height="16"></i> Collections
                    </button>
                </div>
            </div>

            <div id="filter-indicator-slot"></div>

            <div id="loader" style="text-align:center; padding: 40px;">
                <i data-feather="loader" class="spin"></i>
            </div>
            
            <!-- Where Grid, List, Split or Collections render -->
            <div id="main-content-area"></div>
        </div>
    `;
    
    // Initialize Bulk Bar
    if(!document.getElementById('bulkActionBar')) {
        bulkManager.render(document.body);
    }

    const commandBarSlot = document.getElementById('command-bar-slot');
    const mainContentArea = document.getElementById('main-content-area');
    const loader = document.getElementById('loader');
    const filterSlot = document.getElementById('filter-indicator-slot');
    const viewTabsContainer = document.getElementById('viewTabs');

    bulkManager.clearSelection();

    // Function to fetch data and refresh
    const loadData = async () => {
        try {
            loader.style.display = 'block';
            if (!db) throw new Error("Firebase is not initialized");

            // Fetch Prompts
            const q = query(collection(db, "prompts"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            allPrompts = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => !p.deleted); 

            // Fetch Collections & Categories
            const [collectionsData, categoriesData] = await Promise.all([
                fetchCollections(),
                getCategories(true)
            ]);
            
            allCollections = collectionsData;
            currentCategories = categoriesData;

            loader.style.display = 'none';
            renderCurrentView();
        } catch (error) {
            console.error("Error fetching library:", error);
            loader.style.display = 'none';
            mainContentArea.innerHTML = `<p style="text-align:center; width:100%;">Failed to load data.</p>`;
        }
    };
    loadDataRef = loadData;

    window.addEventListener('library-data-changed', () => {
        loadData();
    });

    const handleKeydown = (e) => {
        if (!document.body.contains(mainContentArea)) {
            document.removeEventListener('keydown', handleKeydown);
            return;
        }

        if (viewState === 'SPLIT') return;

        if (e.code === 'Space' && 
            e.target.tagName !== 'INPUT' && 
            e.target.tagName !== 'TEXTAREA' && 
            !e.target.isContentEditable) {
            
            if (document.querySelector('.ql-overlay.visible')) return;

            if (bulkManager.selectedIds.size === 1) {
                e.preventDefault(); 
                const id = [...bulkManager.selectedIds][0];
                const prompt = allPrompts.find(p => p.id === id);
                if (prompt) openQuickLook(prompt, () => loadData());
            }
        }
    };
    document.addEventListener('keydown', handleKeydown);

    // Helper to render based on View State
    const renderCurrentView = () => {
        // Update Tabs UI
        const tabs = viewTabsContainer.querySelectorAll('.view-tab');
        tabs.forEach(t => {
            const targetView = t.dataset.view;
            const isActive = viewState === targetView || (viewState === 'COLLECTION_DETAIL' && targetView === 'COLLECTIONS');
            t.classList.toggle('active', isActive);
        });

        mainContentArea.innerHTML = '';
        mainContentArea.className = '';
        filterSlot.innerHTML = '';

        if (viewState === 'COLLECTIONS') {
            renderCollectionsGrid(
                mainContentArea, 
                allCollections, 
                allPrompts, 
                (coll) => {
                    activeCollection = coll;
                    viewState = 'COLLECTION_DETAIL';
                    renderCurrentView();
                },
                () => loadData()
            );
        } 
        else if (viewState === 'COLLECTION_DETAIL') {
            const breadcrumb = document.createElement('div');
            breadcrumb.className = 'collection-breadcrumb';
            breadcrumb.innerHTML = `
                <div class="breadcrumb-back" title="Back to Collections"><i data-feather="arrow-left" width="18" height="18"></i></div>
                <i data-feather="folder-open" width="20" height="20" style="margin-left:8px; color:var(--primary);"></i>
                <span>${escapeHtml(activeCollection.name)}</span>
            `;
            breadcrumb.querySelector('.breadcrumb-back').addEventListener('click', () => {
                viewState = 'COLLECTIONS';
                activeCollection = null;
                renderCurrentView();
            });
            mainContentArea.appendChild(breadcrumb);
            
            applyFiltersAndRender(mainContentArea, filterSlot, activeCollection.id, 'GRID');
        }
        else if (viewState === 'SPLIT') {
            applyFiltersAndRender(mainContentArea, filterSlot, null, 'SPLIT');
        }
        else if (viewState === 'LIST') {
            applyFiltersAndRender(mainContentArea, filterSlot, null, 'LIST');
        }
        else {
            // Default GRID
            applyFiltersAndRender(mainContentArea, filterSlot, null, 'GRID');
        }
        renderIcons();
    };

    await loadData();
    
    // Command Bar init
    const allTags = new Set();
    allPrompts.forEach(p => {
        if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach(t => allTags.add(t));
        }
    });
    
    renderCommandBar(commandBarSlot, {
        initialTags: Array.from(allTags),
        onSearch: (term) => {
            currentFilterState.search = term.toLowerCase();
            renderCurrentView();
        },
        onFilter: (filterData) => {
            currentFilterState.filters = filterData;
            renderCurrentView();
        },
        onCreate: () => {
            openEditorModal(null, () => loadData());
        }
    });

    viewTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-tab');
        if (!btn) return;
        const view = btn.dataset.view;
        viewState = view;
        activeCollection = null; 
        bulkManager.clearSelection(); 
        renderCurrentView();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.footer-actions') && !e.target.closest('.col-actions')) {
            document.querySelectorAll('.card-menu-dropdown.active').forEach(el => el.classList.remove('active'));
        }
    });

    // Event Delegation (Grid/List Card Clicks)
    mainContentArea.addEventListener('click', async (e) => {
        if (viewState === 'SPLIT') return;

        // Pin Button
        const pinBtn = e.target.closest('.pin-btn') || e.target.closest('.list-pin-btn');
        if (pinBtn) {
            e.stopPropagation();
            const card = pinBtn.closest('.prompt-card') || pinBtn.closest('.list-row-item');
            const id = card.dataset.id;
            const isPinned = pinBtn.classList.contains('active');
            
            // Toggle Visuals immediately for responsiveness
            pinBtn.classList.toggle('active');
            const icon = pinBtn.querySelector('i');
            if(icon) icon.classList.toggle('fill-current'); // Assuming utility class or just rely on CSS

            await togglePin(id, isPinned);
            loadData(); // Reload to re-sort/move items
            return;
        }

        // Quick Look Button
        const quickLookBtn = e.target.closest('.quick-look-btn');
        if (quickLookBtn) {
            e.stopPropagation();
            const card = quickLookBtn.closest('.prompt-card') || quickLookBtn.closest('.list-row-item');
            const id = card.dataset.id;
            const prompt = allPrompts.find(p => p.id === id);
            if (prompt) openQuickLook(prompt, () => loadData());
            return;
        }

        // Card Selection (Shift+Click or Meta+Click)
        const card = e.target.closest('.prompt-card') || e.target.closest('.list-row-item');
        if (card) {
             if (!e.target.closest('button') && !e.target.closest('.action-btn') && !e.target.closest('.card-menu-item') && !e.target.closest('.card-menu-dropdown')) {
                 if (e.shiftKey || e.metaKey || e.ctrlKey || e.target.closest('.list-checkbox-wrapper')) {
                     if (!e.target.closest('.list-checkbox-wrapper')) {
                         e.preventDefault();
                         e.stopPropagation();
                     }
                     if (window.getSelection) window.getSelection().removeAllRanges();
                     
                     const id = card.dataset.id;
                     bulkManager.toggle(id, e.shiftKey);
                     return;
                 }
             }
        }

        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const card = copyBtn.closest('.prompt-card');
            const id = card.dataset.id;
            const htmlContent = decodeURIComponent(copyBtn.dataset.content);
            handleSmartCopy(id, htmlContent, 'copy');
            return;
        }

        const menuBtn = e.target.closest('.menu-btn'); 
        if (menuBtn) {
            e.stopPropagation();
            const currentDropdown = menuBtn.nextElementSibling;
            document.querySelectorAll('.card-menu-dropdown.active').forEach(el => {
                if (el !== currentDropdown) el.classList.remove('active');
            });
            currentDropdown.classList.toggle('active');
            return;
        }

        const menuItem = e.target.closest('.card-menu-item');
        if (menuItem) {
            e.stopPropagation();
            const dropdown = menuItem.closest('.card-menu-dropdown');
            dropdown.classList.remove('active');
            const id = menuItem.dataset.id;
            if (menuItem.classList.contains('edit-item')) {
                openEditorModal(id, () => loadData());
            } 
            else if (menuItem.classList.contains('duplicate-item')) {
                openEditorModal(null, () => loadData(), id);
            }
            else if (menuItem.classList.contains('delete-item')) {
                showConfirmToast('Move this prompt to trash?', async () => {
                    const card = dropdown.closest('.prompt-card') || dropdown.closest('.list-row-item');
                    if (card) card.style.opacity = '0.5';
                    const success = await softDeletePrompt(id);
                    if (success) {
                        loadData();
                    } else {
                        if(card) card.style.opacity = '1';
                    }
                });
            }
        }
    });
};

function loadData() {
    if (loadDataRef) loadDataRef();
}

function applyFiltersAndRender(container, filterSlot, collectionId, viewType) {
    const { search, filters } = currentFilterState;
    let filtered = [...allPrompts];

    if (collectionId) {
        filtered = filtered.filter(p => p.collectionId === collectionId);
    }
    if (search) {
        filtered = filtered.filter(p => {
            const title = (p.title || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const tags = (p.tags || []).join(' ').toLowerCase();
            return title.includes(search) || desc.includes(search) || tags.includes(search);
        });
    }
    if (filters.categories && filters.categories.length > 0) {
        filtered = filtered.filter(p => {
            if (!p.categories) return false;
            return filters.categories.some(selectedId => p.categories.includes(selectedId));
        });
    }
    if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(p => {
            if (!p.tags) return false;
            return filters.tags.every(selectedTag => p.tags.includes(selectedTag));
        });
    }

    // Sort Logic
    filtered.sort((a, b) => {
        const getOrder = (p) => typeof p.order === 'number' ? p.order : (p.createdAt?.seconds * 1000 || 0);

        switch (filters.sort) {
            case 'popularity': 
                return (b.usageCount || 0) - (a.usageCount || 0); 
            case 'custom': return getOrder(b) - getOrder(a);
            case 'oldest': return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            case 'az': return a.title.localeCompare(b.title);
            case 'za': return b.title.localeCompare(a.title);
            case 'newest': default: return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        }
    });

    renderFilterIndicators(filterSlot, filters);

    // --- QUICK ACCESS LOGIC ---
    // Only show Quick Access separation in Root Library View (no collection) and when viewing Grid or List
    const showQuickAccess = !collectionId && !search && (viewType === 'GRID' || viewType === 'LIST');
    
    if (showQuickAccess) {
        const pinned = filtered.filter(p => p.pinned);
        const unpinned = filtered.filter(p => !p.pinned);

        if (pinned.length > 0) {
            // Render Pinned Section
            const qaHeader = document.createElement('div');
            qaHeader.className = 'quick-access-header';
            qaHeader.innerHTML = `<i data-feather="bookmark" width="16" height="16"></i> Quick Access`;
            container.appendChild(qaHeader);

            const qaContainer = document.createElement('div');
            qaContainer.className = viewType === 'LIST' ? 'list-view-container' : 'library-grid';
            container.appendChild(qaContainer);

            // Render Pinned Items
            if (viewType === 'LIST') {
                renderListView(qaContainer, pinned, allCollections, bulkManager, loadData, true); // true = hide header for duplicates? Or separate? 
                // Actually renderListView creates a wrapper. 
                // We might need to adjust renderListView to be cleaner for multiple instances.
                // For now, let's just let it render standard list.
            } else {
                renderGrid(qaContainer, pinned);
            }

            // Render Main Section Header
            const mainHeader = document.createElement('div');
            mainHeader.className = 'main-library-header';
            mainHeader.innerHTML = `<i data-feather="layers" width="16" height="16"></i> All Prompts`;
            container.appendChild(mainHeader);

            // Render Unpinned Container
            const mainContainer = document.createElement('div');
            mainContainer.className = viewType === 'LIST' ? 'list-view-container' : 'library-grid';
            container.appendChild(mainContainer);

            if (viewType === 'LIST') {
                renderListView(mainContainer, unpinned, allCollections, bulkManager, loadData, false); // false = show header
            } else {
                renderGrid(mainContainer, unpinned);
            }
            
            // Note: Drag and drop currently enabled on both separately, moving across sections is a future enhancement
            return;
        }
    }

    // Default Rendering (Single List/Grid)
    if (viewType === 'SPLIT') {
        renderSplitView(container, filtered, allCollections, {
            onEdit: (id) => openEditorModal(id, () => loadData()),
            onRefresh: () => loadData()
        });
    } 
    else if (viewType === 'LIST') {
        renderListView(container, filtered, allCollections, bulkManager, loadData);
    } 
    else {
        const gridDiv = document.createElement('div');
        gridDiv.className = 'library-grid';
        container.appendChild(gridDiv);
        renderGrid(gridDiv, filtered);
    }
}

function renderFilterIndicators(container, filters) {
    container.innerHTML = ''; 
}

function renderGrid(container, prompts) {
    // Append this list to the global bulk tracking
    const currentRendered = bulkManager.currentRenderedIds || [];
    bulkManager.setRenderedIds([...currentRendered, ...prompts.map(p => p.id)]);

    if (prompts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="inbox" style="width: 48px; height: 48px; opacity: 0.5;"></i>
                <p>No prompts found.</p>
            </div>
        `;
        renderIcons();
        return;
    }

    container.innerHTML = prompts.map(prompt => {
        const displayDesc = prompt.description || 'No description available.';
        const isSelected = bulkManager.selectedIds.has(prompt.id);
        const isPinned = prompt.pinned === true;
        
        const categoryIconsHtml = (prompt.categories || [])
            .map(catId => {
                const config = currentCategories[catId];
                if (!config) return '';
                return `
                    <div class="category-icon-badge" 
                          title="${config.label}" 
                          style="color: ${config.color}; background-color: ${config.bg}; border-color: ${config.border};">
                        <i data-feather="${config.icon || 'circle'}" width="16" height="16"></i>
                    </div>
                `;
            })
            .join('');

        const generalTagsHtml = (prompt.tags || [])
            .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
            .join('');

        return `
            <div class="prompt-card ${isSelected ? 'selected' : ''}" data-id="${prompt.id}">
                <button class="pin-btn ${isPinned ? 'active' : ''}" title="${isPinned ? 'Unpin' : 'Pin to Quick Access'}">
                    <i data-feather="bookmark" width="16" height="16"></i>
                </button>

                <div class="card-header">
                    <div class="card-title-wrapper">
                        ${categoryIconsHtml ? `<div class="category-icons">${categoryIconsHtml}</div>` : ''}
                        <h3 class="card-title">${escapeHtml(prompt.title)}</h3>
                    </div>
                    <div class="tags-container">
                        ${generalTagsHtml}
                    </div>
                </div>
                <div class="card-content">${escapeHtml(displayDesc)}</div>
                <div class="card-footer">
                    <div class="footer-left" style="display:flex; gap:8px;">
                        <button class="action-btn copy-btn" data-content="${encodeURIComponent(prompt.content || '')}" title="Copy Content">
                            <i data-feather="copy"></i>
                        </button>
                        <button class="action-btn quick-look-btn" title="Quick Look">
                            <i data-feather="eye"></i>
                        </button>
                    </div>
                    <div class="footer-actions">
                        <button class="action-btn menu-btn" title="More Actions">
                            <i data-feather="menu"></i>
                        </button>
                        <div class="card-menu-dropdown">
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
                </div>
            </div>
        `;
    }).join('');

    renderIcons();
    bulkManager.updateUI();

    initDragAndDrop(container, async (newIds, oldIndex, newIndex) => {
        if (newIds.length < 2) return;
        const movedItemId = newIds[newIndex];
        const getOrder = (id) => {
            const p = allPrompts.find(x => x.id === id);
            return typeof p?.order === 'number' ? p.order : (p?.createdAt?.seconds * 1000 || 0);
        };
        const prevId = newIndex > 0 ? newIds[newIndex - 1] : null;
        const nextId = newIndex < newIds.length - 1 ? newIds[newIndex + 1] : null;
        let newOrder;
        if (!prevId) {
            newOrder = getOrder(nextId) + 100000;
        } else if (!nextId) {
            newOrder = getOrder(prevId) - 100000;
        } else {
            const valAbove = getOrder(prevId);
            const valBelow = getOrder(nextId);
            newOrder = (valAbove + valBelow) / 2;
        }
        
        const pIndex = allPrompts.findIndex(p => p.id === movedItemId);
        if(pIndex > -1) {
            allPrompts[pIndex].order = newOrder;
        }
        
        if (currentFilterState.filters.sort !== 'custom') {
            currentFilterState.filters.sort = 'custom';
        }

        try {
            await updateDoc(doc(db, "prompts", movedItemId), { order: newOrder });
        } catch (error) {
            console.error("Error updating order:", error);
            showToast("Failed to save new order", "error");
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
