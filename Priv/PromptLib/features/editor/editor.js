

import { db } from '../../js/config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, renderIcons } from '../../js/utils.js';
import { getCategories, sortCategories } from '../categories/categories.js';
import { fetchCollections } from '../collections/collections.js';

export const openEditorModal = async (promptId = null, onSaveComplete = null, cloneId = null) => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    // 1. Create Modal DOM Structure
    const overlay = document.createElement('div');
    overlay.className = 'editor-modal-overlay';
    
    // Determine title
    let modalTitleText = 'New Prompt';
    if (promptId) modalTitleText = 'Edit Prompt';
    if (cloneId) modalTitleText = 'Duplicate Prompt';

    // Split layout structure: Sidebar for meta, Main for content
    overlay.innerHTML = `
        <div class="editor-modal">
            <!-- Header -->
            <div class="modal-header">
                <h2 class="modal-title">${modalTitleText}</h2>
                <button class="modal-close-btn" id="modalCloseBtn" title="Close (Esc)">
                    <i data-feather="x" width="20" height="20"></i>
                </button>
            </div>
            
            <!-- Body: Grid Layout -->
            <div class="modal-body-layout">
                
                <!-- Left Sidebar: Metadata -->
                <aside class="modal-sidebar">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" id="titleInput" class="form-input" placeholder="e.g. JavaScript Expert" autocomplete="off">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="descInput" class="form-textarea desc-textarea" placeholder="Brief summary for the library card..."></textarea>
                    </div>

                    <!-- Collection Dropdown -->
                    <div class="form-group">
                        <label class="form-label">Collection</label>
                        <div class="select-wrapper">
                            <select id="collectionInput" class="form-select">
                                <option value="">None (Unorganized)</option>
                                <option disabled>Loading collections...</option>
                            </select>
                            <i data-feather="chevron-down" class="select-icon"></i>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <div class="category-selection-grid" id="categoryContainer"></div>
                    </div>

                    <div class="form-group" style="position:relative;">
                        <label class="form-label">Tags</label>
                        <input type="text" id="tagsInput" class="form-input" placeholder="coding, writing, analysis..." autocomplete="off">
                        <div class="form-hint" style="font-size:0.75rem; color:#94a3b8; margin-top:4px;">Comma separated</div>
                        <!-- Autocomplete Dropdown Removed from here, created dynamically -->
                    </div>
                </aside>

                <!-- Right Main: Editor -->
                <main class="modal-main-editor" id="editorMainArea">
                    <div class="editor-toolbar">
                        <button class="toolbar-btn" data-cmd="formatBlock" data-val="h1" title="Large Heading">H1</button>
                        <button class="toolbar-btn" data-cmd="formatBlock" data-val="h2" title="Medium Heading">H2</button>
                        <div class="toolbar-divider"></div>
                        <button class="toolbar-btn" data-cmd="bold" title="Bold"><i data-feather="bold" width="16" height="16"></i></button>
                        <button class="toolbar-btn" data-cmd="italic" title="Italic"><i data-feather="italic" width="16" height="16"></i></button>
                        <button class="toolbar-btn" data-cmd="underline" title="Underline"><i data-feather="underline" width="16" height="16"></i></button>
                        <div class="toolbar-divider"></div>
                        <button class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet List"><i data-feather="list" width="16" height="16"></i></button>
                        <button class="toolbar-btn" data-cmd="insertOrderedList" title="Numbered List"><i data-feather="hash" width="16" height="16"></i></button>
                        <button class="toolbar-btn" data-cmd="insertHorizontalRule" title="Divider"><i data-feather="minus" width="16" height="16"></i></button>
                        <button class="toolbar-btn" data-cmd="removeFormat" title="Clear Formatting"><i data-feather="x-circle" width="16" height="16"></i></button>
                        <div class="toolbar-divider" style="margin-left:auto;"></div>
                        <button class="toolbar-btn" id="focusModeBtn" title="Toggle Focus Mode"><i data-feather="maximize" width="16" height="16"></i></button>
                    </div>
                    
                    <div class="editor-scroll-container" id="editorScrollContainer">
                        <div id="contentInput" class="editor-content-editable" contenteditable="true" placeholder="Start writing your system prompt here..."></div>
                    </div>

                    <!-- Loader (Hidden by default) -->
                    <div id="editorLoader" class="loading-overlay" style="display: none;">
                        <div style="text-align:center;">
                            <i data-feather="loader" class="spin" style="margin-bottom:8px;"></i>
                            <div style="font-size:0.9rem; color:var(--text-light);">Loading...</div>
                        </div>
                    </div>
                </main>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
                <button id="cancelBtn" class="btn btn-secondary">Cancel</button>
                <button id="saveBtn" class="btn btn-primary">
                    <i data-feather="save" width="18" height="18"></i> <span>Save Prompt</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    // Trigger animation
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    // --- DOM References ---
    const modalContainer = overlay.querySelector('.editor-modal');
    const titleInput = overlay.querySelector('#titleInput');
    const descInput = overlay.querySelector('#descInput');
    const collectionInput = overlay.querySelector('#collectionInput');
    const tagsInput = overlay.querySelector('#tagsInput');
    // Dropdown is no longer inside overlay via HTML
    const contentInput = overlay.querySelector('#contentInput');
    const categoryContainer = overlay.querySelector('#categoryContainer');
    const saveBtn = overlay.querySelector('#saveBtn');
    const loader = overlay.querySelector('#editorLoader');
    const editorMainArea = overlay.querySelector('#editorMainArea');
    const focusModeBtn = overlay.querySelector('#focusModeBtn');
    const editorScrollContainer = overlay.querySelector('#editorScrollContainer');

    // Define the new highlight color
    const highlightColorHex = '#e67f74';
    // Helper function to convert hex to RGB for comparison (execCommand returns RGB)
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${r}, ${g}, ${b})`;
    };
    const highlightColorRgb = hexToRgb(highlightColorHex);

    // Helper function to get the current computed default text color
    const getComputedDefaultTextColor = () => {
        // Get the computed color of the contentInput. This will resolve var(--text-main)
        return window.getComputedStyle(contentInput).color;
    };

    // --- State for Tags Autocomplete ---
    let cachedTags = [];
    let activeSuggestionIndex = -1;

    // Create Dropdown dynamically attached to body to escape overflow clipping
    const tagsDropdown = document.createElement('div');
    tagsDropdown.className = 'autocomplete-dropdown';
    document.body.appendChild(tagsDropdown);

    // --- Fetch and Populate Collections & Tags (Prefetch) ---
    const loadCollectionsAndTags = async () => {
        const colsPromise = fetchCollections();
        
        // Fetch all prompts just to aggregate tags. 
        // In a real production app with thousands of docs, you'd maintain a separate 'tags' aggregation document.
        const tagsPromise = (async () => {
            if (!db) return [];
            const q = collection(db, "prompts");
            const snap = await getDocs(q);
            const tagSet = new Set();
            snap.forEach(doc => {
                const t = doc.data().tags;
                if (Array.isArray(t)) t.forEach(tag => tagSet.add(tag));
            });
            return Array.from(tagSet).sort();
        })();

        // Fetch Categories
        const catsPromise = getCategories();

        const [cols, tags, catsMap] = await Promise.all([colsPromise, tagsPromise, catsPromise]);

        // Populate Collections
        collectionInput.innerHTML = '<option value="">None (Unorganized)</option>';
        cols.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            collectionInput.appendChild(opt);
        });

        // Store Tags
        cachedTags = tags;

        // Populate Categories (Sorted)
        const sortedCats = sortCategories(catsMap);
        sortedCats.forEach(cat => {
            const chip = document.createElement('div');
            chip.className = 'category-chip-select';
            chip.dataset.id = cat.id;
            
            chip.style.setProperty('--brand-color', cat.color);
            chip.style.setProperty('--brand-bg', cat.bg);
            
            chip.innerHTML = `<i data-feather="${cat.icon || 'circle'}" width="14" height="14"></i> ${cat.label}`;
            
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
            });
            
            categoryContainer.appendChild(chip);
        });
        renderIcons(); // Render icons on chips
    };
    
    // Start fetching
    const initPromise = loadCollectionsAndTags();

    // --- Tags Autocomplete Logic ---
    const closeAutocomplete = () => {
        tagsDropdown.innerHTML = '';
        tagsDropdown.classList.remove('visible');
        activeSuggestionIndex = -1;
    };

    const confirmSelection = (tag) => {
        const currentVal = tagsInput.value;
        const lastComma = currentVal.lastIndexOf(',');
        let newVal = '';
        
        if (lastComma !== -1) {
            newVal = currentVal.substring(0, lastComma + 1) + ' ' + tag + ', ';
        } else {
            newVal = tag + ', ';
        }
        
        tagsInput.value = newVal;
        tagsInput.focus();
        closeAutocomplete();
    };

    tagsInput.addEventListener('input', () => {
        const val = tagsInput.value;
        const parts = val.split(',');
        const currentTyping = parts[parts.length - 1].trim().toLowerCase();

        if (!currentTyping) {
            closeAutocomplete();
            return;
        }

        const matches = cachedTags.filter(t => t.toLowerCase().includes(currentTyping));
        
        if (matches.length === 0) {
            closeAutocomplete();
            return;
        }

        // Calculate Position (Fixed)
        const rect = tagsInput.getBoundingClientRect();
        tagsDropdown.style.top = `${rect.bottom + 6}px`;
        tagsDropdown.style.left = `${rect.left}px`;
        tagsDropdown.style.width = `${rect.width}px`;

        // Render Dropdown
        tagsDropdown.innerHTML = '';
        matches.forEach((tag, idx) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `<span>${tag}</span>`;
            div.addEventListener('click', () => confirmSelection(tag));
            // Pre-highlight first item for better UX
            if (idx === 0) div.classList.add('active');
            tagsDropdown.appendChild(div);
        });
        
        tagsDropdown.classList.add('visible');
        activeSuggestionIndex = 0; // Default to first
    });

    tagsInput.addEventListener('keydown', (e) => {
        const isDropdownVisible = tagsDropdown.classList.contains('visible');
        
        if (isDropdownVisible) {
            const items = tagsDropdown.querySelectorAll('.autocomplete-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeSuggestionIndex++;
                if (activeSuggestionIndex >= items.length) activeSuggestionIndex = 0;
                updateActiveItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeSuggestionIndex--;
                if (activeSuggestionIndex < 0) activeSuggestionIndex = items.length - 1;
                updateActiveItem(items);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
                    items[activeSuggestionIndex].click();
                }
            } else if (e.key === 'ArrowRight') {
                // SPECIAL REQUEST: Right arrow confirms selection
                // Only if cursor is at end of input to avoid interfering with navigation
                if (tagsInput.selectionStart === tagsInput.value.length) {
                    e.preventDefault();
                    if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
                        items[activeSuggestionIndex].click();
                    }
                }
            } else if (e.key === 'Escape') {
                e.preventDefault(); // Don't close modal, just dropdown
                closeAutocomplete();
            }
        }
    });

    const updateActiveItem = (items) => {
        items.forEach(i => i.classList.remove('active'));
        if (items[activeSuggestionIndex]) {
            items[activeSuggestionIndex].classList.add('active');
            items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }
    };

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (tagsDropdown.contains(e.target)) return;
        if (e.target !== tagsInput) closeAutocomplete();
    });

    // Close dropdown on scroll (sidebar) or resize
    const sidebar = overlay.querySelector('.modal-sidebar');
    const onScrollOrResize = () => {
        if(tagsDropdown.classList.contains('visible')) closeAutocomplete();
    };
    if (sidebar) sidebar.addEventListener('scroll', onScrollOrResize);
    window.addEventListener('resize', onScrollOrResize);


    // --- Focus Management ---
    if (!promptId && !cloneId) {
        setTimeout(() => titleInput.focus(), 100);
    }

    // --- Toolbar Interaction ---
    overlay.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cmd = btn.dataset.cmd;
            const val = btn.dataset.val || null;
            document.execCommand(cmd, false, val);
            contentInput.focus();
            updateToolbarState();
        });
    });

    // --- Focus Mode Logic ---
    focusModeBtn.addEventListener('click', () => {
        modalContainer.classList.toggle('focus-mode');
        
        const isFs = modalContainer.classList.contains('focus-mode');
        focusModeBtn.innerHTML = isFs 
            ? `<i data-feather="minimize" width="16" height="16"></i>` 
            : `<i data-feather="maximize" width="16" height="16"></i>`;
        renderIcons();
    });

    // --- Shortcuts (Esc & Cmd+S) ---
    const handleKeydown = (e) => {
        // ESC: Close (Only if autocomplete is not open)
        if (e.key === 'Escape') {
            if (tagsDropdown.classList.contains('visible')) return;

            if (modalContainer.classList.contains('focus-mode')) {
                modalContainer.classList.remove('focus-mode');
                focusModeBtn.innerHTML = `<i data-feather="maximize" width="16" height="16"></i>`;
                renderIcons();
            } else {
                closeModal();
            }
        }
        // Cmd+S / Ctrl+S: Save
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            // Trigger save click
            if (!saveBtn.disabled) saveBtn.click();
        }

        // Ctrl+Shift+H: Highlight Color Toggle
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            if (document.activeElement === contentInput) {
                document.execCommand('styleWithCSS', false, true); // Ensure CSS styles are used

                const currentColor = document.queryCommandValue('foreColor');
                const defaultTextColorNow = getComputedDefaultTextColor();
                
                // Compare current color (which might be in RGB format) to our target highlight color
                if (currentColor.toLowerCase() === highlightColorRgb.toLowerCase()) {
                    // Text is currently highlighted with our target color, remove highlight by setting to default text color
                    document.execCommand('foreColor', false, defaultTextColorNow);
                } else {
                    // Text is not highlighted with our target color (or has a different color), apply highlight
                    document.execCommand('foreColor', false, highlightColorHex);
                }
                contentInput.focus();
                updateToolbarState();
            }
        }
    };
    document.addEventListener('keydown', handleKeydown);

    const updateToolbarState = () => {
        overlay.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
            const cmd = btn.dataset.cmd;
            try {
                if (document.queryCommandState && document.queryCommandState(cmd)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            } catch (e) {
            }
        });
    };

    contentInput.addEventListener('keyup', updateToolbarState);
    contentInput.addEventListener('mouseup', updateToolbarState);
    contentInput.addEventListener('click', updateToolbarState);
    
    editorScrollContainer.addEventListener('click', (e) => {
        if (e.target === editorScrollContainer) {
            contentInput.focus();
        }
    });

    // --- Close & Cleanup ---
    const closeModal = () => {
        document.removeEventListener('keydown', handleKeydown);
        if (sidebar) sidebar.removeEventListener('scroll', onScrollOrResize);
        window.removeEventListener('resize', onScrollOrResize);
        
        document.body.style.overflow = '';
        overlay.classList.remove('visible');
        
        // Remove Dropdown from Body
        if (tagsDropdown && tagsDropdown.parentNode) {
            tagsDropdown.parentNode.removeChild(tagsDropdown);
        }

        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
    overlay.querySelector('#cancelBtn').addEventListener('click', closeModal);
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) closeModal();
    });

    // --- Load Data (Edit or Clone Mode) ---
    const loadId = promptId || cloneId;

    if (loadId) {
        loader.style.display = 'flex';
        // If regular edit, say update. If clone, say Save New.
        saveBtn.querySelector('span').textContent = promptId ? 'Update Prompt' : 'Create Copy';
        
        try {
            // Wait for collections/tags/categories to load so we can set the value correctly
            await initPromise;

            const docRef = doc(db, "prompts", loadId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // If Cloning, modify title
                if (cloneId) {
                    titleInput.value = `Copy of ${data.title || 'Untitled'}`;
                } else {
                    titleInput.value = data.title || '';
                }

                descInput.value = data.description || '';
                contentInput.innerHTML = data.content || '';
                tagsInput.value = (data.tags || []).join(', ');
                collectionInput.value = data.collectionId || ''; // Set Collection

                if (data.categories && Array.isArray(data.categories)) {
                    data.categories.forEach(id => {
                        const chip = categoryContainer.querySelector(`.category-chip-select[data-id="${id}"]`);
                        if (chip) chip.classList.add('selected');
                    });
                }
                
                // Focus title if cloning so they can rename easily
                if (cloneId) {
                    setTimeout(() => titleInput.select(), 100);
                }

            } else {
                showToast('Prompt not found', 'error');
                closeModal();
                return;
            }
        } catch (error) {
            console.error(error);
            showToast('Error loading prompt', 'error');
            closeModal();
            return;
        } finally {
            loader.style.display = 'none';
        }
    }

    // --- Save Logic ---
    saveBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        const content = contentInput.innerHTML; 
        const tagsStr = tagsInput.value.trim();
        const rawText = contentInput.innerText.trim();
        const collectionId = collectionInput.value;

        const selectedCategories = Array.from(categoryContainer.querySelectorAll('.category-chip-select.selected'))
            .map(chip => chip.dataset.id);

        if (!title) {
            showToast('Please enter a title', 'error');
            titleInput.focus();
            return;
        }
        if (!rawText && !content.includes('<img')) {
            showToast('Please enter some content', 'error');
            contentInput.focus();
            return;
        }

        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);

        try {
            const originalBtnHtml = saveBtn.innerHTML;
            saveBtn.innerHTML = `<i data-feather="loader" class="spin"></i> <span>Saving...</span>`;
            saveBtn.disabled = true;
            renderIcons();

            if (!db) throw new Error("Firebase not initialized");

            const promptData = {
                title,
                description,
                content,
                tags,
                collectionId, // Save collection ID
                categories: selectedCategories,
                updatedAt: serverTimestamp()
            };

            // If promptId exists, we update. If it's null (Create OR Clone), we create new.
            if (promptId) {
                await updateDoc(doc(db, "prompts", promptId), promptData);
                showToast('Prompt updated successfully', 'success');
            } else {
                promptData.createdAt = serverTimestamp();
                // Initialize order with current numeric timestamp for easier sorting/math
                promptData.order = Date.now(); 
                await addDoc(collection(db, "prompts"), promptData);
                showToast(cloneId ? 'Prompt duplicated successfully' : 'New prompt created', 'success');
            }

            if (onSaveComplete) onSaveComplete();
            closeModal();

        } catch (error) {
            console.error("Save error:", error);
            showToast('Failed to save prompt', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = promptId ? `<i data-feather="save" width="18" height="18"></i> <span>Update Prompt</span>` : `<i data-feather="save" width="18" height="18"></i> <span>Save Prompt</span>`;
            renderIcons();
        }
    });
};