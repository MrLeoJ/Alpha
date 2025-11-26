
export class TaxonomyManager {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.onRename = callbacks.onRename;
        this.onMerge = callbacks.onMerge;
        this.onDelete = callbacks.onDelete;
        
        // State
        this.items = []; // Current list (tags or categories)
        this.mode = 'tags'; // 'tags' or 'categories'
        this.editingItem = null; // ID/Name of item being edited
        this.mergingItem = null; // ID/Name of item being merged
        this.allItems = { tags: [], categories: [] };

        this.render();
        
        // DOM Refs - MUST be defined before attachEvents
        this.modalEl = document.getElementById('tm-overlay');
        this.listContainer = document.getElementById('tm-list');
        
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div id="tm-overlay" class="fixed inset-0 z-[60] flex items-center justify-center tm-backdrop tm-closed hidden">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 border border-secondary tm-content flex flex-col max-h-[85vh]">
                    
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                        <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i data-lucide="library" class="w-5 h-5 text-primary"></i> Taxonomy Manager
                        </h2>
                        <button id="tm-close-btn" class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div class="flex border-b border-gray-100 shrink-0">
                        <button class="tm-tab-btn active flex-1 py-3 text-sm font-bold text-center" data-tab="tags">Tags</button>
                        <button class="tm-tab-btn flex-1 py-3 text-sm font-bold text-center" data-tab="categories">Categories</button>
                    </div>

                    <!-- List Content -->
                    <div id="tm-list" class="flex-1 overflow-y-auto p-4 space-y-1 bg-white tm-list-container">
                        <!-- Items injected here -->
                    </div>

