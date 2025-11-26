

import { db } from './services/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    where,
    writeBatch,
    serverTimestamp,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Import Components
import { CommandIsland } from './components/CommandIsland/CommandIsland.js';
import { ProjectGrid } from './components/ProjectGrid/ProjectGrid.js';
import { AddModal } from './components/AddModal/AddModal.js';
import { TaxonomyManager } from './components/TaxonomyManager/TaxonomyManager.js';
import { Toast } from './components/Toast/Toast.js';
import { BulkActionBar } from './components/BulkEditing/BulkActionBar.js';
import { BulkEditModal } from './components/BulkEditing/BulkEditModal.js';
import { BackToTop } from './components/BackToTop/BackToTop.js';

class App {
    constructor() {
        this.state = {
            projects: [],
            tags: [],
            categories: [],
            selectedTags: [],
            selectedCategories: [],
            searchQuery: '',
            filteredProjects: [],
            selectedProjectIds: [] // For bulk editing
        };

        // Initialize Components
        this.island = new CommandIsland('island-root', {
            onSearch: (q) => this.handleSearch(q),
            onFilterChange: (filters) => this.handleFilterChange(filters),
            onAddClick: () => this.openAddModal(),
            onManageClick: () => this.openTaxonomyManager()
        });

        this.grid = new ProjectGrid('grid-root', {
            onDelete: (id) => this.handleDelete(id),
            onEdit: (id) => this.handleEdit(id),
            onClone: (id) => this.handleClone(id),
            onCategoryReorder: (newOrder) => this.handleCategoryReorder(newOrder),
            onProjectReorder: (cat, ids) => this.handleProjectReorder(cat, ids),
            onSelectionChange: (ids) => this.handleSelectionChange(ids)
        });

        this.modal = new AddModal('modal-root', {
            onSave: (data, id) => this.handleSaveProject(data, id)
        });

        this.taxonomyManager = new TaxonomyManager('taxonomy-root', {
            onRename: (mode, oldName, newName) => this.handleTaxonomyRename(mode, oldName, newName),
            onMerge: (mode, fromName, toName) => this.handleTaxonomyMerge(mode, fromName, toName),
            onDelete: (mode, name) => this.handleTaxonomyDelete(mode, name)
        });

        this.bulkBar = new BulkActionBar('bulk-bar-root', {
            onMove: () => this.openBulkMove(),
            onTag: () => this.openBulkTag(),
            onDelete: () => this.handleBulkDelete(),
            onClear: () => this.grid.clearSelection()
        });

        this.bulkModal = new BulkEditModal('bulk-modal-root', {
            onConfirm: (mode, data) => this.handleBulkConfirm(mode, data)
        });

        this.backToTop = new BackToTop('back-to-top-root');

        this.init();
    }

    async init() {
        this.grid.renderLoading();
        await Promise.all([
            this.fetchProjects(),
            this.fetchTags(),
            this.fetchCategories()
        ]);
        this.updateView();
    }

    // --- Data Fetching ---

