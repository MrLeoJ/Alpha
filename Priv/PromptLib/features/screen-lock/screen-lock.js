
import { renderIcons, showToast } from '../../js/utils.js';
import { db } from '../../js/config.js';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'lock_sessions';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

let idleTimer = null;
let deviceId = null;
let unsubscribeListener = null;

// --- UTILS ---

const getDeviceId = () => {
    let id = localStorage.getItem('app_device_id');
    if (!id) {
        id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('app_device_id', id);
    }
    deviceId = id;
    return id;
};

const hashPin = async (pin) => {
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- INITIALIZATION ---

export const initScreenLock = () => {
    if (!db) {
        console.warn('Firestore not available for Screen Lock');
        return;
    }

    const id = getDeviceId();
    const docRef = doc(db, COLLECTION_NAME, id);

    // Real-time listener for Lock Status
    unsubscribeListener = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isLocked) {
                renderLockScreen(false); // Mode: Unlock
            } else {
                removeLockScreen();
            }
            
            // Handle Auto-Lock Timer logic if config exists
            if (data.autoLock) {
                setupIdleDetection();
            } else {
                clearIdleDetection();
            }
        } else {
            // No session doc implies unlocked state or new device
            removeLockScreen();
        }
    }, (error) => {
        console.error("Lock Listener Error:", error);
    });

    // Listen for manual trigger
    window.addEventListener('app-lock-trigger', async () => {
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().pinHash) {
            // Already has PIN, just lock it
            lockApp();
        } else {
            // Needs Setup
            renderSetupScreen();
        }
    });
};

// --- ACTIONS ---

const lockApp = async () => {
    if (!deviceId) return;
    try {
        const ref = doc(db, COLLECTION_NAME, deviceId);
        await updateDoc(ref, { 
            isLocked: true, 
            lockedAt: serverTimestamp() 
        });
    } catch (e) {
        console.error("Failed to lock", e);
        showToast("Connection error: Could not lock", "error");
    }
};

const unlockApp = async () => {
    if (!deviceId) return;
    try {
        const ref = doc(db, COLLECTION_NAME, deviceId);
        await updateDoc(ref, { 
            isLocked: false,
            lastActive: serverTimestamp()
        });
        showToast('Welcome back!', 'success');
    } catch (e) {
        console.error("Failed to unlock", e);
        showToast("Connection error: Could not unlock", "error");
    }
};

const setupNewLock = async (pin, autoLock) => {
    const hashed = await hashPin(pin);
    const ref = doc(db, COLLECTION_NAME, deviceId);
    
    await setDoc(ref, {
        pinHash: hashed,
        isLocked: false, // Don't lock immediately, let user do it or auto
        autoLock: autoLock,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
    });

    showToast("Privacy Shield Configured", "success");
};

// --- IDLE DETECTION ---

const setupIdleDetection = () => {
    if (idleTimer) return; // Already running

    updateLastActiveTimestamp(); // Initial bump

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => {
        localStorage.setItem('app_last_active_local', Date.now());
    };

    events.forEach(evt => window.addEventListener(evt, handler, { passive: true }));

    // Check interval
    idleTimer = setInterval(async () => {
        const lastLocal = parseInt(localStorage.getItem('app_last_active_local') || Date.now());
        const now = Date.now();
        
        // If local browser has been idle for timeout duration...
        if (now - lastLocal > IDLE_TIMEOUT_MS) {
            // Check if we are already locked in DB to avoid redundant writes
            // We can't easily check DB sync here without reading, but since we are locking,
            // an extra write is safer than checking.
            
            // Only lock if NOT already locked locally (visual check)
            if (!document.getElementById('lockOverlay')) {
                lockApp();
            }
        }
    }, 60000); // Check every minute
};

const clearIdleDetection = () => {
    if (idleTimer) {
        clearInterval(idleTimer);
        idleTimer = null;
    }
};

const updateLastActiveTimestamp = () => {
    localStorage.setItem('app_last_active_local', Date.now());
};

// --- UI RENDERERS ---

const removeLockScreen = () => {
    const overlay = document.getElementById('lockOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 400);
        document.body.style.overflow = '';
    }
};

