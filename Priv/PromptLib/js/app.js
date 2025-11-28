
import { renderLibrary } from '../features/library/library.js';
import { renderIcons, initTheme } from './utils.js';
import { initKeyboardShortcuts } from '../features/keyboard-shortcuts/keyboard-shortcuts.js';
import { initBackToTop } from '../features/back-to-top/back-to-top.js';
import { initSettings } from '../features/main-settings/main-settings.js';
import { initScreenLock } from '../features/screen-lock/screen-lock.js';

class Router {
    constructor() {
        this.appElement = document.getElementById('app');
    }

    init() {
        // Initialize Theme
        initTheme();
        // Initialize Settings (Compact Mode)
        initSettings();
        // Initialize Screen Lock (Check for locked state)
        initScreenLock();

        this.renderLayout();
        // Initialize global shortcuts
        initKeyboardShortcuts();
        // Initialize Back to Top
        initBackToTop();
        
        // Default and only view
        renderLibrary(this.appElement);
    }

    renderLayout() {
        renderIcons();
    }

    // Navigation method kept for compatibility if needed, but currently only reloads library
    navigate(view) {
        if (view === 'library') {
            renderLibrary(this.appElement);
        }
        // Editor is now handled via Modal overlay in library.js
    }
}

export const router = new Router();

document.addEventListener('DOMContentLoaded', () => {
    router.init();
});
