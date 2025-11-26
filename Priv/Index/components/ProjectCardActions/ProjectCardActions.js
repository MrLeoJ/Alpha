
export const ProjectCardActions = {
    render(projectId) {
        return `
            <div class="action-toolbar" onclick="event.stopPropagation()">
                <button onclick="window.gridEditHandler('${projectId}')" 
                        class="action-btn edit-btn" 
                        title="Edit Project"
                        aria-label="Edit">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                
                <button onclick="window.gridCloneHandler('${projectId}')" 
                        class="action-btn clone-btn" 
                        title="Duplicate Project"
                        aria-label="Duplicate">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                
                <button onclick="window.gridDeleteHandler('${projectId}')" 
                        class="action-btn delete-btn" 
                        title="Delete Project"
                        aria-label="Delete">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }
};