const renderLockScreen = (isSetupMode) => {
    if (document.getElementById('lockOverlay')) return; 

    const overlay = document.createElement('div');
    overlay.id = 'lockOverlay';
    overlay.className = 'lock-overlay';
    document.body.style.overflow = 'hidden';

    overlay.innerHTML = `
        <div class="lock-card">
            <div class="lock-icon-wrapper">
                <i data-feather="lock" width="40" height="40"></i>
            </div>
            <div class="lock-title">Privacy Lock</div>
            <div class="lock-desc">Enter your passcode to resume your session.</div>
            
            <div class="pin-input-wrapper">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="0" autocomplete="off">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="1" autocomplete="off">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="2" autocomplete="off">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="3" autocomplete="off">
            </div>

            <div class="lock-footer">
                <button class="forgot-pin-btn" id="forgotPinBtn">Forgot Passcode?</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Input Logic
    initPinInputs(overlay, async (pin) => {
        // Validate against DB
        const ref = doc(db, COLLECTION_NAME, deviceId);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            const storedHash = snap.data().pinHash;
            const enteredHash = await hashPin(pin);
            
            if (storedHash === enteredHash) {
                unlockApp();
            } else {
                triggerShake(overlay);
            }
        } else {
            // Edge case: Doc deleted while locked? Unlock to be safe or Reset?
            // Safer to assume reset needed.
            alert("Session invalid. Resetting lock.");
            unlockApp();
        }
    });

    overlay.querySelector('#forgotPinBtn').addEventListener('click', () => {
        if(confirm("To recover access, we must reset your lock settings for this device. Proceed?")) {
             // We can delete the doc to reset
             const ref = doc(db, COLLECTION_NAME, deviceId);
             setDoc(ref, { isLocked: false }).then(() => {
                 window.location.reload();
             });
        }
    });
};

const renderSetupScreen = () => {
    const overlay = document.createElement('div');
    overlay.className = 'lock-overlay visible'; // Force visible immediately
    overlay.style.zIndex = '12000'; // Above everything
    
    overlay.innerHTML = `
        <div class="lock-card">
            <div class="lock-icon-wrapper" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);">
                <i data-feather="shield" width="40" height="40"></i>
            </div>
            <div class="lock-title">Create Passcode</div>
            <div class="lock-desc">Secure this browser session with a 4-digit PIN.</div>
            
            <div class="pin-input-wrapper">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="0">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="1">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="2">
                <input type="tel" maxlength="1" class="pin-digit" data-idx="3">
            </div>

            <label class="setup-option">
                <input type="checkbox" id="autoLockCheck" checked>
                <span>Auto-lock after 15 minutes</span>
            </label>
            
            <div class="lock-footer" style="flex-direction:row; margin-top:8px;">
                <button class="lock-btn secondary" id="cancelSetup">Cancel</button>
                <button class="lock-btn primary" id="saveSetup" disabled>
                    Set PIN <i data-feather="arrow-right" width="18"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    let currentPin = '';

    initPinInputs(overlay, (pin) => {
        currentPin = pin;
        const btn = overlay.querySelector('#saveSetup');
        if (pin.length === 4) {
            btn.disabled = false;
            btn.focus();
        }
    });

    overlay.querySelector('#cancelSetup').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#saveSetup').addEventListener('click', async () => {
        const autoLock = overlay.querySelector('#autoLockCheck').checked;
        const btn = overlay.querySelector('#saveSetup');
        
        btn.innerHTML = '<i data-feather="loader" class="spin"></i> Saving...';
        btn.disabled = true;

        await setupNewLock(currentPin, autoLock);
        overlay.remove();
    });
};

// --- HELPERS ---

const initPinInputs = (container, onComplete) => {
    const inputs = container.querySelectorAll('.pin-digit');
    
    inputs.forEach((input, index) => {
        // Auto focus first
        if (index === 0) setTimeout(() => input.focus(), 100);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!/^\d*$/.test(val)) {
                e.target.value = '';
                return;
            }

            if (val) {
                input.classList.add('filled');
                if (index < 3) {
                    inputs[index + 1].focus();
                } else {
                    // Completed
                    const fullPin = Array.from(inputs).map(i => i.value).join('');
                    if (fullPin.length === 4) {
                        input.blur(); // Remove focus
                        onComplete(fullPin);
                    }
                }
            } else {
                input.classList.remove('filled');
            }
        });

        // Paste support
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const nums = text.replace(/\D/g, '').split('').slice(0, 4);
            
            nums.forEach((n, i) => {
                if (inputs[i]) {
                    inputs[i].value = n;
                    inputs[i].classList.add('filled');
                }
            });
            
            if (nums.length === 4) {
                inputs[3].blur();
                onComplete(nums.join(''));
            } else if (nums.length > 0) {
                inputs[nums.length].focus();
            }
        });
    });
};

const triggerShake = (container) => {
    const inputs = container.querySelectorAll('.pin-digit');
    inputs.forEach(inp => {
        inp.classList.add('error');
        inp.value = '';
        inp.classList.remove('filled');
    });
    
    setTimeout(() => {
        inputs.forEach(inp => inp.classList.remove('error'));
        inputs[0].focus();
    }, 500);
};
