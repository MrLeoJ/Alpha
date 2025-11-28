
/**
 * Syntax Highlighting Logic
 * Parses plain text and wraps Markdown syntax in spans.
 */

// Define patterns using RegExp constructor to avoid parser issues with literals
const PATTERNS = [
    // Comments: // ... (Start of line or after space)
    { 
        name: 'comment', 
        regex: new RegExp('(^|\\s)(\\/\\/.*)', 'g'), 
        replacer: '$1<span class="sh-token sh-comment">$2</span>' 
    },
    // Variables: {{...}}
    { 
        name: 'variable', 
        regex: new RegExp('(\\{\\{.*?\\}\\})', 'g'), 
        replacer: '<span class="sh-token sh-variable">$1</span>' 
    },
    // Headings: # ... (Must be at start of line)
    { 
        name: 'heading-1', 
        regex: new RegExp('(^|\\n)(#\\s.*)', 'g'), 
        replacer: '$1<span class="sh-token sh-heading sh-heading-1">$2</span>' 
    },
    { 
        name: 'heading-2', 
        regex: new RegExp('(^|\\n)(##\\s.*)', 'g'), 
        replacer: '$1<span class="sh-token sh-heading sh-heading-2">$2</span>' 
    },
    { 
        name: 'heading-3', 
        regex: new RegExp('(^|\\n)(###+\\s.*)', 'g'), 
        replacer: '$1<span class="sh-token sh-heading sh-heading-3">$2</span>' 
    },
    // Bold: **...** or __...__
    // Logic: Delimiter + capture content + Backreference to delimiter
    { 
        name: 'bold', 
        regex: new RegExp('(\\*\\*|__)(?=\\S)(.*?\\S)\\1', 'g'), 
        replacer: '<span class="sh-token sh-bold">$1$2$1</span>' 
    },
    // Italic: *...* or _..._
    { 
        name: 'italic', 
        regex: new RegExp('(\\*|_)(?=\\S)(.*?\\S)\\1', 'g'), 
        replacer: '<span class="sh-token sh-italic">$1$2$1</span>' 
    },
    // Code: `...`
    { 
        name: 'code', 
        regex: new RegExp('(`[^`\\n]+`)', 'g'), 
        replacer: '<span class="sh-token sh-code">$1</span>' 
    },
    // Lists: - ... or *. ... or 1. ... (Start of line)
    // Matches hyphen, asterisk, plus OR digits dot
    { 
        name: 'list', 
        regex: new RegExp('(^|\\n)(\\s*)([-*+]|\\d+\\.)(\\s)', 'g'), 
        replacer: '$1$2<span class="sh-token sh-list">$3</span>$4' 
    },
    // Blockquote: > ...
    {
        name: 'quote',
        regex: new RegExp('(^|\\n)(>\\s.*)', 'g'),
        replacer: '$1<span class="sh-token sh-quote">$2</span>'
    }
];

export const updateSyntaxHighlighting = (element) => {
    if (!element) return;

    try {
        // 1. Save Cursor Position
        const cursorOffset = getCaretCharacterOffsetWithin(element);
        
        // 2. Get Raw Text (innerText preserves line breaks better than textContent in contenteditable)
        let text = element.innerText;
        
        // 3. Escape HTML (Prevent injection, we are rebuilding HTML)
        text = escapeHtml(text);

        // 4. Apply Syntax Highlighting via Regex
        let highlighted = text;

        PATTERNS.forEach(p => {
            // Reset lastIndex for global regex just in case
            p.regex.lastIndex = 0;
            highlighted = highlighted.replace(p.regex, p.replacer);
        });
        
        // 5. Update HTML
        // Only update if changed to avoid unnecessary reflows
        if (element.innerHTML !== highlighted) {
            element.innerHTML = highlighted;
            
            // 6. Restore Cursor
            setCaretPosition(element, cursorOffset);
        }
    } catch (e) {
        console.warn("Syntax highlight error:", e);
        // Fail gracefully - leave text as is if something breaks
    }
};

// --- Cursor Utilities ---

/**
 * Gets the offset of the caret relative to the text content of the element.
 */
function getCaretCharacterOffsetWithin(element) {
    let caretOffset = 0;
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || window;
    const sel = win.getSelection();
    
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        // Check if range is actually inside element
        if (element.contains(range.startContainer)) {
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    }
    return caretOffset;
}

/**
 * Sets the caret position based on character offset.
 * Traverses DOM text nodes to find the correct spot.
 */
function setCaretPosition(element, offset) {
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || window;
    const sel = win.getSelection();
    const range = doc.createRange();
    
    let currentNode = null;
    let currentOffset = 0;
    
    // Helper to walk nodes
    const walk = (node) => {
        if (currentOffset > offset) return false; // Stop if passed
        
        if (node.nodeType === 3) { // Text Node
            const len = node.length;
            if (currentOffset + len >= offset) {
                // Found the node
                currentNode = node;
                return false; // Stop
            }
            currentOffset += len;
        } else {
            // Element Node - traverse children
            for (let i = 0; i < node.childNodes.length; i++) {
                if (walk(node.childNodes[i]) === false) return false;
            }
        }
        return true; // Continue
    };

    walk(element);

    if (currentNode) {
        try {
            range.setStart(currentNode, offset - currentOffset);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            // Fallback if offset calc was slightly off
            console.warn("Cursor restore fallback");
        }
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
