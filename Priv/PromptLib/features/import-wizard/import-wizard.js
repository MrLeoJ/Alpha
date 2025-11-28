
import { db } from '../../js/config.js';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, renderIcons, showConfirmToast } from '../../js/utils.js';

export const openImportWizard = () => {
    // Create Modal UI
    const overlay = document.createElement('div');
    overlay.className = 'injector-overlay';
    
    overlay.innerHTML = `
        <div class="import-modal">
            <div class="manage-header">
                <div class="manage-title">Import Data</div>
                <button class="injector-close-btn" id="closeImportBtn"><i data-feather="x"></i></button>
            </div>
            
            <div class="import-body">
                <!-- Step 1: Upload -->
                <div id="importStep1">
                    <div class="drop-zone" id="dropZone">
                        <i data-feather="upload-cloud" class="drop-zone-icon"></i>
                        <div class="drop-text">Drag & Drop JSON file here</div>
                        <div class="drop-subtext">or click to browse</div>
                        <input type="file" id="importFileInput" accept=".json" style="display:none">
                    </div>
                </div>

                <!-- Step 2: Review & Options (Hidden initially) -->
                <div id="importStep2" style="display:none; flex-direction:column; gap:20px;">
                    <div class="import-preview">
                        <div class="preview-icon"><i data-feather="file-text"></i></div>
                        <div class="preview-info">
                            <div class="preview-filename" id="previewFilename">data.json</div>
                            <div class="preview-count" id="previewCount">Found 0 prompts</div>
                        </div>
                    </div>

                    <div class="import-options">
                        <label class="option-card selected">
                            <input type="radio" name="importMode" value="merge" class="option-radio" checked>
                            <div class="option-content">
                                <div class="option-title">Merge</div>
                                <div class="option-desc">Add imported prompts. Updates existing items if IDs match. Safe default.</div>
                            </div>
                        </label>

                        <label class="option-card">
                            <input type="radio" name="importMode" value="overwrite" class="option-radio">
                            <div class="option-content">
                                <div class="option-title" style="color:#dc3545">Overwrite</div>
                                <div class="option-desc">Permanently delete ALL current prompts and replace them with this file.</div>
                            </div>
                        </label>
                    </div>

                    <div class="import-actions">
                        <button class="btn btn-secondary" id="importBackBtn">Back</button>
                        <button class="btn btn-primary" id="importConfirmBtn">Start Import</button>
                    </div>
                </div>

                <!-- Step 3: Progress (Hidden) -->
                <div id="importStep3" style="display:none;">
                    <div class="progress-container">
                        <div class="progress-status" id="progressStatus">Preparing...</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" id="progressBar"></div>
                        </div>
                        <div style="margin-top:8px; font-size:0.8rem; color:var(--text-light);" id="progressDetail"></div>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    renderIcons();

    // Trigger Animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // --- References ---
    const dropZone = overlay.querySelector('#dropZone');
    const fileInput = overlay.querySelector('#importFileInput');
    const step1 = overlay.querySelector('#importStep1');
    const step2 = overlay.querySelector('#importStep2');
    const step3 = overlay.querySelector('#importStep3');
    const previewFilename = overlay.querySelector('#previewFilename');
    const previewCount = overlay.querySelector('#previewCount');
    const optionCards = overlay.querySelectorAll('.option-card');
    
    let parsedData = null;

    // --- Handlers ---
    const close = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('#closeImportBtn').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if(e.target === overlay) close(); });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    const handleFile = (file) => {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            showToast('Please upload a JSON file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                validateAndPreview(file.name, json);
            } catch (err) {
                console.error(err);
                showToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    };

    const validateAndPreview = (filename, json) => {
        if (!Array.isArray(json)) {
            showToast('Invalid format: Root must be an array', 'error');
            return;
        }
        
        // Basic check for one item
        if (json.length > 0 && (!json[0].title && !json[0].content)) {
             showToast('JSON does not look like prompt data', 'error');
             return;
        }

        parsedData = json;
        
        // Update UI
        previewFilename.textContent = filename;
        previewCount.textContent = `Found ${json.length} prompts`;
        
        step1.style.display = 'none';
        step2.style.display = 'flex';
    };

    // Options UI logic
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            optionCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input').checked = true;
        });
    });

    // Back Button
    overlay.querySelector('#importBackBtn').addEventListener('click', () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
        parsedData = null;
        fileInput.value = '';
    });

    // Confirm Import
    overlay.querySelector('#importConfirmBtn').addEventListener('click', async () => {
        const mode = overlay.querySelector('input[name="importMode"]:checked').value;
        
        if (mode === 'overwrite') {
            const confirmed = confirm("WARNING: This will permanently delete ALL existing prompts in your library.\n\nAre you absolutely sure?");
            if (!confirmed) return;
        }

        step2.style.display = 'none';
        step3.style.display = 'block';
        
        await performImport(parsedData, mode);
    });

    // --- Import Logic ---
    const performImport = async (data, mode) => {
        const statusEl = overlay.querySelector('#progressStatus');
        const barEl = overlay.querySelector('#progressBar');
        const detailEl = overlay.querySelector('#progressDetail');

        try {
            // 1. If Overwrite, clear DB
            if (mode === 'overwrite') {
                statusEl.textContent = 'Clearing existing data...';
                await clearCollection('prompts');
            }

            // 2. Chunk data (Batch limit is 500)
            const chunkSize = 400; // Safe margin
            const chunks = [];
            for (let i = 0; i < data.length; i += chunkSize) {
                chunks.push(data.slice(i, i + chunkSize));
            }

            let processedCount = 0;
            const total = data.length;

            statusEl.textContent = 'Importing...';

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const batch = writeBatch(db);

                chunk.forEach(item => {
                    const { id, ...rest } = item;
                    // If item has ID, respect it. If not, generated.
                    // If mode is Merge and ID exists, it updates.
                    const docRef = id ? doc(db, "prompts", id) : doc(collection(db, "prompts"));
                    
                    // Sanitize timestamp: if it's just an object from JSON, it's fine as a map.
                    // Or we could convert to Timestamp? 
                    // Firestore handles plain objects fine. 
                    
                    batch.set(docRef, {
                        ...rest,
                        // Ensure essential fields exist if missing
                        updatedAt: serverTimestamp() 
                    }, { merge: true });
                });

                await batch.commit();
                
                processedCount += chunk.length;
                const pct = Math.round((processedCount / total) * 100);
                barEl.style.width = `${pct}%`;
                detailEl.textContent = `${processedCount} / ${total} items`;
            }

            statusEl.textContent = 'Success!';
            detailEl.textContent = 'Reloading library...';
            
            setTimeout(() => {
                close();
                showToast('Import completed successfully', 'success');
                // Trigger reload
                const event = new CustomEvent('library-data-changed');
                window.dispatchEvent(event);
            }, 1000);

        } catch (error) {
            console.error("Import error:", error);
            statusEl.textContent = 'Error';
            statusEl.style.color = '#dc3545';
            detailEl.textContent = 'Check console for details.';
            showToast('Import failed', 'error');
        }
    };

    const clearCollection = async (collName) => {
        // Need to delete all docs. 
        // Note: In client SDK, deleting a collection requires deleting docs one by one (batched).
        const q = collection(db, collName);
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        // Chunk deletes
        const docs = snapshot.docs;
        const chunkSize = 400;
        const chunks = [];
        for (let i = 0; i < docs.length; i += chunkSize) {
            chunks.push(docs.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    };
};
