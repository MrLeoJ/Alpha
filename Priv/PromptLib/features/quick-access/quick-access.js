
import { db } from '../../js/config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from '../../js/utils.js';

/**
 * Toggles the 'pinned' status of a prompt
 * @param {string} promptId 
 * @param {boolean} currentStatus 
 */
export const togglePin = async (promptId, currentStatus) => {
    try {
        const ref = doc(db, "prompts", promptId);
        await updateDoc(ref, {
            pinned: !currentStatus
        });
        
        // Optional: show toast only on pin, not unpin to reduce noise? 
        // Or specific messages.
        if (!currentStatus) {
            showToast('Added to Quick Access', 'success');
        } else {
            showToast('Removed from Quick Access', 'info');
        }
        return true;
    } catch (error) {
        console.error("Failed to toggle pin", error);
        showToast('Action failed', 'error');
        return false;
    }
};
