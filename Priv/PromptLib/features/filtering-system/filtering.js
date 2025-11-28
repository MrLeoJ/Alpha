
import { getCategories, sortCategories } from '../categories/categories.js';
import { renderIcons } from '../../js/utils.js';

export class FilteringSystem {
    constructor(options) {
        this.getInitialState = () => ({
            sort: 'custom',
            categories: [],
            tags: []
        });
        this.state = this.getInitialState();
        this.availableTags = [];
        this.onFilterChange = options.onFilterChange || (() => {});
    }

    setAvailableTags(tags) {
        this.availableTags = tags.sort();
        if (this.ui) {
            this.renderTags();
        }
    }

    render(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-panel-wrapper';
        wrapper.id = 'filterPanelWrapper';
        
        wrapper.innerHTML = `
            <div class="filter-panel">
                
                <!-- Sort Section -->
                <div class="filter-section">
                    <div class="filter-section-title">Sort By</div>
                    <div class="filter-chips-grid" id="sortContainer">
                        <div class="filter-chip active" data-group="sort" data-val="custom">Custom Order</div>
                        <div class="filter-chip" data-group="sort" data-val="popularity"><i data-feather="trending-up" width="12" height="12" style="margin-right:4px"></i> Popularity</div>
                        <div class="filter-chip" data-group="sort" data-val="newest">Newest First</div>
                        <div class="filter-chip" data-group="sort" data-val="oldest">Oldest First</div>
                        <div class="filter-chip" data-group="sort" data-val="az">A-Z</div>
                        <div class="filter-chip" data-group="sort" data-val="za">Z-A</div>
                    </div>
                </div>

                <!-- Category Section -->
                <div class="filter-section">
                    <div class="filter-section-title">Category</div>
                    <div class="filter-chips-grid" id="categoryFilterContainer">
                        <span style="font-size:0.8rem; color:var(--text-light);">Loading...</span>
                    </div>
                </div>

                <!-- Tags Section -->
                <div class="filter-section">
                    <div class="filter-section-title">Tags (All Required)</div>
                    <div class="filter-chips-grid tags-scroll-area" id="tagsFilterContainer">
                        <!-- Populated via JS -->
                    </div>
                </div>

                <!-- Footer -->
                <div class="filter-actions-footer">
                    <button class="filter-reset-btn" id="filterResetBtn">Reset all filters</button>
                </div>
            </div>
        `;

        container.appendChild(wrapper);
        this.ui = {
            wrapper,
            sortContainer: wrapper.querySelector('#sortContainer'),
            categoryContainer: wrapper.querySelector('#categoryFilterContainer'),
            tagsContainer: wrapper.querySelector('#tagsFilterContainer'),
            resetBtn: wrapper.querySelector('#filterResetBtn')
        };

        this.initUI();
    }

    async initUI() {
        // 1. Render Categories (Async)
        const catsMap = await getCategories();
        this.ui.categoryContainer.innerHTML = ''; // Clear loading
        
        const sortedCats = sortCategories(catsMap);
        
        sortedCats.forEach(cat => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip category-chip';
            chip.dataset.val = cat.id;
            
            // Set CSS variable for the brand color to be used in styles
            chip.style.setProperty('--brand-color', cat.color);
            
            // Structure: Icon + Label (replaced dot with icon)
            chip.innerHTML = `<i data-feather="${cat.icon || 'circle'}" width="14" height="14"></i><span>${cat.label}</span>`;
            
            chip.addEventListener('click', () => this.toggleCategory(cat.id, chip));
            this.ui.categoryContainer.appendChild(chip);
        });
        renderIcons();

        // 2. Render Tags
        this.renderTags();

        // 3. Sort Events
        this.ui.sortContainer.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                // Clear active
                this.ui.sortContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                // Set active
                chip.classList.add('active');
                this.state.sort = chip.dataset.val;
                this.emitChange();
            });
        });

        // 4. Reset Event
        this.ui.resetBtn.addEventListener('click', () => {
            this.reset();
        });
    }

    renderTags() {
        if (!this.ui || !this.ui.tagsContainer) return;
        
        this.ui.tagsContainer.innerHTML = '';
        
        if (this.availableTags.length === 0) {
            this.ui.tagsContainer.innerHTML = '<span style="font-size:0.8rem; color:var(--text-light); padding: 4px 8px;">No tags available.</span>';
            return;
        }

        this.availableTags.forEach(tag => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            if (this.state.tags.includes(tag)) chip.classList.add('active');
            chip.innerHTML = `${tag}`;
            
            chip.addEventListener('click', () => this.toggleTag(tag, chip));
            this.ui.tagsContainer.appendChild(chip);
        });
    }

    toggleCategory(id, el) {
        if (this.state.categories.includes(id)) {
            this.state.categories = this.state.categories.filter(x => x !== id);
            el.classList.remove('active');
        } else {
            this.state.categories.push(id);
            el.classList.add('active');
        }
        this.emitChange();
    }

    toggleTag(tag, el) {
        if (this.state.tags.includes(tag)) {
            this.state.tags = this.state.tags.filter(x => x !== tag);
            el.classList.remove('active');
        } else {
            this.state.tags.push(tag);
            el.classList.add('active');
        }
        this.emitChange();
    }

    reset() {
        // 1. Reset State completely
        this.state = this.getInitialState();
        
        // 2. Reset UI Classes - Sort
        this.ui.sortContainer.querySelectorAll('.filter-chip').forEach(c => {
            if (c.dataset.val === 'custom') { // Default is now custom
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
        
        // 3. Reset UI Classes - Categories
        this.ui.categoryContainer.querySelectorAll('.filter-chip').forEach(c => {
            c.classList.remove('active');
        });

        // 4. Reset UI Classes - Tags
        this.ui.tagsContainer.querySelectorAll('.filter-chip').forEach(c => {
            c.classList.remove('active');
        });

        // 5. Emit Change to parent
        this.emitChange();
    }

    togglePanel() {
        this.ui.wrapper.classList.toggle('open');
        return this.ui.wrapper.classList.contains('open');
    }

    closePanel() {
        if (this.ui && this.ui.wrapper) {
            this.ui.wrapper.classList.remove('open');
        }
    }

    isOpen() {
        return this.ui && this.ui.wrapper && this.ui.wrapper.classList.contains('open');
    }

    emitChange() {
        this.onFilterChange(this.state);
    }
}
