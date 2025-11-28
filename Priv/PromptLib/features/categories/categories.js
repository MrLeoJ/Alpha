
import { db } from '../../js/config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper to generate RGBA from Hex
export const hexToRgba = (hex, alpha) => {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex;
}

const PRIMARY = '#fe6a5f';
const BG = 'rgba(254, 106, 95, 0.1)';
const BORDER = 'rgba(254, 106, 95, 0.3)';

export const DEFAULT_CATEGORIES = {
    text_generation: { 
        id: 'text_generation', 
        label: 'Text Generation', 
        icon: 'file-text',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 0
    },
    code_generation: { 
        id: 'code_generation', 
        label: 'Code Generation', 
        icon: 'terminal',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 1
    },
    image_generation: { 
        id: 'image_generation', 
        label: 'Image Generation', 
        icon: 'image',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 2
    },
    music_generation: { 
        id: 'music_generation', 
        label: 'Music Generation', 
        icon: 'music',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 3
    },
    video_generation: { 
        id: 'video_generation', 
        label: 'Video Generation', 
        icon: 'video',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 4
    },
    text_to_speech: { 
        id: 'text_to_speech', 
        label: 'Text-to-Speech', 
        icon: 'mic',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 5
    },
    misc: { 
        id: 'misc', 
        label: 'Miscellaneous', 
        icon: 'grid',
        color: PRIMARY,
        bg: BG,
        border: BORDER,
        order: 6
    }
};

let cachedCategories = null;

/**
 * Fetch categories from Firestore. Returns an Object map { id: { ... }, ... }
 */
export const getCategories = async (forceRefresh = false) => {
    if (cachedCategories && !forceRefresh) return cachedCategories;

    try {
        if (!db) {
            cachedCategories = DEFAULT_CATEGORIES;
            return DEFAULT_CATEGORIES;
        }
        
        const docRef = doc(db, 'settings', 'categories');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().items) {
            cachedCategories = docSnap.data().items;
        } else {
            cachedCategories = DEFAULT_CATEGORIES;
        }
    } catch (error) {
        console.warn("Using default categories due to error:", error);
        cachedCategories = DEFAULT_CATEGORIES;
    }
    return cachedCategories;
};

/**
 * Helper to sort categories by order
 */
export const sortCategories = (categoriesMap) => {
    return Object.values(categoriesMap).sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999;
        const orderB = typeof b.order === 'number' ? b.order : 999;
        return orderA - orderB;
    });
};

/**
 * Save categories object to Firestore
 */
export const saveCategories = async (categoriesObj) => {
    try {
        await setDoc(doc(db, 'settings', 'categories'), { items: categoriesObj });
        cachedCategories = categoriesObj;
        return true;
    } catch (error) {
        console.error("Error saving categories:", error);
        return false;
    }
};

/**
 * Reset categories to default
 */
export const resetCategories = async () => {
    return await saveCategories(DEFAULT_CATEGORIES);
};
