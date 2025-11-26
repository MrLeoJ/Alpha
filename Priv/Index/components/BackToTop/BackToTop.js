
export class BackToTop {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isVisible = false;
        this.render();
        this.attachEvents();
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div id="back-to-top-wrapper" class="back-to-top-container">
                <button id="back-to-top-btn" class="back-to-top-btn" aria-label="Back to top">
                    <i data-lucide="arrow-up" class="w-5 h-5"></i>
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

    attachEvents() {
        const btn = document.getElementById('back-to-top-btn');
        const wrapper = document.getElementById('back-to-top-wrapper');

        if (!btn || !wrapper) return;

        btn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Throttle scroll event slightly for performance
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateVisibility(wrapper);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    updateVisibility(wrapper) {
        const scrollY = window.scrollY;
        // Show after scrolling down 300px
        const shouldBeVisible = scrollY > 300;

        if (shouldBeVisible && !this.isVisible) {
            wrapper.classList.add('visible');
            this.isVisible = true;
        } else if (!shouldBeVisible && this.isVisible) {
            wrapper.classList.remove('visible');
            this.isVisible = false;
        }
    }
}
