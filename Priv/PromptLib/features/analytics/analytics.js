
import { db } from '../../js/config.js';
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Increments the usage count for a specific prompt.
 * Usage is defined as a Copy or Launch action.
 * @param {string} promptId 
 */
export const incrementUsage = async (promptId) => {
    if (!db || !promptId) return;
    try {
        const ref = doc(db, "prompts", promptId);
        await updateDoc(ref, {
            usageCount: increment(1)
        });
        // Optional: console.log(`Usage tracked for ${promptId}`);
    } catch (e) {
        console.warn("Failed to track usage", e);
    }
};
