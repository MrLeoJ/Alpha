

/**
 * Initializes drag and drop functionality on a container.
 * Uses SortableJS library.
 * 
 * @param {HTMLElement} container - The grid element containing items to drag.
 * @param {Function} onReorder - Callback function when order changes. Receives (itemIds, oldIndex, newIndex).
 * @param {Object} options - Optional overrides for SortableJS config.
 */
export const initDragAndDrop = (container, onReorder, options = {}) => {
    if (!window.Sortable) {
        console.warn('SortableJS is not loaded.');
        return;
    }

    if (!container) return;

    new Sortable(container, {
        animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
        ghostClass: 'sortable-ghost', // Class name for the drop placeholder
        dragClass: 'sortable-drag',  // Class name for the dragging item
        delay: 0, 
        delayOnTouchOnly: true, // Only delay on touch devices to prevent scrolling interference
        touchStartThreshold: 5, // px, how many pixels the point should move before cancelling a tap event
        
        // Ensure we handle the handle correctly if we wanted a specific drag handle, 
        // but here we allow dragging the whole card.
        
        onEnd: function (evt) {
            // Drag ended
            if (onReorder) {
                // Get the new order of IDs
                const itemIds = Array.from(container.children)
                    .filter(child => child.hasAttribute('data-id')) // Only count items with IDs
                    .map(child => child.dataset.id);
                
                onReorder(itemIds, evt.oldIndex, evt.newIndex);
            }
        },
        ...options // Merge custom options
    });
};
