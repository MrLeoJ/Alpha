
import { getCurrentTheme, renderIcons, showToast, showConfirmToast, showInputToast } from '../../js/utils.js';
import { toggleCheatSheet } from '../keyboard-shortcuts/keyboard-shortcuts.js';
import { db } from '../../js/config.js';
import { collection, getDocs, writeBatch, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getLLMs, saveLLMs, resetLLMs } from '../launch/launch.js';
import { renderTrashModal } from '../deleted-items/deleted-items.js';
import { openImportWizard } from '../import-wizard/import-wizard.js';
import { getCategories, saveCategories, resetCategories, hexToRgba, sortCategories } from '../categories/categories.js';
import { initDragAndDrop } from '../drag-and-drop/drag-and-drop.js';

// Global State for Compact Mode
export const initSettings = () => {
    // Default to Compact Mode (true) if not explicitly set
    const savedSetting = localStorage.getItem('app-compact-mode');
    const isCompact = savedSetting === null ? true : savedSetting === 'true';
    
    if (isCompact) {
        document.body.classList.add('compact-mode');
    }
};

const toggleCompactMode = () => {
    const isCompact = document.body.classList.toggle('compact-mode');
    localStorage.setItem('app-compact-mode', isCompact);
    return isCompact;
};

// --- SETTINGS MENU RENDERER ---

export const renderSettingsMenu = (container) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-dropdown-wrapper';
    
    const isCompact = document.body.classList.contains('compact-mode');
    const currentTheme = getCurrentTheme(); // 'light' or 'dark'

    wrapper.innerHTML = `
        <div class="settings-dropdown">
            <!-- Row 1: Theme -->
            <div class="theme-row">
                <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-set-theme="light" title="Light Mode">
                    <i data-feather="sun" width="16" height="16"></i>
                </button>
                <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-set-theme="dark" title="Dark Mode">
                    <i data-feather="moon" width="16" height="16"></i>
                </button>
            </div>

            <!-- Row 2: Compact Mode -->
            <div class="compact-row">
                <span>Compact Mode</span>
                <div class="toggle-switch ${isCompact ? 'active' : ''}" id="compactToggle"></div>
            </div>

            <div class="settings-divider"></div>

            <!-- Row 3: Shortcuts -->
            <button class="settings-item" id="shortcutsBtn">
                <i data-feather="command" width="16" height="16"></i>
                <span>Keyboard Shortcuts</span>
            </button>

            <!-- Row 4: Export -->
            <button class="settings-item" id="exportBtn">
                <i data-feather="download" width="16" height="16"></i>
                <span>Export Data</span>
            </button>

             <!-- Row 4.5: Import -->
            <button class="settings-item" id="importBtn">
                <i data-feather="upload" width="16" height="16"></i>
                <span>Import Data</span>
            </button>
            
             <div class="settings-divider"></div>

            <!-- Row 5: Manage Tags -->
            <button class="settings-item" id="manageTagsBtn">
                <i data-feather="tag" width="16" height="16"></i>
                <span>Manage Tags</span>
            </button>
            
            <!-- Row 5.5: Manage Categories -->
            <button class="settings-item" id="manageCategoriesBtn">
                <i data-feather="grid" width="16" height="16"></i>
                <span>Manage Categories</span>
            </button>

            <!-- Row 6: Manage LLMs -->
            <button class="settings-item" id="manageLLMsBtn">
                <i data-feather="cpu" width="16" height="16"></i>
                <span>Manage LLMs</span>
            </button>
            
            <div class="settings-divider"></div>
            
            <!-- Row 7: Trash Bin -->
            <button class="settings-item" id="trashBinBtn">
                <i data-feather="trash" width="16" height="16"></i>
                <span>Trash Bin</span>
            </button>
        </div>
    `;

    container.appendChild(wrapper);
    renderIcons();

    // --- Event Listeners ---

    // Theme
    wrapper.querySelectorAll('[data-set-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.setTheme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('app-theme', theme);
            
            // Update UI
            wrapper.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Notify app (e.g. icon refresh)
            renderIcons();
        });
    });

    // Compact Mode
    wrapper.querySelector('#compactToggle').addEventListener('click', (e) => {
        const isNowCompact = toggleCompactMode();
        e.target.classList.toggle('active', isNowCompact);
    });

    // Shortcuts
    wrapper.querySelector('#shortcutsBtn').addEventListener('click', () => {
        toggleCheatSheet();
        closeSettings(wrapper);
    });

    // Export
    wrapper.querySelector('#exportBtn').addEventListener('click', async () => {
        await handleExport();
        closeSettings(wrapper);
    });

    // Import
    wrapper.querySelector('#importBtn').addEventListener('click', () => {
        openImportWizard();
        closeSettings(wrapper);
    });

    // Manage Tags
    wrapper.querySelector('#manageTagsBtn').addEventListener('click', async () => {
        closeSettings(wrapper);
        await handleManageTags();
    });

    // Manage Categories
    wrapper.querySelector('#manageCategoriesBtn').addEventListener('click', async () => {
        closeSettings(wrapper);
        await handleManageCategories();
    });

    // Manage LLMs
    wrapper.querySelector('#manageLLMsBtn').addEventListener('click', async () => {
        closeSettings(wrapper);
        await handleManageLLMs();
    });

    // Trash Bin
    wrapper.querySelector('#trashBinBtn').addEventListener('click', async () => {
        closeSettings(wrapper);
        await renderTrashModal();
    });

    return wrapper;
};

