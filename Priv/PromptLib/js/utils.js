

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    const icon = type === 'success' ? 'check-circle' : 'info';
    
    toast.innerHTML = `
        <i data-feather="${icon}" width="18" height="18"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    if (window.feather) window.feather.replace();

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

export const showConfirmToast = (message, onConfirm, onCancel = null) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-confirm`;
    
    // Structure with explicit actions
    toast.innerHTML = `
        <div class="toast-content">
            <i data-feather="help-circle" width="18" height="18"></i>
            <span>${message}</span>
        </div>
        <div class="toast-actions">
            <button class="toast-btn cancel">Cancel</button>
            <button class="toast-btn confirm">Confirm</button>
        </div>
    `;
    
    container.appendChild(toast);
    
    if (window.feather) window.feather.replace();

    // Helper to remove toast
    const removeToast = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    };

    const confirmBtn = toast.querySelector('.confirm');
    const cancelBtn = toast.querySelector('.cancel');

    confirmBtn.addEventListener('click', () => {
        removeToast();
        if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
        removeToast();
        if (onCancel) onCancel();
    });
};

export const showInputToast = (message, initialValue, onConfirm, onCancel = null) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-input`;
    
    toast.innerHTML = `
        <div class="toast-content-col">
            <div class="toast-label">
                <i data-feather="edit-2" width="16" height="16"></i>
                <span>${message}</span>
            </div>
            <input type="text" class="toast-input-field" value="${initialValue.replace(/"/g, '&quot;')}" />
        </div>
        <div class="toast-actions">
            <button class="toast-btn cancel">Cancel</button>
            <button class="toast-btn confirm">Save</button>
        </div>
    `;
    
    container.appendChild(toast);
    
    if (window.feather) window.feather.replace();

    const input = toast.querySelector('input');
    const confirmBtn = toast.querySelector('.confirm');
    const cancelBtn = toast.querySelector('.cancel');

    // Focus input
    setTimeout(() => {
        input.focus();
        input.select();
    }, 50);

    const removeToast = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    };

    const handleConfirm = () => {
        const val = input.value.trim();
        if (val) {
            removeToast();
            if (onConfirm) onConfirm(val);
        } else {
            // Visual cue for empty input
            input.style.boxShadow = '0 0 0 2px #fe6a5f';
            setTimeout(() => input.style.boxShadow = '', 300);
        }
    };

    confirmBtn.addEventListener('click', handleConfirm);

    cancelBtn.addEventListener('click', () => {
        removeToast();
        if (onCancel) onCancel();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') {
            removeToast();
            if (onCancel) onCancel();
        }
    });
};

export const renderIcons = () => {
    if (window.feather) {
        window.feather.replace();
    }
};

/**
 * Initialize theme based on local storage or system preference
 */
export const initTheme = () => {
    const savedTheme = localStorage.getItem('app-theme');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        // Default to light mode for new users, ignoring system preference
        document.documentElement.setAttribute('data-theme', 'light');
    }
};

/**
 * Toggle between light and dark mode
 * Returns the new current theme string
 */
export const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    return newTheme;
};

export const getCurrentTheme = () => {
    return document.documentElement.getAttribute('data-theme') || 'light';
};
