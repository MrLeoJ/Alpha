import { renderIcons } from '../../js/utils.js';

/**
 * Initializes the Back to Top button functionality
 */
export const initBackToTop = () => {
    // 1. Create button element dynamically
    const btn = document.createElement('button');
    btn.className = 'back-to-top-btn';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = `<i data-feather="arrow-up" width="24" height="24"></i>`;
    
    document.body.appendChild(btn);
    renderIcons();

    // 2. Scroll Logic (Throttled via requestAnimationFrame)
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    };

    let isTicking = false;
    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                toggleVisibility();
                isTicking = false;
            });
            isTicking = true;
        }
    });

    // 3. Click Logic (Smooth Scroll)
    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
};