const closeSettings = (wrapper) => {
    wrapper.classList.remove('open');
    const btn = document.querySelector('#settingsToggleBtn');
    if(btn) btn.classList.remove('active');
};

// --- LOGIC: EXPORT ---
const handleExport = async () => {
    try {
        showToast('Preparing export...', 'info');
        const querySnapshot = await getDocs(collection(db, "prompts"));
        const prompts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const dataStr = JSON.stringify(prompts, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt-library-export-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Export downloaded!', 'success');
    } catch (error) {
        console.error("Export failed:", error);
        showToast('Export failed', 'error');
    }
};

// --- LOGIC: MANAGE TAGS ---
const handleManageTags = async () => {
    showToast('Loading tags...', 'info');
    
    try {
        const querySnapshot = await getDocs(collection(db, "prompts"));
        const allPrompts = querySnapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
        
        const tagCounts = {};
        allPrompts.forEach(p => {
            if (p.tags && Array.isArray(p.tags)) {
                p.tags.forEach(t => {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                });
            }
        });

        const allTags = Object.keys(tagCounts);
        
        // Selection State
        const selectedTags = new Set();

        const overlay = createModalOverlay('Manage Tags');
        const body = overlay.querySelector('.manage-body');

        // State
        let searchTerm = '';
        let sortMode = 'az'; // 'az' or 'count'
        
        // Render Toolbar + List Container
        body.innerHTML = `
            <div class="manage-toolbar">
                <div class="search-input-wrapper">
                    <i data-feather="search" width="16" height="16"></i>
                    <input type="text" id="tagSearchInput" placeholder="Search tags..." autocomplete="off">
                </div>
                <button class="manage-btn" id="mergeTagsBtn" title="Select at least 2 tags to merge" disabled>
                    <i data-feather="box" width="16" height="16"></i>
                </button>
                <button class="manage-btn" id="tagSortBtn" title="Sort by Count">
                    <i data-feather="bar-chart-2" width="16" height="16"></i>
                </button>
            </div>
            <div class="manage-list"></div>
        `;

        const listContainer = body.querySelector('.manage-list');
        const searchInput = body.querySelector('#tagSearchInput');
        const sortBtn = body.querySelector('#tagSortBtn');
        const mergeBtn = body.querySelector('#mergeTagsBtn');

        const updateMergeButton = () => {
            const count = selectedTags.size;
            mergeBtn.disabled = count < 2;
            mergeBtn.title = count < 2 ? "Select at least 2 tags to merge" : `Merge ${count} tags`;
        };

        const renderList = () => {
            // Filter
            let filtered = allTags.filter(t => t.toLowerCase().includes(searchTerm));
            
            // Sort
            filtered.sort((a, b) => {
                if (sortMode === 'count') {
                    // Count Descending, then A-Z
                    const diff = tagCounts[b] - tagCounts[a];
                    if (diff !== 0) return diff;
                    return a.localeCompare(b);
                } else {
                    // A-Z
                    return a.localeCompare(b);
                }
            });

            listContainer.innerHTML = '';
            
            if (filtered.length === 0) {
                 listContainer.innerHTML = `
                    <div style="text-align:center; padding:40px; color:var(--text-light);">
                        ${searchTerm ? `No tags matching "${escapeHtml(searchTerm)}"` : 'No tags found.'}
                    </div>
                 `;
                 return;
            }
            
            filtered.forEach(tag => {
                const item = document.createElement('div');
                item.className = 'manage-item';
                
                const isSelected = selectedTags.has(tag);

                item.innerHTML = `
                    <div class="manage-item-left">
                        <div class="manage-item-check">
                            <input type="checkbox" class="tag-checkbox" data-tag="${escapeHtml(tag)}" ${isSelected ? 'checked' : ''}>
                        </div>
                        <div class="manage-item-info">
                            <i data-feather="tag" width="16" height="16" style="color:var(--primary)"></i>
                            <span style="font-weight:500;">${escapeHtml(tag)}</span>
                            <span style="font-size:0.8rem; color:var(--text-light);">(${tagCounts[tag]})</span>
                        </div>
                    </div>
                    <div class="manage-item-actions">
                        <button class="icon-btn edit-tag-btn" title="Rename"><i data-feather="edit-2" width="16" height="16"></i></button>
                        <button class="icon-btn danger delete-tag-btn" title="Delete"><i data-feather="trash-2" width="16" height="16"></i></button>
                    </div>
                `;
                
                // Checkbox Handler
                const checkbox = item.querySelector('.tag-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedTags.add(tag);
                    } else {
                        selectedTags.delete(tag);
                    }
                    updateMergeButton();
                });

                item.querySelector('.edit-tag-btn').addEventListener('click', () => {
                    showInputToast(`Rename tag "${tag}"`, tag, (val) => {
                        const newName = val.trim();
                        if (newName && newName !== tag) {
                            performTagRename(tag, newName, allPrompts, () => {
                                overlay.remove();
                                handleManageTags(); // Reload
                            });
                        }
                    });
                });

                item.querySelector('.delete-tag-btn').addEventListener('click', () => {
                    showConfirmToast(`Remove tag "${tag}" from all prompts?`, () => {
                        performTagDelete(tag, allPrompts, () => {
                            overlay.remove();
                            handleManageTags(); // Reload
                        });
                    });
                });

                listContainer.appendChild(item);
            });
            renderIcons();
        };

        // Event Listeners
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            renderList();
        });

        sortBtn.addEventListener('click', () => {
            if (sortMode === 'az') {
                sortMode = 'count';
                sortBtn.classList.add('active'); // Active means Count sort
            } else {
                sortMode = 'az';
                sortBtn.classList.remove('active');
            }
            renderList();
        });

        mergeBtn.addEventListener('click', () => {
            if (selectedTags.size < 2) return;
            const tagsArray = Array.from(selectedTags);
            
            // Suggest the first tag as the default target name
            const suggestion = tagsArray[0];
            
            showInputToast(`Merge ${selectedTags.size} tags into:`, suggestion, (val) => {
                const targetName = val.trim();
                if (targetName) {
                     performTagMerge(tagsArray, targetName, allPrompts, () => {
                         overlay.remove();
                         handleManageTags();
                     });
                }
            });
        });

        // Initial render
        renderList();
        setTimeout(() => searchInput.focus(), 100);

    } catch (e) {
        console.error(e);
        showToast('Failed to load tags', 'error');
    }
};

