
export class Store {
    constructor() {
        this.state = {
            projects: [],
            tags: [],
            filter: 'all',
            search: ''
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        // Immediately trigger with current state
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Actions
    setProjects(projects) {
        this.state.projects = projects;
        this.notify();
    }

    setTags(tags) {
        this.state.tags = tags;
        this.notify();
    }

    setFilter(filter) {
        this.state.filter = filter;
        this.notify();
    }

    setSearch(term) {
        this.state.search = term;
        this.notify();
    }

    getFilteredProjects() {
        return this.state.projects.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(this.state.search.toLowerCase()) || 
                                  (p.description && p.description.toLowerCase().includes(this.state.search.toLowerCase()));
            
            const matchesTag = this.state.filter === 'all' || (p.tags && p.tags.includes(this.state.filter));
            
            return matchesSearch && matchesTag;
        });
    }
}
