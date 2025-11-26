
export class BulkEditModal {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.callbacks = callbacks; // { onConfirm }
        this.mode = 'category'; // or 'tags'
        this.render();
        
        this.modalEl = document.getElementById('bem-overlay');
        this.titleEl = document.getElementById('bem-title');
        this.formContainer = document.getElementById('bem-form-container');
        
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div id="bem-overlay" class="fixed inset-0 z-[110] flex items-center justify-center bem-backdrop bem-closed hidden">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm m-4 border border-gray-100 bem-content">
                    
                    <div class="p-5">
                        <div class="flex justify-between items-center mb-4">
                            <h3 id="bem-title" class="text-lg font-bold text-gray-800">Bulk Edit</h3>
                            <button id="bem-close-btn" class="text-gray-400 hover:text-gray-600">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                        
                        <div id="bem-form-container">
                            <!-- Injected inputs -->
                        </div>

                        <div class="mt-6 flex gap-2 justify-end">
                            <button id="bem-cancel-btn" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                            <button id="bem-confirm-btn" class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-[#00bkbadd] rounded-lg shadow-sm transition-colors">Confirm</button>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    open(mode, existingCategories = []) {
        this.mode = mode;
        this.titleEl.textContent = mode === 'category' ? 'Move Projects' : 'Add Tags';
        
        let html = '';
        if (mode === 'category') {
            const options = existingCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            html = `
                <div class="flex flex-col gap-3">
                    <label class="text-xs font-bold text-gray-500 uppercase">Select Category</label>
                    <select id="bem-input-select" class="w-full bg-gray-50 border border-secondary rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                        <option value="">-- Choose Category --</option>
                        ${options}
                    </select>
                    
                    <div class="text-center text-xs text-gray-400 font-medium">OR</div>
                    
                    <label class="text-xs font-bold text-gray-500 uppercase">New Category</label>
                    <input type="text" id="bem-input-text" placeholder="Type new category..." class="w-full bg-gray-50 border border-secondary rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                </div>
            `;
        } else {
            html = `
                <div class="flex flex-col gap-2">
                     <label class="text-xs font-bold text-gray-500 uppercase">Tags to Add</label>
                     <input type="text" id="bem-input-tags" placeholder="Design, React, Ideas..." class="w-full bg-gray-50 border border-secondary rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" autofocus>
                     <span class="text-xs text-gray-400">Separate multiple tags with commas.</span>
                </div>
            `;
        }
        
        this.formContainer.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

        this.modalEl.classList.remove('hidden');
        setTimeout(() => {
            this.modalEl.classList.remove('bem-closed');
            this.modalEl.classList.add('bem-open');
        }, 10);
        
        // Auto focus tag input
        if(mode === 'tags') {
             setTimeout(() => document.getElementById('bem-input-tags')?.focus(), 100);
        }
    }

    close() {
        this.modalEl.classList.remove('bem-open');
        this.modalEl.classList.add('bem-closed');
        setTimeout(() => {
            this.modalEl.classList.add('hidden');
        }, 300);
    }

    attachEvents() {
        document.getElementById('bem-close-btn').addEventListener('click', () => this.close());
        document.getElementById('bem-cancel-btn').addEventListener('click', () => this.close());
        
        document.getElementById('bem-confirm-btn').addEventListener('click', () => {
            this.handleConfirm();
        });
    }

    handleConfirm() {
        let result = null;
        if (this.mode === 'category') {
            const selectVal = document.getElementById('bem-input-select').value;
            const textVal = document.getElementById('bem-input-text').value.trim();
            result = textVal || selectVal;
        } else {
            result = document.getElementById('bem-input-tags').value.trim();
        }

        if (result && this.callbacks.onConfirm) {
            this.callbacks.onConfirm(this.mode, result);
        }
        this.close();
    }
}
