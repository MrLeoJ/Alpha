
export class CommandIsland {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.onSearch = callbacks.onSearch;
        this.onFilterChange = callbacks.onFilterChange;
        this.onAddClick = callbacks.onAddClick;
        this.onManageClick = callbacks.onManageClick;
        
        // State
        this.tags = [];
        this.categories = [];
        this.selectedTags = new Set();
        this.selectedCategories = new Set();
        this.isFilterModalOpen = false;
        this.isSearchExpanded = false;
        this.filterSearchQuery = '';

        this.render();
        this.attachEvents();
        
        // Global Shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    }

    render() {
        this.container.innerHTML = `
            <!-- Floating Command Bar -->
            <div class="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-auto max-w-[90%] island-container transition-all duration-300">
                <div class="bg-white rounded-full island-shadow p-2 flex items-center gap-2 border border-secondary/30 relative">
                    
                    <!-- Search Wrapper -->
                    <div id="ci-search-wrapper" class="flex items-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-10 h-10 bg-transparent rounded-full">
                        <button id="ci-search-trigger" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors shrink-0 outline-none">
                            <i data-lucide="search" class="w-5 h-5"></i>
                        </button>
                        <input type="text" id="ci-search" placeholder="Search projects..." 
                               class="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 outline-none h-full opacity-0 w-0 transition-all duration-300 px-0 translate-x-4">
                    </div>

                    <!-- Divider -->
                    <div class="h-6 w-[1px] bg-gray-200"></div>
                    
                    <!-- Filter Trigger -->
                    <button id="ci-filter-btn" class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors relative shrink-0 outline-none">
                        <i data-lucide="sliders-horizontal" class="w-5 h-5"></i>
                        <span id="filter-badge" class="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full hidden border border-white"></span>
                    </button>

                    <!-- Add Button -->
                    <button id="ci-add-btn" class="bg-primary hover:bg-[#00b5a8] text-white rounded-full p-3 shadow-lg transition-all duration-200 group shrink-0 ml-1 outline-none">
                        <i data-lucide="plus" class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"></i>
                    </button>
                </div>
            </div>

            <!-- Filter Modal -->
            <div id="ci-filter-modal" class="fixed inset-0 z-[60] flex items-center justify-center filter-modal-backdrop filter-modal-closed hidden">
                <div class="rounded-[32px] w-full max-w-2xl m-4 filter-modal-content flex flex-col max-h-[85vh] overflow-hidden">
                    
                    <!-- Header -->
                    <div class="px-8 pt-8 pb-6 shrink-0">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Filter Projects</h2>
                                <p class="text-gray-400 text-sm mt-1 font-medium">Refine your view by category or tag</p>
                            </div>
                            <button id="ci-modal-close" class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200">
                                <i data-lucide="x" class="w-6 h-6"></i>
                            </button>
                        </div>
                        
                        <!-- Internal Search -->
                        <div class="relative group">
                            <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300"></i>
                            <input type="text" id="ci-filter-search" placeholder="Type to find tags or categories..." 
                                   class="w-full pl-12 pr-4 py-4 text-base rounded-2xl outline-none modal-search-input text-gray-700">
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
                        
                        <!-- Categories -->
                        <div id="ci-modal-categories-section">
                            <div class="section-header">
                                <span class="section-title">Categories</span>
                            </div>
                            <div id="ci-categories-list" class="flex flex-wrap gap-3"></div>
                        </div>

                        <!-- Tags -->
                        <div id="ci-modal-tags-section">
                            <div class="section-header">
                                <span class="section-title">Tags</span>
                            </div>
                            <div id="ci-tags-list" class="flex flex-wrap gap-2.5"></div>
                        </div>

                        <!-- Empty State -->
                        <div id="ci-filter-empty" class="hidden flex flex-col items-center justify-center py-12 text-gray-400">
                            <div class="bg-gray-50 p-4 rounded-full mb-3">
                                <i data-lucide="filter-x" class="w-8 h-8 opacity-40"></i>
                            </div>
                            <p class="text-sm font-medium">No matching filters found</p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                         <button id="ci-manage-btn" class="text-xs font-bold text-gray-500 hover:text-primary flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-white/80 border border-transparent hover:border-gray-200/50">
                            <i data-lucide="settings-2" class="w-3.5 h-3.5"></i> 
                            Manage Taxonomy
                        </button>
                        
                        <div class="flex gap-3">
                            <button id="ci-clear-filters" class="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors px-4 py-2.5 rounded-xl hover:bg-white/80">
                                Reset
                            </button>
                            <button id="ci-apply-filters" class="text-sm font-bold text-white bg-primary hover:bg-[#00b5a8] transition-all px-8 py-2.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0">
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setFilterData(tags, categories) {
        this.tags = tags || [];
        this.categories = categories || [];
        this.renderFilterOptions();
    }

    renderFilterOptions() {
        const categoriesContainer = document.getElementById('ci-categories-list');
        const tagsContainer = document.getElementById('ci-tags-list');
        const catSection = document.getElementById('ci-modal-categories-section');
        const tagSection = document.getElementById('ci-modal-tags-section');
        const emptyState = document.getElementById('ci-filter-empty');

        if (!categoriesContainer || !tagsContainer) return;

        const query = this.filterSearchQuery.toLowerCase();

        // Filter data based on search
        const filteredCategories = this.categories.filter(c => c.name.toLowerCase().includes(query));
        const filteredTags = this.tags.filter(t => t.name.toLowerCase().includes(query));

        // Render Categories
        if (filteredCategories.length > 0) {
            categoriesContainer.innerHTML = filteredCategories.map(cat => `
                <button class="filter-chip ${this.selectedCategories.has(cat.name) ? 'active' : ''}" 
                        data-type="category" data-value="${cat.name}">
                    ${cat.name}
                    <span class="chip-badge">${cat.count}</span>
                </button>
            `).join('');
            catSection.classList.remove('hidden');
        } else {
            categoriesContainer.innerHTML = '';
            catSection.classList.add('hidden');
        }

        // Render Tags
        if (filteredTags.length > 0) {
            tagsContainer.innerHTML = filteredTags.map(tag => `
                <button class="filter-chip ${this.selectedTags.has(tag.name) ? 'active' : ''}" 
                        data-type="tag" data-value="${tag.name}">
                    #${tag.name}
                    <span class="chip-badge">${tag.count}</span>
                </button>
            `).join('');
            tagSection.classList.remove('hidden');
        } else {
            tagsContainer.innerHTML = '';
            tagSection.classList.add('hidden');
        }

        // Handle Empty State
        if (filteredCategories.length === 0 && filteredTags.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }

        // Re-attach listeners since DOM changed
        this.attachChipListeners();
        
        // Refresh icons for new content
        if(window.lucide) window.lucide.createIcons();
    }

    // --- Search Logic ---

    expandSearch() {
        this.isSearchExpanded = true;
        const wrapper = document.getElementById('ci-search-wrapper');
        const input = document.getElementById('ci-search');

        // Styles for Expanded State
        wrapper.classList.remove('w-10');
        wrapper.classList.add('w-64', 'bg-gray-50');
        
        input.classList.remove('opacity-0', 'w-0', 'px-0', 'translate-x-4');
        input.classList.add('opacity-100', 'w-full', 'px-3', 'translate-x-0');
        
        input.focus();
    }

    collapseSearch() {
        const input = document.getElementById('ci-search');
        // Only collapse if empty
        if (input.value.trim() !== '') return;

        this.isSearchExpanded = false;
        const wrapper = document.getElementById('ci-search-wrapper');

        // Styles for Collapsed State
        wrapper.classList.remove('w-64', 'bg-gray-50');
        wrapper.classList.add('w-10');

        input.classList.remove('opacity-100', 'w-full', 'px-3', 'translate-x-0');
        input.classList.add('opacity-0', 'w-0', 'px-0', 'translate-x-4');
    }

    handleGlobalKeydown(e) {
        // Ctrl/Cmd + K
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            this.expandSearch();
        }
        
        // Escape logic
        if (e.key === 'Escape') {
            if (this.isFilterModalOpen) {
                this.closeFilterModal();
            } else if (this.isSearchExpanded) {
                const input = document.getElementById('ci-search');
                input.value = '';
                if (this.onSearch) this.onSearch('');
                this.collapseSearch();
                input.blur();
            }
        }
    }

    // --- Filter Modal Logic ---

    openFilterModal() {
        this.isFilterModalOpen = true;
        const modal = document.getElementById('ci-filter-modal');
        const btn = document.getElementById('ci-filter-btn');

        modal.classList.remove('hidden');
        // Small delay for CSS transition
        setTimeout(() => {
            modal.classList.remove('filter-modal-closed');
            modal.classList.add('filter-modal-open');
        }, 10);
        
        btn.classList.add('bg-gray-100', 'text-primary');

        // Auto focus internal search
        setTimeout(() => {
            const input = document.getElementById('ci-filter-search');
            if(input) input.focus();
        }, 100);
    }

    closeFilterModal() {
        this.isFilterModalOpen = false;
        const modal = document.getElementById('ci-filter-modal');
        const btn = document.getElementById('ci-filter-btn');
        
        modal.classList.remove('filter-modal-open');
        modal.classList.add('filter-modal-closed');
        btn.classList.remove('bg-gray-100', 'text-primary');

        setTimeout(() => {
            modal.classList.add('hidden');
            this.filterSearchQuery = '';
            document.getElementById('ci-filter-search').value = '';
            this.renderFilterOptions();
        }, 300);
    }

    handleChipClick(type, value) {
        if (type === 'category') {
            if (this.selectedCategories.has(value)) {
                this.selectedCategories.delete(value);
            } else {
                this.selectedCategories.add(value);
            }
        } else if (type === 'tag') {
            if (this.selectedTags.has(value)) {
                this.selectedTags.delete(value);
            } else {
                this.selectedTags.add(value);
            }
        }

        this.updateBadge();
        this.renderFilterOptions(); 
        this.emitChange();
    }

    clearFilters() {
        this.selectedTags.clear();
        this.selectedCategories.clear();
        this.updateBadge();
        this.renderFilterOptions();
        this.emitChange();
    }

    updateBadge() {
        const badge = document.getElementById('filter-badge');
        const count = this.selectedCategories.size + this.selectedTags.size;
        if (count > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    emitChange() {
        if (this.onFilterChange) {
            this.onFilterChange({
                tags: Array.from(this.selectedTags),
                categories: Array.from(this.selectedCategories)
            });
        }
    }

    attachEvents() {
        // Main Search Input
        const searchInput = document.getElementById('ci-search');
        searchInput.addEventListener('input', (e) => {
            if (this.onSearch) this.onSearch(e.target.value);
        });
        
        searchInput.addEventListener('blur', () => {
            this.collapseSearch();
        });

        // Search Trigger
        document.getElementById('ci-search-trigger').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isSearchExpanded) {
                searchInput.focus(); 
            } else {
                this.expandSearch();
            }
        });

        // Add Button
        document.getElementById('ci-add-btn').addEventListener('click', () => {
            if (this.onAddClick) this.onAddClick();
        });

        // Filter Modal Trigger
        document.getElementById('ci-filter-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFilterModal();
        });

        // Modal Internal Search
        document.getElementById('ci-filter-search').addEventListener('input', (e) => {
            this.filterSearchQuery = e.target.value;
            this.renderFilterOptions();
        });

        // Modal Buttons
        document.getElementById('ci-modal-close').addEventListener('click', () => this.closeFilterModal());
        document.getElementById('ci-apply-filters').addEventListener('click', () => this.closeFilterModal());
        
        document.getElementById('ci-clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Manage Taxonomy
        document.getElementById('ci-manage-btn').addEventListener('click', () => {
            this.closeFilterModal();
            if (this.onManageClick) this.onManageClick();
        });

        // Click outside to close modal
        const modal = document.getElementById('ci-filter-modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeFilterModal();
            }
        });
    }

    attachChipListeners() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = e.currentTarget.dataset.type;
                const value = e.currentTarget.dataset.value;
                this.handleChipClick(type, value);
            });
        });
    }
}