                    <!-- Footer Help -->
                    <div class="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center rounded-b-2xl shrink-0">
                        Manage your content organization. Changes affect all projects immediately.
                    </div>
                </div>
            </div>
        `;
    }

    // Public API to open the manager
    open(tags, categories) {
        this.allItems.tags = tags || [];
        this.allItems.categories = categories || [];
        
        // Reset state
        this.mode = 'tags'; 
        this.items = this.allItems.tags;
        this.editingItem = null;
        this.mergingItem = null;

        this.updateTabs();
        this.renderList();

        this.modalEl.classList.remove('hidden');
        // Slight delay for animation
        setTimeout(() => {
            this.modalEl.classList.remove('tm-closed');
            this.modalEl.classList.add('tm-open');
        }, 10);
    }

    close() {
        this.modalEl.classList.remove('tm-open');
        this.modalEl.classList.add('tm-closed');
        setTimeout(() => {
            this.modalEl.classList.add('hidden');
        }, 300);
    }

    switchTab(tabName) {
        this.mode = tabName;
        this.items = tabName === 'tags' ? this.allItems.tags : this.allItems.categories;
        this.editingItem = null;
        this.mergingItem = null;
        this.updateTabs();
        this.renderList();
    }

    updateTabs() {
        document.querySelectorAll('.tm-tab-btn').forEach(btn => {
            if (btn.dataset.tab === this.mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    renderList() {
        if (this.items.length === 0) {
            this.listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                    <i data-lucide="tag" class="w-8 h-8 mb-2 opacity-50"></i>
                    <p class="text-sm">No ${this.mode} found.</p>
                </div>
            `;
            // eslint-disable-next-line no-undef
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        this.listContainer.innerHTML = this.items.map(item => this.createItemRow(item)).join('');
        // eslint-disable-next-line no-undef
        if (window.lucide) window.lucide.createIcons();
    }

    createItemRow(item) {
        const isEditing = this.editingItem === item.name;
        const isMerging = this.mergingItem === item.name;

        if (isEditing) {
            return `
                <div class="tm-item-row flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5">
                    <input type="text" id="tm-edit-input-${item.name}" value="${item.name}" 
                           class="bg-white border border-primary/30 rounded px-2 py-1 text-sm font-medium text-gray-800 outline-none w-full mr-2" 
                           autofocus />
                    <div class="flex gap-2">
                        <button onclick="window.tmSaveRename('${item.name}')" class="p-1.5 bg-primary text-white rounded hover:bg-[#00bkbadd] transition-colors" title="Save">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.tmCancelAction()" class="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors" title="Cancel">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        if (isMerging) {
            // Filter out current item from candidates
            const candidates = this.items.filter(i => i.name !== item.name);
            const options = candidates.map(c => `<option value="${c.name}">${c.name} (${c.count})</option>`).join('');

            return `
                <div class="tm-item-row flex flex-col md:flex-row items-start md:items-center justify-between p-3 rounded-lg border border-blue-400 bg-blue-50 gap-3">
                    <div class="flex items-center gap-2 text-sm text-blue-800 w-full md:w-auto">
                        <i data-lucide="merge" class="w-4 h-4"></i>
                        <span class="font-bold whitespace-nowrap">Merge "${item.name}" into:</span>
                    </div>
                    <div class="flex gap-2 w-full md:w-auto flex-1 justify-end">
                        <select id="tm-merge-select-${item.name}" class="flex-1 md:flex-none w-full md:w-48 bg-white border border-blue-200 rounded px-2 py-1.5 text-sm outline-none">
                            ${options}
                        </select>
                        <button onclick="window.tmConfirmMerge('${item.name}')" class="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" title="Confirm Merge">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.tmCancelAction()" class="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors" title="Cancel">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="tm-item-row flex items-center justify-between p-3 rounded-lg group">
                <div class="flex items-center gap-3">
                    <div class="bg-gray-100 text-gray-500 p-2 rounded-md">
                        <i data-lucide="${this.mode === 'tags' ? 'hash' : 'folder'}" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-sm text-gray-800">${item.name}</h4>
                        <span class="text-xs text-gray-400">${item.count} project${item.count !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <div class="tm-item-actions flex items-center gap-1">
                    <button onclick="window.tmStartEdit('${item.name}')" class="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Rename">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.tmStartMerge('${item.name}')" class="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Merge">
                        <i data-lucide="merge" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.tmDelete('${item.name}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Tab Switching
        this.container.querySelectorAll('.tm-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Close logic
        const closeBtn = document.getElementById('tm-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        if (this.modalEl) {
            this.modalEl.addEventListener('click', (e) => {
                if (e.target === this.modalEl) this.close();
            });
        }

        // Global handlers for the inline onclicks
        window.tmStartEdit = (name) => {
            this.editingItem = name;
            this.mergingItem = null;
            this.renderList();
        };

        window.tmStartMerge = (name) => {
            if (this.items.length < 2) {
                // eslint-disable-next-line no-undef
                Toastify({
                    text: "Need at least 2 items to merge.",
                    style: { background: "#ef4444" }
                }).showToast();
                return;
            }
            this.mergingItem = name;
            this.editingItem = null;
            this.renderList();
        };

        window.tmCancelAction = () => {
            this.editingItem = null;
            this.mergingItem = null;
            this.renderList();
        };

        window.tmSaveRename = (oldName) => {
            const input = document.getElementById(`tm-edit-input-${oldName}`);
            const newName = input.value.trim();
            if (newName && newName !== oldName) {
                if (this.onRename) this.onRename(this.mode, oldName, newName);
                // Optimistic Update
                this.items = this.items.map(i => i.name === oldName ? { ...i, name: newName } : i);
            }
            this.editingItem = null;
            this.renderList();
        };

        window.tmConfirmMerge = (fromName) => {
            const select = document.getElementById(`tm-merge-select-${fromName}`);
            const toName = select.value;
            if (toName) {
                if (this.onMerge) this.onMerge(this.mode, fromName, toName);
            }
            this.mergingItem = null;
        };

        window.tmDelete = (name) => {
            if (confirm(`Are you sure you want to delete "${name}"? It will be removed from all projects.`)) {
                if (this.onDelete) this.onDelete(this.mode, name);
                // Optimistic
                this.items = this.items.filter(i => i.name !== name);
                this.renderList();
            }
        };
    }
}
