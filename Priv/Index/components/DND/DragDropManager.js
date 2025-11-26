export class DragDropManager {
    constructor(container, callbacks) {
        this.container = container;
        this.onReorder = callbacks.onReorder;
        this.sortable = null;
        this.init();
    }

    init() {
        if (!this.container || !window.Sortable) return;

        this.sortable = new window.Sortable(this.container, {
            animation: 300, // Smooth animation duration in ms
            ghostClass: 'sortable-ghost', // Class for the drop placeholder
            dragClass: 'sortable-drag',   // Class for the dragging item
            easing: "cubic-bezier(1, 0, 0, 1)", 
            handle: ".project-card", // The whole card is the handle
            delay: 100, // Slight delay to prevent accidental drag on mobile scrolling
            delayOnTouchOnly: true,
            
            onStart: () => {
                document.body.style.cursor = 'grabbing';
            },
            
            onEnd: (evt) => {
                document.body.style.cursor = 'auto';
                if (this.onReorder && evt.oldIndex !== evt.newIndex) {
                    this.onReorder(evt.oldIndex, evt.newIndex);
                }
            }
        });
    }

    destroy() {
        if (this.sortable) {
            this.sortable.destroy();
            this.sortable = null;
        }
    }
}