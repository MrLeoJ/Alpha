
export class ProjectGrid {
    constructor(store, deleteCallback) {
        this.store = store;
        this.deleteCallback = deleteCallback;
        this.element = document.getElementById('grid-container');
        this.init();
    }

    init() {
        this.store.subscribe(() => {
            this.render();
        });
    }

    render() {
        const projects = this.store.getFilteredProjects();

        if (projects.length === 0) {
            this.renderEmptyState();
        } else {
            this.renderGrid(projects);
        }
        
        // Re-init icons
        if(window.lucide) window.lucide.createIcons();
    }

    renderEmptyState() {
        this.element.innerHTML = `
            <div class="flex flex-col items-center justify-center mt-20 text-center opacity-50 animate-fade-in">
                <i data-lucide="folder-open" class="w-16 h-16 mb-4 text-gray-300"></i>
                <p class="text-xl font-semibold text-gray-400">No projects found.</p>
                <p class="text-sm text-gray-400">Adjust your search or add a new project.</p>
            </div>
        `;
    }

    renderGrid(projects) {
        const gridHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                ${projects.map(project => this.createCardHTML(project)).join('')}
            </div>
        `;
        this.element.innerHTML = gridHTML;

        // Attach event listeners for delete buttons
        // We use delegation on the grid container for efficiency
        this.element.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click if we had one
                const id = btn.getAttribute('data-delete-id');
                this.deleteCallback(id);
            });
        });
    }

    createCardHTML(project) {
        return `
            <div class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 relative border border-transparent hover:border-gray-100 animate-fade-in">
                
                <!-- Card Image -->
                <div class="h-48 overflow-hidden bg-gray-100 relative">
                    <img src="${project.imageUrl || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop'}" 
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                         alt="${project.title}"
                         onerror="this.src='https://placehold.co/600x400/f3f4f6/a3a3a3?text=No+Image'">
                    
                    <!-- Overlay Actions -->
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-start justify-end p-4">
                        <button data-delete-id="${project.id}"
                                class="bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                                title="Delete Project">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-6">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-lg text-gray-800 leading-tight">${project.title}</h3>
                        <a href="${project.linkUrl}" target="_blank" class="text-primary hover:text-[#00bkb9] transition-colors">
                            <i data-lucide="external-link" class="w-5 h-5"></i>
                        </a>
                    </div>
                    
                    <p class="text-sm text-gray-500 line-clamp-2 mb-4 h-10">${project.description || 'No description provided.'}</p>
                    
                    <!-- Tags -->
                    <div class="flex flex-wrap gap-2">
                        ${project.tags && project.tags.length ? project.tags.map(tag => `
                            <span class="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-600 rounded-full border border-gray-100">
                                ${tag}
                            </span>
                        `).join('') : '<span class="text-xs text-gray-300 italic">No tags</span>'}
                    </div>
                </div>
            </div>
        `;
    }
}
