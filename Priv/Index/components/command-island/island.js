
export class CommandIsland {
    constructor(store, openModalCallback) {
        this.store = store;
        this.openModalCallback = openModalCallback;
        this.element = document.getElementById('command-island-container');
        this.isSearchExpanded = false;
        this.init();
    }

    init() {
        this.render();
        this.attachEvents();
        
        // Subscribe to store updates to re-render tags if they change
        this.store.subscribe((state) => {
            this.updateTags(state.tags);
        });
    }

    render() {
        this.element.innerHTML = `
            <!-- Centered Island: top-1/2 left-1/2 with transforms -->
            <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-fade-in group/island">
                
                <!-- The Pill Container -->
                <div class="bg-white rounded-full shadow-2xl flex items-center p-2 pl-3 pr-2 gap-2 h-16 border border-gray-100 transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
                    
                    <!-- Expanding Search Section -->
                    <div class="flex items-center">
                        <button id="island-search-trigger" class="p-3 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20" title="Search (Ctrl + K)">
                            <i data-lucide="search" class="w-5 h-5"></i>
                        </button>
                        
                        <!-- Collapsible Input Container -->
                        <div id="island-search-container" class="w-0 overflow-hidden transition-all duration-300 ease-out opacity-0">
                            <input type="text" id="island-search" placeholder="Search..." 
                                class="w-48 bg-transparent outline-none text-gray-700 placeholder-gray-400 font-medium ml-1">
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="h-8 w-[1px] bg-gray-200 mx-2"></div>

                    <!-- Filter Dropdown -->
                    <div class="relative group">
                        <i data-lucide="filter" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <select id="island-filter" class="appearance-none bg-gray-50 hover:bg-gray-100 transition-colors rounded-full pl-9 pr-8 py-2 text-sm font-semibold text-gray-600 outline-none cursor-pointer focus:ring-2 focus:ring-primary/50 border border-transparent">
                            <option value="all">All Tags</option>
                            <!-- Options injected dynamically -->
                        </select>
                        <i data-lucide="chevron-down" class="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    </div>

                    <!-- Add Button -->
                    <button id="island-add-btn" class="bg-primary hover:bg-[#00bkb9] hover:shadow-[0_0_15px_rgba(0,210,195,0.4)] text-white w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group ml-2">
                        <i data-lucide="plus" class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"></i>
                    </button>
                </div>

                <!-- Keyboard Shortcut Hint (Visible on hover or when search is active) -->
                <div id="shortcut-hint" class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-300 font-bold tracking-widest opacity-0 group-hover/island:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                    CTRL + K
                </div>
            </div>
        `;
        
        // Initialize Icons for this component
        if(window.lucide) window.lucide.createIcons();
    }

    updateTags(tags) {
        const select = document.getElementById('island-filter');
        if (!select) return;

        const currentVal = select.value;
        const options = tags.map(tag => 
            `<option value="${tag.name}">${tag.name} (${tag.count})</option>`
        ).join('');
        
        select.innerHTML = `<option value="all">All Tags</option>` + options;
        
        if (tags.some(t => t.name === currentVal)) {
            select.value = currentVal;
        } else if (currentVal === 'all') {
            select.value = 'all';
        }
    }

    attachEvents() {
        const searchInput = document.getElementById('island-search');
        const filterSelect = document.getElementById('island-filter');
        const addBtn = document.getElementById('island-add-btn');
        const searchTrigger = document.getElementById('island-search-trigger');

        // Search Input Handling
        searchInput.addEventListener('input', (e) => {
            this.store.setSearch(e.target.value);
        });

        // Toggle Search Click
        searchTrigger.addEventListener('click', () => {
            this.toggleSearch();
        });

        // Filter Handling
        filterSelect.addEventListener('change', (e) => {
            this.store.setFilter(e.target.value);
        });

        // Add Modal
        addBtn.addEventListener('click', () => {
            this.openModalCallback();
        });

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl + K or Cmd + K
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggleSearch(true); // Force open
            }
            // Escape to close
            if (e.key === 'Escape' && this.isSearchExpanded) {
                this.toggleSearch(false); // Force close
            }
        });
    }

    toggleSearch(forceState = null) {
        const container = document.getElementById('island-search-container');
        const input = document.getElementById('island-search');
        
        // Determine target state
        const shouldExpand = forceState !== null ? forceState : !this.isSearchExpanded;
        this.isSearchExpanded = shouldExpand;

        if (shouldExpand) {
            container.classList.remove('w-0', 'opacity-0');
            container.classList.add('w-48', 'opacity-100');
            input.focus();
        } else {
            container.classList.remove('w-48', 'opacity-100');
            container.classList.add('w-0', 'opacity-0');
            input.blur();
            // Optional: Clear search on close? 
            // input.value = ''; 
            // this.store.setSearch('');
        }
    }
}
