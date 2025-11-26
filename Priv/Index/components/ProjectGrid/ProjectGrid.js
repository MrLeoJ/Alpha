
import { ProjectCardActions } from '../ProjectCardActions/ProjectCardActions.js';

export class ProjectGrid {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.onDelete = callbacks.onDelete;
        this.onEdit = callbacks.onEdit;
        this.onClone = callbacks.onClone;
        this.onCategoryReorder = callbacks.onCategoryReorder;
        this.onProjectReorder = callbacks.onProjectReorder;
        this.onSelectionChange = callbacks.onSelectionChange;
        
        this.sortables = [];
        this.selectedIds = new Set();
        
        // Expose handlers globally
        window.gridDeleteHandler = (id) => { if (this.onDelete) this.onDelete(id); };
        window.gridEditHandler = (id) => { if (this.onEdit) this.onEdit(id); };
        window.gridCloneHandler = (id) => { if (this.onClone) this.onClone(id); };
        
        // Card Click Handler (Selection Logic)
        window.gridCardClickHandler = (event, id, url) => {
            const isModifier = event.metaKey || event.ctrlKey || event.shiftKey;
            
            if (isModifier) {
                if (this.selectedIds.has(id)) {
                    this.selectedIds.delete(id);
                } else {
                    this.selectedIds.add(id);
                }
                this.updateSelectionVisuals();
                this.notifySelection();
            } else {
                if (this.selectedIds.size > 0) {
                    this.clearSelection();
                } else {
                    if (url) window.open(url, '_blank');
                }
            }
        };

