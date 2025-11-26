
import { AutoFill } from '../AutoFill/AutoFill.js';

export class AddModal {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.onSave = callbacks.onSave;
        this.editingId = null; // Track if we are editing
        
        // AutoFill Instances
        this.tagAutoFill = null;
        this.catAutoFill = null;

        this.render();
        
        // DOM refs - Define before attachEvents
        this.modalEl = document.getElementById('add-modal-overlay');
        this.titleEl = document.getElementById('am-title');
        this.submitBtnEl = document.getElementById('am-submit-btn');

        this.attachEvents();
        this.initAutoFill();
    }

    render() {
        this.container.innerHTML = `
            <div id="add-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop modal-closed hidden">
                <div id="add-modal-content" class="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 border border-secondary modal-content">
                    
                    <!-- Modal Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 id="am-title" class="text-xl font-bold text-gray-800">Add Project</h2>
                        <button id="am-close-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <!-- Modal Form -->
                    <form id="add-project-form" class="p-6 space-y-4">
                        
                        <!-- Title & URL -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                <input type="text" name="title" required class="w-full bg-gray-50 border border-secondary rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Project URL</label>
                                <input type="url" name="linkUrl" required class="w-full bg-gray-50 border border-secondary rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
                            </div>
                        </div>

                        <!-- Description -->
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                            <textarea name="description" rows="3" required class="w-full bg-gray-50 border border-secondary rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"></textarea>
                        </div>

                        <!-- Tags & Categories -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tags (comma separated)</label>
                                <!-- Added ID for AutoFill -->
                                <input type="text" id="am-input-tags" name="tags" placeholder="React, Design, API" class="w-full bg-gray-50 border border-secondary rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" autocomplete="off">
                            </div>
                            <div>
                                 <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                 <!-- Added ID for AutoFill -->
                                 <input type="text" id="am-input-category" name="category" placeholder="Web App" class="w-full bg-gray-50 border border-secondary rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" autocomplete="off">
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="pt-4 flex justify-end gap-3">
                            <button type="button" id="am-cancel-btn" class="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                            <button type="submit" id="am-submit-btn" class="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200">Save Project</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

    initAutoFill() {
        // Initialize AutoFill components attached to the new IDs
        this.tagAutoFill = new AutoFill('am-input-tags', {
            multiple: true
        });

        this.catAutoFill = new AutoFill('am-input-category', {
            multiple: false
        });
    }

    attachEvents() {
        document.getElementById('am-close-btn').addEventListener('click', () => this.close());
        document.getElementById('am-cancel-btn').addEventListener('click', () => this.close());
        
        // Use the pre-fetched this.modalEl
        if (this.modalEl) {
            this.modalEl.addEventListener('click', (e) => {
                if (e.target === this.modalEl) this.close();
            });
        }

        // Form Submit
        document.getElementById('add-project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });
    }

    handleFormSubmit(e) {
        const formData = new FormData(e.target);
        
        // Parse tags
        const rawTags = formData.get('tags').toString();
        const tagsArray = rawTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        
        const projectData = {
            title: formData.get('title'),
            description: formData.get('description'),
            linkUrl: formData.get('linkUrl'),
            tags: tagsArray,
            category: formData.get('category').toString().trim()
        };

        if (this.onSave) {
            this.onSave(projectData, this.editingId);
        }
    }

    // Updated: Accept suggestions object { tags: [], categories: [] }
    open(project = null, suggestions = { tags: [], categories: [] }) {
        const form = document.getElementById('add-project-form');
        form.reset();

        // Update AutoFill sources with latest data from App.js
        if (this.tagAutoFill) this.tagAutoFill.setSource(suggestions.tags);
        if (this.catAutoFill) this.catAutoFill.setSource(suggestions.categories);

        if (project) {
            // Edit Mode
            this.editingId = project.id;
            this.titleEl.textContent = 'Edit Project';
            this.submitBtnEl.textContent = 'Update Project';
            
            // Populate form
            form.elements['title'].value = project.title || '';
            form.elements['description'].value = project.description || '';
            form.elements['linkUrl'].value = project.linkUrl || '';
            form.elements['category'].value = project.category || '';
            if (project.tags) {
                form.elements['tags'].value = project.tags.join(', ');
            }
        } else {
            // Add Mode
            this.editingId = null;
            this.titleEl.textContent = 'Add Project';
            this.submitBtnEl.textContent = 'Save Project';
        }

        this.modalEl.classList.remove('hidden');
        setTimeout(() => {
            this.modalEl.classList.remove('modal-closed');
            this.modalEl.classList.add('modal-open');
        }, 10);
    }

    close() {
        this.modalEl.classList.remove('modal-open');
        this.modalEl.classList.add('modal-closed');
        
        setTimeout(() => {
            this.modalEl.classList.add('hidden');
            document.getElementById('add-project-form').reset();
            this.editingId = null;
        }, 300);
    }
}
