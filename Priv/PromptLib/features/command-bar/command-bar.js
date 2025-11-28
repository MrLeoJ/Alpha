

import { renderIcons, toggleTheme, getCurrentTheme } from '../../js/utils.js';
import { FilteringSystem } from '../filtering-system/filtering.js';
import { renderSettingsMenu } from '../main-settings/main-settings.js';

/**
 * Renders the command bar into the specified container.
 * @param {HTMLElement} container - The DOM element to append the command bar to.
 * @param {Object} callbacks - Object containing callback functions.
 */
export const renderCommandBar = (container, { onSearch, onFilter, onCreate, initialTags = [] }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'command-wrapper';
    
    wrapper.innerHTML = `
        <div class="command-bar">
            <button class="cb-btn cb-search-trigger" id="searchTriggerBtn" title="Search (Cmd+K)">
                <i data-feather="search" width="18" height="18"></i>
            </button>
            <input type="text" class="cb-search-input" placeholder="Search prompts..." autocomplete="off">
            
            <div class="cb-divider"></div>

            <button class="cb-btn" id="lockAppBtn" title="Privacy Lock">
                <i data-feather="lock" width="18" height="18"></i>
            </button>

            <button class="cb-btn" id="filterToggleBtn" title="Advanced Filters">
                <i data-feather="sliders" width="18" height="18"></i>
                <span class="filter-badge" id="filterBadge">0</span>
            </button>
            
            <button class="cb-btn" id="settingsToggleBtn" title="Settings">
                <i data-feather="settings" width="18" height="18"></i>
            </button>

            <button class="cb-add-btn" title="Create New Prompt">
                <i data-feather="plus" width="24" height="24"></i>
            </button>
        </div>
        <!-- Settings Menu Mount Point will be appended to command-bar inside wrapper -->
    `;

    container.appendChild(wrapper);

    const commandBar = wrapper.querySelector('.command-bar');

    // --- Initialize Filtering System ---
    const filteringSystem = new FilteringSystem({
        onFilterChange: (filterState) => {
            updateBadge(filterState);
            if (onFilter) onFilter(filterState);
        }
    });
    filteringSystem.render(wrapper);
    filteringSystem.setAvailableTags(initialTags);

    // --- Initialize Settings Menu ---
    // We render it but it starts hidden
    const settingsMenu = renderSettingsMenu(commandBar);

    // --- Elements ---
    const searchInput = wrapper.querySelector('.cb-search-input');
    const searchTrigger = wrapper.querySelector('#searchTriggerBtn');
    const addBtn = wrapper.querySelector('.cb-add-btn');
    const filterBtn = wrapper.querySelector('#filterToggleBtn');
    const settingsBtn = wrapper.querySelector('#settingsToggleBtn');
    const lockBtn = wrapper.querySelector('#lockAppBtn');
    const badge = wrapper.querySelector('#filterBadge');

    // --- Search Expand/Collapse Logic ---
    const expandSearch = () => {
        commandBar.classList.add('search-expanded');
        searchTrigger.classList.add('active');
    };

    const collapseSearch = () => {
        commandBar.classList.remove('search-expanded');
        searchTrigger.classList.remove('active');
        searchInput.value = '';
        searchInput.blur();
        if (onSearch) onSearch(''); // Clear results
    };

    // Toggle Search on Icon Click
    searchTrigger.addEventListener('click', () => {
        // If already expanded and focused, maybe toggle off? 
        // Standard UX: click magnifying glass focuses input.
        searchInput.focus();
    });

    // Expand on Focus
    searchInput.addEventListener('focus', () => {
        expandSearch();
    });

    // Collapse on Blur (Only if empty)
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value.trim()) {
            commandBar.classList.remove('search-expanded');
            searchTrigger.classList.remove('active');
        }
    });

    // Search Input Logic
    searchInput.addEventListener('input', (e) => {
        if (onSearch) onSearch(e.target.value);
    });

    // Escape Key Logic for Search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            collapseSearch();
        }
    });

    // --- Other Event Listeners ---
    
    // Create
    addBtn.addEventListener('click', () => {
        if (onCreate) onCreate();
    });

    // Lock App (New Feature)
    lockBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-lock-trigger'));
    });

    // Filter Toggle
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close settings if open
        if (settingsMenu.classList.contains('open')) {
            settingsMenu.classList.remove('open');
            settingsBtn.classList.remove('active');
        }

        const isOpen = filteringSystem.togglePanel();
        filterBtn.classList.toggle('active', isOpen);
    });
    
    // Settings Toggle
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close filters if open
        if (filteringSystem.isOpen()) {
            filteringSystem.closePanel();
            filterBtn.classList.remove('active');
        }

        const isOpen = settingsMenu.classList.toggle('open');
        settingsBtn.classList.toggle('active', isOpen);
    });

    // --- Auto-Close Logic (Self-Cleaning) ---
    const clickOutsideHandler = (e) => {
        if (!document.body.contains(wrapper)) {
            document.removeEventListener('click', clickOutsideHandler);
            return;
        }

        // Close Filters
        // The wrapper might span the full width, so we need to check if the click is inside the actual content panel
        const filterPanelWrapper = filteringSystem.ui?.wrapper || document.getElementById('filterPanelWrapper');
        
        if (filteringSystem.isOpen()) {
            const filterPanelContent = filterPanelWrapper?.querySelector('.filter-panel');
            const target = e.target;
            
            // Check if click is inside the actual visual panel
            const clickedInsideContent = filterPanelContent && filterPanelContent.contains(target);
            const clickedToggleButton = filterBtn.contains(target);
            
            // Close if clicked outside the content panel AND not on the toggle button
            if (!clickedInsideContent && !clickedToggleButton) {
                filteringSystem.closePanel();
                filterBtn.classList.remove('active');
            }
        }

        // Close Settings if open AND click is outside settings menu AND NOT on toggle button
        if (settingsMenu.classList.contains('open')) {
            const clickedInsideSettings = settingsMenu.contains(e.target);
            const clickedSettingsToggle = settingsBtn.contains(e.target);
            
            if (!clickedInsideSettings && !clickedSettingsToggle) {
                settingsMenu.classList.remove('open');
                settingsBtn.classList.remove('active');
            }
        }
    };

    const keydownHandler = (e) => {
        if (!document.body.contains(wrapper)) {
            document.removeEventListener('keydown', keydownHandler);
            return;
        }

        if (e.key === 'Escape') {
            if (filteringSystem.isOpen()) {
                filteringSystem.closePanel();
                filterBtn.classList.remove('active');
            }
            if (settingsMenu.classList.contains('open')) {
                settingsMenu.classList.remove('open');
                settingsBtn.classList.remove('active');
            }
        }
    };

    setTimeout(() => {
        document.addEventListener('click', clickOutsideHandler);
        document.addEventListener('keydown', keydownHandler);
    }, 0);


    // Helper to update badge count
    function updateBadge(state) {
        let count = 0;
        count += state.categories.length;
        count += state.tags.length;
        if (state.sort !== 'custom') count++; 

        badge.textContent = count;
        if (count > 0) {
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }

    renderIcons();
};