        window.toggleCategory = (btn) => {
            if(event) event.stopPropagation();
            const card = btn.closest('.category-card');
            const body = card.querySelector('.category-body');
            const icon = btn.querySelector('i');
            
            if (card.classList.contains('collapsed')) {
                card.classList.remove('collapsed');
                body.style.maxHeight = body.scrollHeight + "px";
                icon.style.transform = "rotate(0deg)";
                setTimeout(() => {
                    if (!card.classList.contains('collapsed')) body.style.maxHeight = 'none';
                }, 300);
            } else {
                body.style.maxHeight = body.scrollHeight + "px";
                requestAnimationFrame(() => {
                    card.classList.add('collapsed');
                    body.style.maxHeight = "0px";
                    icon.style.transform = "rotate(-90deg)";
                });
            }
        };
    }

    render(projects, orderedCategories = []) {
        this.destroySortables();

        if (!projects || projects.length === 0) {
            this.renderEmptyState();
            return;
        }

        const groups = {};
        projects.forEach(p => {
            const cat = p.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });

        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        // 1. Identify all categories to display
        const displayCategoryNames = new Set(Object.keys(groups));
        const categoriesToRender = [];
        const seenNames = new Set();

        // Use metadata from orderedCategories if available
        orderedCategories.forEach(cat => {
            if (displayCategoryNames.has(cat.name)) {
                categoriesToRender.push(cat);
                seenNames.add(cat.name);
            }
        });

        // Add remaining (uncategorized or new)
        const remainingNames = [...displayCategoryNames].filter(n => !seenNames.has(n));
        remainingNames.sort().forEach(name => {
            categoriesToRender.push({ name: name, id: null }); // Mock object for new/uncategorized
        });

        // 2. Distribute into 3 Columns
        const columns = [[], [], []];
        const columnHeights = [0, 0, 0]; // heuristic height tracking

        categoriesToRender.forEach(cat => {
            const projectCount = groups[cat.name].length;
            const estimatedHeight = 80 + (projectCount * 120); // Header + Items approx
            
            let targetColIndex = 0;

            // Priority 1: Explicit column assignment
            if (typeof cat.column === 'number' && cat.column >= 0 && cat.column <= 2) {
                targetColIndex = cat.column;
            } 
            // Priority 2: Masonry flow (Shortest column)
            else {
                let minH = Infinity;
                columnHeights.forEach((h, idx) => {
                    if (h < minH) {
                        minH = h;
                        targetColIndex = idx;
                    }
                });
            }

            columns[targetColIndex].push(cat);
            columnHeights[targetColIndex] += estimatedHeight;
        });


        const headerHtml = `
            <div class="mb-8 pl-2">
                <h1 class="text-3xl font-bold text-gray-800 tracking-tight">Index<span style="color: #5fcfc3">.</span></h1>
            </div>
        `;

        // 3. Render Columns
        const renderColumn = (colCats, colIndex) => `
            <div class="category-column flex flex-col gap-6" data-col-index="${colIndex}">
                ${colCats.map(cat => this.createCategoryCardHTML(cat.name, groups[cat.name])).join('')}
            </div>
        `;

        const gridHtml = `
            <div id="categories-grid-wrapper" class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pb-12">
                ${renderColumn(columns[0], 0)}
                ${renderColumn(columns[1], 1)}
                ${renderColumn(columns[2], 2)}
            </div>
        `;

        this.container.innerHTML = headerHtml + gridHtml;

        if (window.lucide) window.lucide.createIcons();
        this.initDragAndDrop();
        this.updateSelectionVisuals();
    }

    createCategoryCardHTML(categoryName, projects) {
        return `
            <div class="category-card bg-white rounded-2xl shadow-sm border border-secondary/50 transition-all duration-300 hover:shadow-md group/card" data-category="${categoryName}">
                <div class="category-header p-4 border-b border-gray-100 flex justify-between items-center cursor-grab active:cursor-grabbing bg-gray-50/50 rounded-t-2xl select-none">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <i data-lucide="grip-vertical" class="w-4 h-4 text-gray-300 group-hover/card:text-gray-400 transition-colors"></i>
                        <h3 class="font-bold text-gray-700 truncate">${categoryName}</h3>
                        <span class="text-xs font-medium text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">${projects.length}</span>
                    </div>
                    <button onclick="window.toggleCategory(this)" class="text-gray-400 hover:text-primary transition-colors p-1 rounded-md hover:bg-white outline-none">
                        <i data-lucide="chevron-down" class="w-5 h-5 transition-transform duration-300"></i>
                    </button>
                </div>
                <div class="category-body transition-[max-height] duration-300 ease-in-out overflow-hidden" style="max-height: none;">
                    <div class="project-list p-3 space-y-3 min-h-[60px]" data-category="${categoryName}">
                        ${projects.map(p => this.createProjectCardHTML(p)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    createProjectCardHTML(project) {
        const actionsHTML = ProjectCardActions.render(project.id);
        const isSelected = this.selectedIds.has(project.id);
        
        return `
            <div class="project-card-item bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer active:cursor-grabbing group relative ${isSelected ? 'selected' : ''}" 
                 data-id="${project.id}"
                 onclick="window.gridCardClickHandler(event, '${project.id}', '${project.linkUrl}')">
                
                ${actionsHTML}
                
                <div class="flex flex-col h-full">
                    <div class="flex justify-between items-start mb-2 pr-6">
                        <h4 class="font-bold text-gray-800 text-sm leading-tight">${project.title}</h4>
                    </div>
                    
                    <p class="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">${project.description}</p>
                    
                    <div class="mt-auto flex justify-between items-center">
                        <div class="flex gap-1 flex-wrap">
                            ${project.tags && project.tags.length > 0 ? 
                                project.tags.map(tag => `<span class="text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">${tag}</span>`).join('')
                                : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Selection Logic ---
    updateSelectionVisuals() {
        const cards = this.container.querySelectorAll('.project-card-item');
        cards.forEach(card => {
            const id = card.dataset.id;
            if (this.selectedIds.has(id)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    clearSelection() {
        this.selectedIds.clear();
        this.updateSelectionVisuals();
        this.notifySelection();
    }

    notifySelection() {
        if (this.onSelectionChange) {
            this.onSelectionChange(Array.from(this.selectedIds));
        }
    }

    // --- Render Helpers ---
    renderLoading() {
        this.container.innerHTML = `
            <div class="flex justify-center py-20">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        `;
    }

    renderEmptyState() {
        this.container.innerHTML = `
             <div class="mb-8 pl-2">
                <h1 class="text-3xl font-bold text-gray-800 tracking-tight">Index<span style="color: #5fcfc3">.</span></h1>
            </div>
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <div class="bg-white p-4 rounded-full shadow-sm mb-4">
                    <i data-lucide="folder-open" class="w-8 h-8 text-gray-300"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-700">No projects found</h3>
                <p class="text-gray-400 text-sm mt-1">Adjust filters or add a new project.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

    initDragAndDrop() {
        if (!window.Sortable) return;

        // Initialize Sortable for the 3 Column Containers
        const colEls = document.querySelectorAll('.category-column');
        colEls.forEach(col => {
            this.sortables.push(new Sortable(col, {
                group: 'categories-columns', // Shared group allows moving between cols
                animation: 200,
                handle: '.category-header',
                ghostClass: 'sortable-ghost-category',
                dragClass: 'sortable-drag-category',
                easing: "cubic-bezier(1, 0, 0, 1)",
                onEnd: (evt) => {
                    // Gather new structure across all columns
                    const newColumnsStructure = [];
                    document.querySelectorAll('.category-column').forEach(c => {
                        const cats = [];
                        c.querySelectorAll('.category-card').forEach(card => {
                            cats.push(card.getAttribute('data-category'));
                        });
                        newColumnsStructure.push(cats);
                    });
                    
                    if (this.onCategoryReorder) {
                        this.onCategoryReorder(newColumnsStructure);
                    }
                }
            }));
        });

        // Project Items DND
        const projectLists = document.querySelectorAll('.project-list');
        projectLists.forEach(list => {
            this.sortables.push(new Sortable(list, {
                group: 'shared-projects', 
                animation: 150,
                ghostClass: 'sortable-ghost-project',
                dragClass: 'sortable-drag-project',
                delay: 0,
                fallbackOnBody: true,
                swapThreshold: 0.65,
                onEnd: (evt) => {
                    const targetList = evt.to;
                    const categoryName = targetList.getAttribute('data-category');
                    const projectIds = [];
                    targetList.querySelectorAll('.project-card-item').forEach(el => {
                        projectIds.push(el.getAttribute('data-id'));
                    });
                    if (this.onProjectReorder) {
                        this.onProjectReorder(categoryName, projectIds);
                    }
                }
            }));
        });
    }

    destroySortables() {
        this.sortables.forEach(s => s.destroy());
        this.sortables = [];
    }
}
