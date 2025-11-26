
export class ViewToggles {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.onViewChange = options.onViewChange;
        this.currentView = options.initialView || 'grid';
        
        // We defer rendering until mount() is called if container doesn't exist yet,
        // but typically CommandIsland will call renderHTML() and inject it.
    }

    renderHTML() {
        return `
            <div id="${this.containerId}" class="view-toggles-container">
                <button class="view-toggle-btn ${this.currentView === 'grid' ? 'active' : ''}" 
                        data-view="grid" title="Grid View">
                    <i data-lucide="layout-grid" class="w-4 h-4"></i>
                </button>
                <button class="view-toggle-btn ${this.currentView === 'kanban' ? 'active' : ''}" 
                        data-view="kanban" title="Kanban View">
                    <i data-lucide="kanban" class="w-4 h-4"></i>
                </button>
                <button class="view-toggle-btn ${this.currentView === 'list' ? 'active' : ''}" 
                        data-view="list" title="List View">
                    <i data-lucide="list" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }

    attachEvents() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('.view-toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.setActive(view);
                if (this.onViewChange) this.onViewChange(view);
            });
        });
    }

    setActive(viewName) {
        this.currentView = viewName;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('.view-toggle-btn');
        buttons.forEach(btn => {
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
