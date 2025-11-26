
export class BulkActionBar {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.callbacks = callbacks; // { onMove, onTag, onDelete, onClear }
        this.selectedCount = 0;
        
        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div id="bulk-bar" class="bulk-bar-container">
                <div class="bulk-bar">
                    <span id="bulk-count-badge" class="bulk-count">0 selected</span>
                    
                    <button class="bulk-btn" data-action="category" title="Move to Category">
                        <i data-lucide="folder-input" class="w-5 h-5"></i>
                    </button>
                    
                    <button class="bulk-btn" data-action="tag" title="Add Tags">
                        <i data-lucide="tag" class="w-5 h-5"></i>
                    </button>
                    
                    <button class="bulk-btn" data-action="delete" title="Delete Selected">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                    
                    <div class="bulk-separator"></div>
                    
                    <button class="bulk-btn" data-action="clear" title="Clear Selection">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        const bar = document.getElementById('bulk-bar');
        bar.addEventListener('click', (e) => {
            const btn = e.target.closest('.bulk-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            if (action === 'category' && this.callbacks.onMove) this.callbacks.onMove();
            if (action === 'tag' && this.callbacks.onTag) this.callbacks.onTag();
            if (action === 'delete' && this.callbacks.onDelete) this.callbacks.onDelete();
            if (action === 'clear' && this.callbacks.onClear) this.callbacks.onClear();
        });
    }

    update(selectedIds) {
        this.selectedCount = selectedIds.length;
        const bar = document.getElementById('bulk-bar');
        const badge = document.getElementById('bulk-count-badge');
        
        badge.textContent = `${this.selectedCount} selected`;

        if (this.selectedCount > 0) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    }
}
