
export class AutoFill {
    constructor(inputId, options = {}) {
        this.input = document.getElementById(inputId);
        if (!this.input) {
            console.error(`AutoFill: Input element with ID '${inputId}' not found.`);
            return;
        }

        // Configuration
        this.source = options.source || [];
        this.isMultiple = options.multiple || false; // For comma-separated tags
        this.onSelect = options.onSelect || null;
        
        // State
        this.suggestions = [];
        this.selectedIndex = -1;
        this.currentTerm = '';

        // DOM Elements
        this.dropdown = null;
        this.wrapper = null;

        this.init();
    }

    init() {
        // Create Wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'autofill-wrapper';
        this.input.parentNode.insertBefore(this.wrapper, this.input);
        this.wrapper.appendChild(this.input);

        // Create Dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autofill-dropdown';
        this.wrapper.appendChild(this.dropdown);

        // Events
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Reposition on focus if value exists (optional, maybe annoying if instant)
        // this.input.addEventListener('focus', (e) => this.handleInput(e));
    }

    setSource(newSource) {
        this.source = newSource || [];
    }

    handleInput(e) {
        const val = this.input.value;
        const cursorPosition = this.input.selectionStart;

        if (this.isMultiple) {
            // Find the term being edited based on cursor position
            const textBeforeCursor = val.slice(0, cursorPosition);
            const lastCommaIndex = textBeforeCursor.lastIndexOf(',');
            this.currentTerm = textBeforeCursor.slice(lastCommaIndex + 1).trim();
        } else {
            this.currentTerm = val.trim();
        }

        if (this.currentTerm.length < 1) {
            this.closeDropdown();
            return;
        }

        // Filter suggestions
        const lowerTerm = this.currentTerm.toLowerCase();
        this.suggestions = this.source.filter(item => 
            item.toLowerCase().includes(lowerTerm) && 
            item.toLowerCase() !== lowerTerm // Don't suggest exact match if already typed
        );
        
        // Sort: Starts with term first, then alphabetical
        this.suggestions.sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(lowerTerm);
            const bStarts = b.toLowerCase().startsWith(lowerTerm);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
        });

        // Limit results
        this.suggestions = this.suggestions.slice(0, 5);

        if (this.suggestions.length > 0) {
            this.renderDropdown();
            this.openDropdown();
        } else {
            this.closeDropdown();
        }
    }

    handleKeydown(e) {
        if (!this.dropdown.classList.contains('active')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
            this.updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
            this.updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submit
            if (this.selectedIndex >= 0) {
                this.selectItem(this.suggestions[this.selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            this.closeDropdown();
        } else if (e.key === 'Tab') {
            if (this.selectedIndex >= 0) {
                e.preventDefault();
                this.selectItem(this.suggestions[this.selectedIndex]);
            } else {
                this.closeDropdown();
            }
        }
    }

    renderDropdown() {
        this.dropdown.innerHTML = '';
        this.selectedIndex = -1;

        this.suggestions.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'autofill-item';
            
            // Highlight match
            const regex = new RegExp(`(${this.currentTerm})`, 'gi');
            const highlighted = item.replace(regex, '<span class="autofill-match">$1</span>');
            div.innerHTML = `<span>${highlighted}</span>`;
            
            div.addEventListener('click', () => {
                this.selectItem(item);
                // Keep input focused
                this.input.focus();
            });

            div.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });

            this.dropdown.appendChild(div);
        });
    }

    updateSelection() {
        const items = this.dropdown.querySelectorAll('.autofill-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    selectItem(value) {
        if (this.isMultiple) {
            const val = this.input.value;
            const cursorPosition = this.input.selectionStart;
            
            // Logic to replace the current partial term with the selected value
            const textBeforeCursor = val.slice(0, cursorPosition);
            const textAfterCursor = val.slice(cursorPosition);
            
            const lastCommaIndex = textBeforeCursor.lastIndexOf(',');
            
            // Reconstruct: (Prefix) + (Selected Value) + ", " + (Suffix)
            const prefix = textBeforeCursor.slice(0, lastCommaIndex + 1);
            
            // Ensure space after comma if prefix exists
            const cleanPrefix = prefix.length > 0 && !prefix.endsWith(' ') ? prefix + ' ' : prefix;
            
            this.input.value = cleanPrefix + value + ', ' + textAfterCursor;
            
            // Move cursor to end of inserted tag
            const newCursorPos = (cleanPrefix + value + ', ').length;
            this.input.setSelectionRange(newCursorPos, newCursorPos);

        } else {
            this.input.value = value;
        }

        this.closeDropdown();
        
        // Trigger regular input event so bindings can update if necessary
        this.input.dispatchEvent(new Event('input'));
        
        if (this.onSelect) this.onSelect(value);
    }

    openDropdown() {
        this.dropdown.classList.add('active');
    }

    closeDropdown() {
        this.dropdown.classList.remove('active');
        this.selectedIndex = -1;
    }
}