const performTagRename = async (oldTag, newTag, prompts, callback) => {
    showToast('Renaming tag...', 'info');
    const batch = writeBatch(db);
    let count = 0;

    prompts.forEach(p => {
        if (p.tags && p.tags.includes(oldTag)) {
            const newTags = p.tags.map(t => t === oldTag ? newTag : t);
            const uniqueNewTags = [...new Set(newTags)];
            batch.update(p.ref, { tags: uniqueNewTags });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        showToast(`Renamed tag in ${count} prompts`, 'success');
    } else {
        showToast('No changes needed', 'info');
    }
    if (callback) callback();
};

const performTagDelete = async (tagToDelete, prompts, callback) => {
    showToast('Deleting tag...', 'info');
    const batch = writeBatch(db);
    let count = 0;

    prompts.forEach(p => {
        if (p.tags && p.tags.includes(tagToDelete)) {
            const newTags = p.tags.filter(t => t !== tagToDelete);
            batch.update(p.ref, { tags: newTags });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        showToast(`Removed tag from ${count} prompts`, 'success');
    }
    if (callback) callback();
};

const performTagMerge = async (tagsToMerge, targetTagName, prompts, callback) => {
    // Validation
    if (!tagsToMerge || tagsToMerge.length < 2) return;

    showToast(`Merging ${tagsToMerge.length} tags...`, 'info');
    const batch = writeBatch(db);
    let count = 0;

    prompts.forEach(p => {
        if (!p.tags || !Array.isArray(p.tags)) return;
        
        // Check if this prompt has any of the tags to merge
        const hasIntersect = p.tags.some(t => tagsToMerge.includes(t));
        
        if (hasIntersect) {
            // Filter out the tags being merged
            const filtered = p.tags.filter(t => !tagsToMerge.includes(t));
            // Add the target tag
            filtered.push(targetTagName);
            // Dedupe
            const unique = [...new Set(filtered)];
            
            batch.update(p.ref, { tags: unique });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        showToast(`Merged tags in ${count} prompts`, 'success');
    } else {
        showToast('No prompts needed updating', 'info');
    }
    if (callback) callback();
};


// --- LOGIC: MANAGE CATEGORIES ---
const handleManageCategories = async () => {
    showToast('Loading Categories...', 'info');
    
    // Fetch current categories object
    let categoriesMap = await getCategories(true); // force refresh
    // Convert to sorted array for UI
    let categoriesList = sortCategories(categoriesMap);

    const overlay = createModalOverlay('Manage Categories');
    const body = overlay.querySelector('.manage-body');

    // State for editing
    let editingId = null;

    const renderUI = () => {
        const isEditing = editingId !== null;
        const editData = isEditing ? categoriesMap[editingId] : {};
        
        // Sort list again to reflect changes
        categoriesList = sortCategories(categoriesMap);

        // Form HTML
        body.innerHTML = `
            <div class="llm-form" id="catForm" style="border:1px solid var(--border-color); background:var(--bg-surface);">
                <div style="font-weight:600; margin-bottom:12px; font-size:0.9rem;">
                    ${isEditing ? 'Edit Category' : 'Add New Category'}
                </div>
                
                <div class="form-row">
                     <div>
                        <label style="font-size:0.8rem; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Label</label>
                        <input type="text" id="catLabel" class="form-input" placeholder="e.g. Creative Writing" value="${editData.label || ''}">
                     </div>
                     <div>
                        <label style="font-size:0.8rem; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Feather Icon Name</label>
                        <input type="text" id="catIcon" class="form-input" placeholder="e.g. feather" value="${editData.icon || ''}">
                     </div>
                </div>

                <div style="margin-top:12px;">
                     <label style="font-size:0.8rem; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Brand Color</label>
                     <div style="display:flex; gap:12px; align-items:center;">
                        <input type="color" id="catColor" value="${editData.color || '#fe6a5f'}" style="height:40px; width:60px; border:none; background:none; cursor:pointer;">
                        <span id="colorPreview" style="font-family:monospace; font-size:0.9rem; color:var(--text-main);">${editData.color || '#fe6a5f'}</span>
                     </div>
                </div>
                
                <div style="display:flex; gap:8px; margin-top:16px;">
                    ${isEditing ? `<button class="btn btn-secondary" id="cancelEditBtn" style="flex:1;">Cancel</button>` : ''}
                    <button class="btn btn-primary" id="saveCatBtn" style="flex:2;">${isEditing ? 'Update Category' : 'Add Category'}</button>
                </div>
            </div>
            
            <div style="margin-bottom:8px; font-size:0.8rem; color:var(--text-light);">Drag items to reorder</div>
            <div class="manage-list"></div>
            
            <div style="margin-top:20px; text-align:center;">
                <button class="btn btn-secondary" id="resetCatBtn" style="font-size:0.8rem;">Reset to Defaults</button>
            </div>
        `;

        renderIcons();

        // Color input listener
        const colorInput = body.querySelector('#catColor');
        const colorPreview = body.querySelector('#colorPreview');
        colorInput.addEventListener('input', (e) => {
            colorPreview.textContent = e.target.value;
        });

        // Render List
        const list = body.querySelector('.manage-list');
        categoriesList.forEach(cat => {
            const item = document.createElement('div');
            item.className = `manage-item ${editingId === cat.id ? 'editing' : ''}`;
            if (editingId === cat.id) item.style.borderColor = 'var(--primary)';
            item.dataset.id = cat.id; // Important for Drag & Drop
            item.style.cursor = 'grab'; // Indicate draggable

            item.innerHTML = `
                <div class="manage-item-info">
                    <div style="width:32px; height:32px; border-radius:8px; background:${cat.bg || 'rgba(0,0,0,0.1)'}; color:${cat.color}; display:flex; align-items:center; justify-content:center; border:1px solid ${cat.border || 'transparent'}">
                        <i data-feather="${cat.icon || 'circle'}" width="16" height="16"></i>
                    </div>
                    <div>
                        <div style="font-weight:600; font-size:0.9rem;">${cat.label}</div>
                        <div style="font-size:0.75rem; color:var(--text-light); font-family:monospace;">${cat.id}</div>
                    </div>
                </div>
                <div class="manage-item-actions">
                     <button class="icon-btn edit-cat-btn" title="Edit"><i data-feather="edit-2" width="16" height="16"></i></button>
                     <button class="icon-btn danger delete-cat-btn" title="Delete"><i data-feather="trash-2" width="16" height="16"></i></button>
                </div>
            `;
            
            // Edit
            item.querySelector('.edit-cat-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // prevent drag trigger if any
                editingId = cat.id;
                renderUI();
            });

            // Delete
            item.querySelector('.delete-cat-btn').addEventListener('click', async (e) => {
                e.stopPropagation(); // prevent drag trigger if any
                showConfirmToast(`Delete category "${cat.label}"?`, async () => {
                     delete categoriesMap[cat.id];
                     categoriesList = sortCategories(categoriesMap); // Re-sort/Refresh list
                     await saveCategories(categoriesMap);
                     if(editingId === cat.id) editingId = null;
                     renderUI();
                     // Trigger global refresh to update library
                     window.dispatchEvent(new CustomEvent('library-data-changed'));
                });
            });

            list.appendChild(item);
        });
        renderIcons();

        // Initialize Drag and Drop
        initDragAndDrop(list, async (newIds) => {
            // Update orders based on new index
            newIds.forEach((id, index) => {
                if(categoriesMap[id]) {
                    categoriesMap[id].order = index;
                }
            });
            await saveCategories(categoriesMap);
            // Don't need full re-render of UI inside modal as Sortable handles the DOM move, 
            // but we update the internal list for next render
            categoriesList = sortCategories(categoriesMap);
            window.dispatchEvent(new CustomEvent('library-data-changed'));
        }, {
            handle: '.manage-item',
            animation: 150
        });

        // Cancel Edit
        const cancelBtn = body.querySelector('#cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                editingId = null;
                renderUI();
            });
        }

        // Save
        body.querySelector('#saveCatBtn').addEventListener('click', async () => {
            const label = body.querySelector('#catLabel').value.trim();
            const icon = body.querySelector('#catIcon').value.trim();
            const color = body.querySelector('#catColor').value;
            
            if (!label || !icon) {
                showToast('Label and Icon name are required', 'error');
                return;
            }

            // Generate ID if new
            let id = isEditing ? editingId : label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
            
            // Generate BG and Border from color
            const bg = hexToRgba(color, 0.1);
            const border = hexToRgba(color, 0.3);

            // Maintain existing order if editing, else append
            const currentOrder = isEditing && categoriesMap[id] ? categoriesMap[id].order : categoriesList.length;

            const catData = {
                id,
                label,
                icon,
                color,
                bg,
                border,
                order: currentOrder
            };

            categoriesMap[id] = catData;
            
            await saveCategories(categoriesMap);
            showToast(isEditing ? 'Category updated' : 'Category added', 'success');
            
            editingId = null;
            renderUI();
            
            // Global refresh
            window.dispatchEvent(new CustomEvent('library-data-changed'));
        });

        // Reset
        body.querySelector('#resetCatBtn').addEventListener('click', () => {
             showConfirmToast('Reset categories to default?', async () => {
                 await resetCategories();
                 categoriesMap = await getCategories(true);
                 categoriesList = sortCategories(categoriesMap);
                 editingId = null;
                 renderUI();
                 window.dispatchEvent(new CustomEvent('library-data-changed'));
                 showToast('Reset complete', 'success');
             });
        });
    };

    renderUI();
};


// --- LOGIC: MANAGE LLMS ---
const handleManageLLMs = async () => {
    showToast('Loading LLMs...', 'info');
    let llms = await getLLMs();
    
    const overlay = createModalOverlay('Manage LLMs');
    const body = overlay.querySelector('.manage-body');

    // State for editing
    let editingIndex = null;
    
    const renderUI = () => {
        const isEditing = editingIndex !== null;
        const editData = isEditing ? llms[editingIndex] : {};
        
        body.innerHTML = `
            <div class="llm-form" id="addLLMForm">
                <div style="font-weight:600; margin-bottom:8px; font-size:0.9rem;">
                    ${isEditing ? 'Edit Provider' : 'Add New Provider'}
                </div>
                
                <input type="text" id="llmName" class="form-input" placeholder="Name (e.g. Mistral)" value="${editData.name || ''}" style="margin-bottom:12px;">
                <input type="text" id="llmDesc" class="form-input" placeholder="Description (e.g. Local Model)" value="${editData.desc || ''}">
                <input type="text" id="llmUrl" class="form-input" placeholder="URL (e.g. https://chat.mistral.ai)" value="${editData.url || ''}">
                
                <div style="display:flex; gap:8px; margin-top:12px;">
                    ${isEditing ? `<button class="btn btn-secondary" id="cancelEditBtn" style="flex:1;">Cancel</button>` : ''}
                    <button class="btn btn-primary" id="saveLLMBtn" style="flex:2;">${isEditing ? 'Update Provider' : 'Add Provider'}</button>
                </div>
            </div>
            
            <div class="manage-list"></div>
            
            <div style="margin-top:20px; text-align:center;">
                <button class="btn btn-secondary" id="resetLLMsBtn" style="font-size:0.8rem;">Reset to Defaults</button>
            </div>
        `;
        
        renderIcons(); // For Feather icons in form if any

        // Render List
        const list = body.querySelector('.manage-list');
        llms.forEach((llm, index) => {
            const item = document.createElement('div');
            item.className = `manage-item ${editingIndex === index ? 'editing' : ''}`;
            if (editingIndex === index) item.style.borderColor = 'var(--primary)';

            // Added for DnD
            item.dataset.id = llm.id;
            item.style.cursor = 'grab';

            item.innerHTML = `
                <div class="manage-item-info">
                    <div>
                        <div style="font-weight:600; font-size:0.9rem;">${llm.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-light);">${llm.url}</div>
                    </div>
                </div>
                <div class="manage-item-actions">
                     <button class="icon-btn edit-llm-btn" data-idx="${index}" title="Edit"><i data-feather="edit-2" width="16" height="16"></i></button>
                     <button class="icon-btn danger delete-llm-btn" data-idx="${index}" title="Delete"><i data-feather="trash-2" width="16" height="16"></i></button>
                </div>
            `;
            
            // Edit Click
            item.querySelector('.edit-llm-btn').addEventListener('click', () => {
                editingIndex = index;
                renderUI();
            });

            // Delete Click
            item.querySelector('.delete-llm-btn').addEventListener('click', async () => {
                if (editingIndex === index) {
                    editingIndex = null; 
                }
                llms.splice(index, 1);
                await saveLLMs(llms);
                renderUI();
            });
            
            list.appendChild(item);
        });
        renderIcons(); // Render icons in list

        // Initialize Drag and Drop
        initDragAndDrop(list, async (newIds) => {
            // Reorder local array based on newIds
            const newOrder = newIds.map(id => llms.find(x => x.id === id)).filter(Boolean);
            llms = newOrder;
            
            // Save to DB
            await saveLLMs(llms);
            
            // Re-render to update indices in closures
            editingIndex = null;
            renderUI();
        }, {
            handle: '.manage-item',
            animation: 150
        });

        // --- Form Event Listeners ---

        // Cancel Edit
        const cancelBtn = body.querySelector('#cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                editingIndex = null;
                renderUI();
            });
        }

        // Save / Update
        body.querySelector('#saveLLMBtn').addEventListener('click', async () => {
            const name = body.querySelector('#llmName').value.trim();
            const desc = body.querySelector('#llmDesc').value.trim();
            const url = body.querySelector('#llmUrl').value.trim();
            
            if (!name || !url) {
                showToast('Name and URL are required', 'error');
                return;
            }
            
            const providerData = {
                id: isEditing ? editData.id : 'custom_' + Date.now(),
                name,
                desc,
                url
            };
            
            if (isEditing) {
                llms[editingIndex] = providerData;
                showToast('Provider updated', 'success');
                editingIndex = null;
            } else {
                llms.push(providerData);
                showToast('Provider added', 'success');
            }
            
            await saveLLMs(llms);
            renderUI();
        });

        // Reset Logic
        body.querySelector('#resetLLMsBtn').addEventListener('click', async () => {
             showConfirmToast('Reset all LLM providers to default?', async () => {
                 await resetLLMs();
                 llms = await getLLMs();
                 editingIndex = null;
                 renderUI();
                 showToast('Reset complete', 'success');
             });
        });
    };

    renderUI();
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --- Helper: Modal Overlay ---
const createModalOverlay = (title) => {
    const overlay = document.createElement('div');
    overlay.className = 'injector-overlay visible'; // Reuse style
    overlay.innerHTML = `
        <div class="manage-modal">
            <div class="manage-header">
                <div class="manage-title">${title}</div>
                <button class="injector-close-btn" id="closeManageBtn"><i data-feather="x"></i></button>
            </div>
            <div class="manage-body"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const close = () => {
        overlay.remove();
    };
    
    overlay.querySelector('#closeManageBtn').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => {
        if(e.target === overlay) close();
    });

    return overlay;
};