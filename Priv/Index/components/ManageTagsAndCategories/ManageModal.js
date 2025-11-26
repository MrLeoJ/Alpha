
export class ManageModal {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.callbacks = callbacks; // { onRenameTag, onDeleteTag, onRenameCategory, onDeleteCategory }
        
        // State
        this.activeTab = 'tags'; // 'tags' | 'categories'
        this.searchQuery = '';
        this.items = []; // Current list of items to display
        this.editingItemOriginalName = null; // Track which item is being edited
        
        // Data Store
        this.allTags = [];
        this.allCategories = [];

        this.render();
        this.attachEvents();

        // Refs
        this.modalEl = document.getElementById('manage-modal-overlay');
        this.listContainer = document.getElementById('mm-list-container');
    }

    render() {
        this.container.innerHTML = `
            <div id="manage-modal-overlay" class="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop modal-closed hidden">
                <div id="manage-modal-content" class="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 border border-secondary modal-content flex flex-col max-h-[85vh]">
                    
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                        <h2 class="text-xl font-bold text-gray-800">Manage Library</h2>
                        <button id="mm-close-btn" class="text-gray-400 hover:text-gray-600 transition-colors p-1">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div class="flex border-b border-gray-100 px-6 gap-6 shrink-0">
                        <button class="tab-btn active py-3 text-sm font-bold text-gray-500 hover:text-gray-700" data-tab="tags">Tags</button>
                        <button class="tab-btn py-3 text-sm font-bold text-gray-500 hover:text-gray-700" data-tab="categories">Categories</button>
                    </div>

                    <!-- Search -->
                    <div class="p-4 border-b border-gray-50 shrink-0">
                        <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-2.5 w-4 h-4 text-gray-400"></i>
                            <input type="text" id="mm-search" placeholder="Filter items..." class="w-full bg-gray-50 border border-secondary rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
                        </div>
                    </div>

                    <!-- List Area -->
                    <div id="mm-list-container" class="manage-list-scroll overflow-y-auto flex-grow p-2 space-y-1">
                        <!-- Items injected here -->
                    </div>
                    
                    <!-- Footer Info -->
                    <div class="px-6 py-3 bg-gray-50 text-[10px] text-gray-400 border-t border-gray-100 rounded-b-2xl shrink-0 text-center">
                        Changes here affect all existing projects immediately.
                    </div>
                </div>
            </div>
        `;
        // eslint-disable-next-line no-undef
        if (window.lucide) window.lucide.createIcons();
    }

    open(tags, categories) {
        this.allTags = tags || [];
        this.allCategories = categories || [];
        this.activeTab = 'tags';
        this.searchQuery = '';
        this.editingItemOriginalName = null;
        
        this.updateTabUI();
        this.renderList();

        this.modalEl.classList.remove('hidden');
        setTimeout(() => {
            this.modalEl.classList.remove('modal-closed');
            this.modalEl.classList.add('modal-open');
        }, 10);
    }

    close() {
        this.modalEl.classList.remove('modal-open');
        this.modalEl.classList.add('modal-closed');
        setTimeout(() => {
            this.modalEl.classList.add('hidden');
            this.editingItemOriginalName = null;
        }, 300);
    }

    updateTabUI() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === this.activeTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    renderList() {
        const source = this.activeTab === 'tags' ? this.allTags : this.allCategories;
        
        // Filter
        const filtered = source.filter(item => 
            item.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );

        // Sort by name
        filtered.sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                    <i data-lucide="inbox" class="w-8 h-8 mb-2 opacity-50"></i>
                    <span class="text-xs">No items found</span>
                </div>
            `;
        } else {
            this.listContainer.innerHTML = filtered.map(item => this.createItemHTML(item)).join('');
        }
        
        // eslint-disable-next-line no-undef
        if (window.lucide) window.lucide.createIcons();
        this.attachItemListeners();
    }

    createItemHTML(item) {
        const isEditing = this.editingItemOriginalName === item.name;

        if (isEditing) {
            return `
                <div class="manage-list-item flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <input type="text" id="mm-edit-input" value="${item.name}" 
                           class="bg-white border border-blue-200 rounded px-2 py-1 text-sm text-gray-800 w-full mr-2 focus:ring-2 focus:ring-blue-400 outline-none" 
                           data-original="${item.name}">
                    <div class="flex items-center gap-1">
                        <button class="mm-save-btn p-1.5 rounded-md hover:bg-blue-200 text-blue-600" title="Save">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                        <button class="mm-cancel-edit-btn p-1.5 rounded-md hover:bg-red-100 text-red-500" title="Cancel">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="manage-list-item flex items-center justify-between p-3 rounded-lg group">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span class="flex items-center justify-center bg-gray-100 text-gray-500 text-[10px] font-bold h-6 min-w-[24px] px-1 rounded-md">
                        ${item.count || 0}
                    </span>
                    <span class="text-sm font-medium text-gray-700 truncate" title="${item.name}">${item.name}</span>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="mm-edit-btn p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-primary transition-colors" data-name="${item.name}" title="Rename">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button class="mm-delete-btn p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" data-name="${item.name}" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Close
        document.getElementById('mm-close-btn').addEventListener('click', () => this.close());
        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) this.close();
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = e.target.dataset.tab;
                this.editingItemOriginalName = null;
                this.updateTabUI();
                this.renderList();
            });
        });

        // Search
        document.getElementById('mm-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderList();
        });
    }

    attachItemListeners() {
        // Edit Button Click
        this.listContainer.querySelectorAll('.mm-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editingItemOriginalName = e.currentTarget.dataset.name;
                this.renderList();
                // Focus input
                const input = document.getElementById('mm-edit-input');
                if (input) {
                    input.focus();
                    input.select();
                    
                    // Save on Enter
                    input.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') this.triggerSave(input.value);
                        if (ev.key === 'Escape') {
                            this.editingItemOriginalName = null;
                            this.renderList();
                        }
                    });
                }
            });
        });

        // Delete Button Click
        this.listContainer.querySelectorAll('.mm-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.dataset.name;
                this.handleDelete(name);
            });
        });

        // Save Edit
        const saveBtn = this.listContainer.querySelector('.mm-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const input = document.getElementById('mm-edit-input');
                this.triggerSave(input.value);
            });
        }

        // Cancel Edit
        const cancelBtn = this.listContainer.querySelector('.mm-cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.editingItemOriginalName = null;
                this.renderList();
            });
        }
    }

    triggerSave(newName) {
        const oldName = this.editingItemOriginalName;
        const trimmed = newName.trim();
        
        if (!trimmed) {
            // Cannot be empty
            return; 
        }

        if (trimmed === oldName) {
            this.editingItemOriginalName = null;
            this.renderList();
            return;
        }

        // Perform Update
        this.editingItemOriginalName = null; // optimistic UI close
        
        if (this.activeTab === 'tags' && this.callbacks.onRenameTag) {
            this.callbacks.onRenameTag(oldName, trimmed);
        } else if (this.activeTab === 'categories' && this.callbacks.onRenameCategory) {
            this.callbacks.onRenameCategory(oldName, trimmed);
        }
        
        // Optimistic update locally to prevent jump
        this.updateLocalList(oldName, trimmed);
        this.renderList();
    }

    handleDelete(name) {
        // eslint-disable-next-line no-undef
        if (!confirm(`Are you sure you want to delete "${name}"? This will remove it from all projects.`)) return;

        if (this.activeTab === 'tags' && this.callbacks.onDeleteTag) {
            this.callbacks.onDeleteTag(name);
        } else if (this.activeTab === 'categories' && this.callbacks.onDeleteCategory) {
            this.callbacks.onDeleteCategory(name);
        }

        // Optimistic remove
        if (this.activeTab === 'tags') {
            this.allTags = this.allTags.filter(t => t.name !== name);
        } else {
            this.allCategories = this.allCategories.filter(c => c.name !== name);
        }
        this.renderList();
    }

    updateLocalList(oldName, newName) {
        const list = this.activeTab === 'tags' ? this.allTags : this.allCategories;
        const item = list.find(i => i.name === oldName);
        if (item) {
            item.name = newName;
        }
    }
}