    async fetchProjects() {
        try {
            const q = query(collection(db, "projects"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            
            this.state.projects = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.state.projects.sort((a, b) => (a.order || 0) - (b.order || 0));
            this.pushFiltersToIsland();

        } catch (error) {
            console.error("Error fetching projects:", error);
            Toast.notify("Failed to load projects", "error");
        }
    }

    async fetchTags() {
        try {
            const querySnapshot = await getDocs(collection(db, "tags"));
            this.state.tags = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.pushFiltersToIsland();
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    }

    async fetchCategories() {
        try {
            const querySnapshot = await getDocs(collection(db, "categories"));
            this.state.categories = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                // Primary Sort: Column index (if exists)
                // Secondary Sort: Order
                const colA = a.column !== undefined ? a.column : -1;
                const colB = b.column !== undefined ? b.column : -1;
                if (colA !== colB) return colA - colB;
                return (a.order || 0) - (b.order || 0);
            });

            this.pushFiltersToIsland();
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }

    pushFiltersToIsland() {
        const projectCounts = { categories: {}, tags: {} };

        // Calculate counts from the actual projects list
        this.state.projects.forEach(p => {
            if (p.category) {
                projectCounts.categories[p.category] = (projectCounts.categories[p.category] || 0) + 1;
            }
            if (p.tags && Array.isArray(p.tags)) {
                p.tags.forEach(t => {
                    projectCounts.tags[t] = (projectCounts.tags[t] || 0) + 1;
                });
            }
        });

        // Update state directly to ensure all components (Island, TaxonomyManager) use live counts
        this.state.tags = this.state.tags.map(t => ({
            ...t,
            count: projectCounts.tags[t.name] || 0
        }));

        this.state.categories = this.state.categories.map(c => ({
            ...c,
            count: projectCounts.categories[c.name] || 0
        }));

        this.island.setFilterData(this.state.tags, this.state.categories);
    }

    // --- Handlers ---

    handleSearch(query) {
        this.state.searchQuery = query;
        this.updateView();
    }

    handleFilterChange({ tags, categories }) {
        this.state.selectedTags = tags;
        this.state.selectedCategories = categories;
        this.updateView();
    }

    handleSelectionChange(ids) {
        this.state.selectedProjectIds = ids;
        this.bulkBar.update(ids);
    }

    // --- Bulk Action Handlers ---

    openBulkMove() {
        this.bulkModal.open('category', this.state.categories);
    }

    openBulkTag() {
        this.bulkModal.open('tags');
    }

    handleBulkDelete() {
        const count = this.state.selectedProjectIds.length;
        Toast.confirm(`Delete ${count} selected project${count > 1 ? 's' : ''}?`, async () => {
            try {
                const batch = writeBatch(db);
                this.state.selectedProjectIds.forEach(id => {
                    batch.delete(doc(db, "projects", id));
                });
                await batch.commit();
                
                Toast.notify(`Deleted ${count} projects`, "success");
                this.grid.clearSelection();
                
                // Refresh data to update counts correctly
                await Promise.all([
                    this.fetchProjects(), 
                    this.fetchTags(), 
                    this.fetchCategories()
                ]);
                this.updateView();
            } catch (e) {
                console.error("Bulk delete failed", e);
                Toast.notify("Bulk delete failed", "error");
            }
        });
    }

    async handleBulkConfirm(mode, data) {
        if (!data) return;
        
        try {
            const batch = writeBatch(db);
            const ids = this.state.selectedProjectIds;
            
            if (mode === 'category') {
                const newCat = data;
                ids.forEach(id => {
                    const ref = doc(db, "projects", id);
                    batch.update(ref, { category: newCat });
                });
                
                // Ensure category exists
                await this.updateCategoryCollection(newCat);
                
                Toast.notify(`Moved ${ids.length} items to "${newCat}"`, "success");
            } 
            else if (mode === 'tags') {
                const tagsRaw = data.split(',').map(t => t.trim()).filter(Boolean);
                if (tagsRaw.length === 0) return;
                
                ids.forEach(id => {
                    const ref = doc(db, "projects", id);
                    batch.update(ref, { tags: arrayUnion(...tagsRaw) });
                });
                
                // Ensure tags exist
                await this.updateTagsCollection(tagsRaw);
                
                Toast.notify(`Added ${tagsRaw.length} tags to ${ids.length} items`, "success");
            }

            await batch.commit();
            this.grid.clearSelection();
            
            // Recalc to keep counts strictly correct
            await Promise.all([
                this.recalculateCounts('tags'), 
                this.recalculateCounts('categories'),
                this.fetchProjects()
            ]);
            await Promise.all([this.fetchTags(), this.fetchCategories()]);
            this.updateView();

        } catch (e) {
            console.error("Bulk update failed", e);
            Toast.notify("Bulk action failed", "error");
        }
    }

    // --- Reorder Handlers ---

    async handleCategoryReorder(columnsStructure) {
        // columnsStructure is [[catName, catName], [catName], ...]
        try {
            const batch = writeBatch(db);
            
            columnsStructure.forEach((colItems, colIndex) => {
                colItems.forEach((name, rowIndex) => {
                    const catObj = this.state.categories.find(c => c.name === name);
                    if (catObj) {
                        const docRef = doc(db, "categories", catObj.id);
                        batch.update(docRef, { 
                            order: rowIndex,
                            column: colIndex 
                        });
                        // Optimistic update
                        catObj.order = rowIndex;
                        catObj.column = colIndex;
                    }
                });
            });

            await batch.commit();
        } catch (error) {
            console.error("Error reordering categories:", error);
            Toast.notify("Failed to save layout", "error");
        }
    }

    async handleProjectReorder(categoryName, orderedProjectIds) {
        try {
            const batch = writeBatch(db);
            let movedCount = 0;

            orderedProjectIds.forEach((pid, index) => {
                const project = this.state.projects.find(p => p.id === pid);
                if (project) {
                    const oldCategory = project.category;
                    const docRef = doc(db, "projects", pid);
                    
                    const updates = { order: index };
                    
                    if (oldCategory !== categoryName) {
                        updates.category = categoryName;
                        project.category = categoryName;
                        movedCount++;
                    }
                    project.order = index;
                    
                    batch.update(docRef, updates);
                }
            });

            await batch.commit();

            if (movedCount > 0) {
                // Refresh counts
                this.pushFiltersToIsland();
                Toast.notify(`Updated layout`, 'success');
            }

        } catch (error) {
            console.error("Error reordering projects:", error);
            Toast.notify("Failed to save project layout", "error");
            this.updateView();
        }
    }

    // --- CRUD Handlers ---

    openAddModal() {
        this.modal.open(null, {
            tags: this.state.tags.map(t => t.name),
            categories: this.state.categories.map(c => c.name)
        });
    }

    handleEdit(projectId) {
        const project = this.state.projects.find(p => p.id === projectId);
        if (project) {
            this.modal.open(project, {
                tags: this.state.tags.map(t => t.name),
                categories: this.state.categories.map(c => c.name)
            });
        }
    }

    async handleClone(projectId) {
        const project = this.state.projects.find(p => p.id === projectId);
        if (!project) return;

        try {
            // eslint-disable-next-line no-unused-vars
            const { id, timestamp, order, ...dataToClone } = project;
            
            const clonedData = {
                ...dataToClone,
                title: `${dataToClone.title} (Copy)`,
                timestamp: serverTimestamp(),
                order: 9999
            };

            const docRef = await addDoc(collection(db, "projects"), clonedData);
            
            if (clonedData.tags && clonedData.tags.length > 0) {
                 await this.updateTagsCollection(clonedData.tags);
            }
            if (clonedData.category) {
                 await this.updateCategoryCollection(clonedData.category);
            }

            Toast.notify("Project duplicated!", "success", {
                label: "Undo",
                onClick: async () => {
                    try {
                        await deleteDoc(docRef);
                        Toast.notify("Duplication reverted", "info");
                        await Promise.all([this.fetchProjects(), this.fetchTags(), this.fetchCategories()]);
                        this.updateView();
                    } catch (err) {
                        console.error("Undo failed:", err);
                        Toast.notify("Failed to undo", "error");
                    }
                }
            });

            await Promise.all([
                this.fetchProjects(), 
                this.fetchTags(),
                this.fetchCategories()
            ]);
            this.updateView();

        } catch (error) {
            console.error("Error duplicating project:", error);
            Toast.notify("Error duplicating project", "error");
        }
    }

    async handleSaveProject(projectData, editingId = null) {
        try {
            const dataToSave = { ...projectData };

            if (editingId) {
                const projectRef = doc(db, "projects", editingId);
                await updateDoc(projectRef, dataToSave);
                Toast.notify("Project updated successfully!", "success");
            } else {
                dataToSave.timestamp = serverTimestamp();
                dataToSave.order = 0;
                await addDoc(collection(db, "projects"), dataToSave);
                Toast.notify("Project added successfully!", "success");
            }

            if (projectData.tags && projectData.tags.length > 0) {
                await this.updateTagsCollection(projectData.tags);
            }
            
            if (projectData.category) {
                await this.updateCategoryCollection(projectData.category);
            }

            this.modal.close();
            
            await Promise.all([
                this.fetchProjects(), 
                this.fetchTags(),
                this.fetchCategories()
            ]);
            this.updateView();

        } catch (error) {
            console.error("Error saving project:", error);
            Toast.notify("Error saving project", "error");
        }
    }

    handleDelete(projectId) {
        const projectToDelete = this.state.projects.find(p => p.id === projectId);
        if (!projectToDelete) return;

        Toast.confirm("Delete this project permanently?", async () => {
            try {
                this.state.projects = this.state.projects.filter(p => p.id !== projectId);
                this.updateView();

                await deleteDoc(doc(db, "projects", projectId));
                Toast.notify("Project deleted successfully", "success");
                
                await Promise.all([
                    this.fetchProjects(), // Refetch to ensure sync
                    this.fetchTags(),
                    this.fetchCategories()
                ]);
            } catch (error) {
                console.error("Error deleting:", error);
                Toast.notify("Could not delete project", "error");
                await this.fetchProjects();
                this.updateView();
            }
        });
    }

    // --- Taxonomy Handlers ---

    openTaxonomyManager() {
        this.taxonomyManager.open(this.state.tags, this.state.categories);
    }

    async handleTaxonomyRename(mode, oldName, newName) {
        Toast.notify(`Renaming ${mode}...`, 'info');
        try {
            const batch = writeBatch(db);
            const colName = mode;
            const oldId = oldName.toLowerCase().replace(/\s+/g, '-');
            const newId = newName.toLowerCase().replace(/\s+/g, '-');

            const q = query(collection(db, "projects"), where(mode === 'tags' ? 'tags' : 'category', mode === 'tags' ? 'array-contains' : '==', oldName));
            const snapshot = await getDocs(q);
            const count = snapshot.size;

            snapshot.docs.forEach(docSnap => {
                const pRef = doc(db, "projects", docSnap.id);
                const pData = docSnap.data();
                
                if (mode === 'tags') {
                    const newTags = pData.tags.filter(t => t !== oldName);
                    newTags.push(newName);
                    batch.update(pRef, { tags: newTags });
                } else {
                    batch.update(pRef, { category: newName });
                }
            });

            const oldDocRef = doc(db, colName, oldId);
            const newDocRef = doc(db, colName, newId);
            
            let preservedOrder = null;
            let preservedColumn = null;
            
            if (mode === 'categories') {
                const catObj = this.state.categories.find(c => c.name === oldName);
                if (catObj) {
                    preservedOrder = catObj.order;
                    preservedColumn = catObj.column;
                }
            }

            batch.delete(oldDocRef);
            
            const newMeta = { name: newName, count: count };
            if (preservedOrder !== null) newMeta.order = preservedOrder;
            if (preservedColumn !== null) newMeta.column = preservedColumn;

            batch.set(newDocRef, newMeta);

            await batch.commit();
            Toast.notify("Rename successful", "success");
            
            await Promise.all([this.fetchProjects(), this.fetchTags(), this.fetchCategories()]);
            this.updateView();
            this.taxonomyManager.open(this.state.tags, this.state.categories);
            this.taxonomyManager.switchTab(mode);

        } catch (e) {
            console.error("Rename failed", e);
            Toast.notify("Rename failed", "error");
        }
    }

    async handleTaxonomyMerge(mode, fromName, toName) {
        Toast.notify(`Merging ${fromName} into ${toName}...`, 'info');
        try {
            const batch = writeBatch(db);
            const colName = mode;
            const fromId = fromName.toLowerCase().replace(/\s+/g, '-');
            const toId = toName.toLowerCase().replace(/\s+/g, '-');

            const q = query(collection(db, "projects"), where(mode === 'tags' ? 'tags' : 'category', mode === 'tags' ? 'array-contains' : '==', fromName));
            const snapshot = await getDocs(q);
            const movedCount = snapshot.size;

            snapshot.docs.forEach(docSnap => {
                const pRef = doc(db, "projects", docSnap.id);
                const pData = docSnap.data();

                if (mode === 'tags') {
                    let newTags = pData.tags.filter(t => t !== fromName);
                    if (!newTags.includes(toName)) {
                        newTags.push(toName);
                    }
                    batch.update(pRef, { tags: newTags });
                } else {
                    batch.update(pRef, { category: toName });
                }
            });

            batch.delete(doc(db, colName, fromId));
            const toDocRef = doc(db, colName, toId);
            batch.update(toDocRef, { count: increment(movedCount) }); 
            
            await batch.commit();
            
            await this.recalculateCounts(mode);

            Toast.notify("Merge successful", "success");
            await Promise.all([this.fetchProjects(), this.fetchTags(), this.fetchCategories()]);
            this.updateView();
            this.taxonomyManager.open(this.state.tags, this.state.categories);
            this.taxonomyManager.switchTab(mode);

        } catch (e) {
            console.error("Merge failed", e);
            Toast.notify("Merge failed", "error");
        }
    }

    async handleTaxonomyDelete(mode, name) {
        try {
            const batch = writeBatch(db);
            const colName = mode;
            const id = name.toLowerCase().replace(/\s+/g, '-');

            batch.delete(doc(db, colName, id));

            const q = query(collection(db, "projects"), where(mode === 'tags' ? 'tags' : 'category', mode === 'tags' ? 'array-contains' : '==', name));
            const snapshot = await getDocs(q);
            
            snapshot.docs.forEach(docSnap => {
                const pRef = doc(db, "projects", docSnap.id);
                if (mode === 'tags') {
                    const pData = docSnap.data();
                    const newTags = pData.tags.filter(t => t !== name);
                    batch.update(pRef, { tags: newTags });
                } else {
                    batch.update(pRef, { category: "" });
                }
            });

            await batch.commit();
            Toast.notify("Deleted successfully", "success");

            await Promise.all([this.fetchProjects(), this.fetchTags(), this.fetchCategories()]);
            this.updateView();
            this.taxonomyManager.open(this.state.tags, this.state.categories);
            this.taxonomyManager.switchTab(mode);

        } catch (e) {
            console.error("Delete failed", e);
            Toast.notify("Delete failed", "error");
        }
    }

    // --- Helpers ---

    async recalculateCounts(mode) {
        const q = query(collection(db, "projects"));
        const snapshot = await getDocs(q);
        const projects = snapshot.docs.map(d => d.data());
        
        const counts = {};

        projects.forEach(p => {
            if (mode === 'tags' && p.tags) {
                p.tags.forEach(t => {
                    counts[t] = (counts[t] || 0) + 1;
                });
            } else if (mode === 'categories' && p.category) {
                const c = p.category;
                counts[c] = (counts[c] || 0) + 1;
            }
        });

        const metaCol = collection(db, mode);
        const metaSnaps = await getDocs(metaCol);
        
        const batch = writeBatch(db);
        
        metaSnaps.docs.forEach(d => {
            const name = d.data().name;
            const realCount = counts[name] || 0;
            if (d.data().count !== realCount) {
                batch.update(d.ref, { count: realCount });
            }
        });

        await batch.commit();
    }

    async updateTagsCollection(tagsArray) {
        const batchPromises = tagsArray.map(async (tagName) => {
            const tagId = tagName.toLowerCase().replace(/\s+/g, '-');
            const tagRef = doc(db, "tags", tagId);
            const tagSnap = await getDoc(tagRef);

            if (tagSnap.exists()) {
                await updateDoc(tagRef, { count: increment(1) });
            } else {
                await setDoc(tagRef, { name: tagName, count: 1 });
            }
        });
        await Promise.all(batchPromises);
    }

    async updateCategoryCollection(categoryName) {
        const catId = categoryName.toLowerCase().replace(/\s+/g, '-');
        const catRef = doc(db, "categories", catId);
        const catSnap = await getDoc(catRef);

        if (catSnap.exists()) {
            await updateDoc(catRef, { count: increment(1) });
        } else {
            const countSnapshot = await getDocs(collection(db, "categories"));
            const newOrder = countSnapshot.size;
            // Default new categories to column 0 or round robin? 
            // Simplified: let user sort them later.
            await setDoc(catRef, { name: categoryName, count: 1, order: newOrder, column: 0 });
        }
    }

    updateView() {
        const { projects, selectedTags, selectedCategories, searchQuery } = this.state;

        const filteredProjects = projects.filter(project => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = 
                project.title.toLowerCase().includes(searchLower) || 
                project.description.toLowerCase().includes(searchLower) ||
                (project.category && project.category.toLowerCase().includes(searchLower)) ||
                (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchLower)));

            const matchesCategory = selectedCategories.length === 0 || 
                (project.category && selectedCategories.includes(project.category));

            const matchesTags = selectedTags.length === 0 || 
                (project.tags && project.tags.some(t => selectedTags.includes(t)));

            return matchesSearch && matchesCategory && matchesTags;
        });

        this.state.filteredProjects = filteredProjects;
        this.grid.render(filteredProjects, this.state.categories);
    }
}

new App();
