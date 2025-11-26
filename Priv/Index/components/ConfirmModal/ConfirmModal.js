
export class ConfirmModal {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.resolvePromise = null;
        this.render();
        this.attachEvents();
        
        // DOM refs
        this.overlay = document.getElementById('confirm-modal-overlay');
        this.messageEl = document.getElementById('cm-message');
        this.confirmBtn = document.getElementById('cm-confirm-btn');
    }

    render() {
        this.container.innerHTML = `
            <div id="confirm-modal-overlay" class="fixed inset-0 z-[60] flex items-center justify-center confirm-backdrop confirm-closed hidden">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm m-4 border border-secondary p-6 confirm-content flex flex-col items-center text-center">
                    
                    <!-- Icon -->
                    <div class="w-12 h-12 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center mb-4">
                        <i data-lucide="alert-circle" class="w-6 h-6"></i>
                    </div>

                    <h3 class="text-lg font-bold text-gray-800 mb-2">Are you sure?</h3>
                    <p id="cm-message" class="text-sm text-gray-500 mb-6 leading-relaxed"></p>

                    <!-- Buttons -->
                    <div class="flex gap-3 w-full">
                        <button id="cm-cancel-btn" class="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                            Cancel
                        </button>
                        <button id="cm-confirm-btn" class="flex-1 bg-primary hover:bg-[#00bkbadd] text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        `;
        // eslint-disable-next-line no-undef
        if (window.lucide) window.lucide.createIcons();
    }

    attachEvents() {
        document.getElementById('cm-cancel-btn').addEventListener('click', () => this.handleAction(false));
        document.getElementById('cm-confirm-btn').addEventListener('click', () => this.handleAction(true));
        
        // Close on backdrop click (treat as cancel)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.handleAction(false);
        });
    }

    ask(message) {
        return new Promise((resolve) => {
            this.messageEl.textContent = message;
            this.resolvePromise = resolve;
            
            this.overlay.classList.remove('hidden');
            // Small delay to allow display:block to apply before transition
            requestAnimationFrame(() => {
                this.overlay.classList.remove('confirm-closed');
                this.overlay.classList.add('confirm-open');
            });
        });
    }

    handleAction(result) {
        this.overlay.classList.remove('confirm-open');
        this.overlay.classList.add('confirm-closed');

        setTimeout(() => {
            this.overlay.classList.add('hidden');
            if (this.resolvePromise) {
                this.resolvePromise(result);
                this.resolvePromise = null;
            }
        }, 200);
    }
}
