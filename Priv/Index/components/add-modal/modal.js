
export class AddModal {
    constructor(saveCallback) {
        this.saveCallback = saveCallback;
        this.element = document.getElementById('modal-container');
        this.render(); // Render markup immediately so it exists in DOM
        this.cacheDOM();
        this.attachEvents();
    }

    render() {
        this.element.innerHTML = `
            <div id="addModal" class="fixed inset-0 z-50 hidden flex items-center justify-center">
                <!-- Backdrop -->
                <div id="modalBackdrop" class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity opacity-0"></div>
                
                <!-- Modal Content -->
                <div id="modalContent" class="relative bg-white w-[90%] max-w-lg rounded-2xl shadow-2xl p-8 transform scale-95 opacity-0 transition-all duration-300">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">New Project</h2>
                        <button id="closeModalBtn" class="text-gray-400 hover:text-red-500 transition-colors">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <form id="addProjectForm" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Title</label>
                            <input type="text" name="title" required class="w-full bg-gray-50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold text-gray-700" placeholder="Project Name">
                        </div>
                        
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                            <textarea name="description" rows="2" class="w-full bg-gray-50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-gray-600" placeholder="Brief description..."></textarea>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Link URL</label>
                                <input type="url" name="linkUrl" required class="w-full bg-gray-50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm" placeholder="https://...">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Image URL</label>
                                <input type="url" name="imageUrl" class="w-full bg-gray-50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm" placeholder="https://...">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tags</label>
                            <input type="text" name="tags" class="w-full bg-gray-50 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm" placeholder="React, Design, API (comma separated)">
                            <p class="text-[10px] text-gray-400 mt-1 text-right">Separate tags with commas</p>
                        </div>

                        <button type="submit" class="w-full bg-primary hover:shadow-[0_0_15px_rgba(0,210,195,0.4)] text-white font-bold py-3 rounded-xl mt-4 transition-all duration-300">
                            Create Project
                        </button>
                    </form>
                </div>
            </div>
        `;
        if(window.lucide) window.lucide.createIcons();
    }

    cacheDOM() {
        this.modal = document.getElementById('addModal');
        this.backdrop = document.getElementById('modalBackdrop');
        this.content = document.getElementById('modalContent');
        this.form = document.getElementById('addProjectForm');
        this.closeBtn = document.getElementById('closeModalBtn');
    }

    attachEvents() {
        this.closeBtn.addEventListener('click', () => this.toggle(false));
        this.backdrop.addEventListener('click', () => this.toggle(false));

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            
            // UI Loading state
            const btn = this.form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Saving...';
            btn.disabled = true;

            try {
                await this.saveCallback(data);
                this.form.reset();
                this.toggle(false);
            } catch (err) {
                console.error(err);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    toggle(show) {
        if (show) {
            this.modal.classList.remove('hidden');
            setTimeout(() => {
                this.backdrop.classList.remove('opacity-0');
                this.content.classList.remove('opacity-0', 'scale-95');
            }, 10);
        } else {
            this.backdrop.classList.add('opacity-0');
            this.content.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                this.modal.classList.add('hidden');
            }, 300);
        }
    }
}
