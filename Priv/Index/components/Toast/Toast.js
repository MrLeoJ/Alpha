
export const Toast = {
    notify(msg, type = 'info', action = null) {
        const bg = type === 'error' ? '#ef4444' : '#00d2c3';
        
        const toastOptions = {
            duration: action ? 5000 : 3000,
            gravity: "bottom",
            position: "center",
            stopOnFocus: true,
            style: {
                background: bg,
                borderRadius: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                fontFamily: "Poppins, sans-serif",
                fontSize: "14px",
                fontWeight: "600",
                minWidth: action ? "340px" : "auto",
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            },
        };

        if (action) {
            const container = document.createElement("div");
            container.style.display = "flex";
            container.style.alignItems = "center";
            container.style.justifyContent = "space-between";
            container.style.gap = "16px";
            container.style.width = "100%";

            const textSpan = document.createElement("span");
            textSpan.textContent = msg;
            container.appendChild(textSpan);

            const btn = document.createElement("button");
            btn.textContent = action.label;
            btn.style.background = "rgba(0, 0, 0, 0.15)";
            btn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
            btn.style.borderRadius = "6px";
            btn.style.padding = "6px 14px";
            btn.style.color = "white";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "12px";
            btn.style.fontWeight = "bold";
            btn.style.marginLeft = "auto";
            btn.style.transition = "all 0.2s";
            btn.style.whiteSpace = "nowrap";

            btn.onmouseover = () => {
                btn.style.background = "rgba(0, 0, 0, 0.25)";
            };
            btn.onmouseout = () => {
                btn.style.background = "rgba(0, 0, 0, 0.15)";
            };

            btn.onclick = (e) => {
                e.stopPropagation();
                action.onClick();
            };

            container.appendChild(btn);
            toastOptions.node = container;
        } else {
            toastOptions.text = msg;
        }

        // eslint-disable-next-line no-undef
        Toastify(toastOptions).showToast();
    },

    confirm(msg, onConfirm) {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "12px";
        container.style.width = "100%";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.alignItems = "center";
        topRow.style.gap = "12px";

        const icon = document.createElement("i");
        // Using Lucide icon class directly usually requires render, but assuming we can just use text or simple markup if icons aren't available
        // Let's keep it simple text or emoji for safety if Lucide isn't reprocessing this node
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';
        
        const textSpan = document.createElement("span");
        textSpan.textContent = msg;
        textSpan.style.color = "#fff";
        textSpan.style.fontWeight = "500";
        
        topRow.appendChild(icon);
        topRow.appendChild(textSpan);
        container.appendChild(topRow);

        const btnGroup = document.createElement("div");
        btnGroup.style.display = "flex";
        btnGroup.style.justifyContent = "flex-end";
        btnGroup.style.gap = "8px";
        btnGroup.style.marginTop = "4px";

        let toastInstance = null;

        const createBtn = (text, isPrimary, onClick) => {
            const btn = document.createElement("button");
            btn.textContent = text;
            btn.style.padding = "6px 16px";
            btn.style.borderRadius = "6px";
            btn.style.fontSize = "13px";
            btn.style.fontWeight = "600";
            btn.style.cursor = "pointer";
            btn.style.border = "none";
            btn.style.transition = "opacity 0.2s";
            
            if (isPrimary) {
                btn.style.background = "#ef4444"; // Red for dangerous action
                btn.style.color = "white";
            } else {
                btn.style.background = "transparent";
                btn.style.color = "#d1d5db"; // Light gray
                btn.style.border = "1px solid #4b5563";
            }

            btn.onmouseover = () => { btn.style.opacity = "0.9"; };
            btn.onmouseout = () => { btn.style.opacity = "1"; };
            
            btn.onclick = (e) => {
                e.stopPropagation();
                onClick();
            };
            return btn;
        };

        const confirmBtn = createBtn("Delete", true, () => {
            if (toastInstance) toastInstance.hideToast();
            onConfirm();
        });

        const cancelBtn = createBtn("Cancel", false, () => {
            if (toastInstance) toastInstance.hideToast();
        });

        btnGroup.appendChild(cancelBtn);
        btnGroup.appendChild(confirmBtn);
        container.appendChild(btnGroup);

        toastInstance = Toastify({
            node: container,
            duration: -1, // Wait for user interaction
            gravity: "bottom",
            position: "center",
            stopOnFocus: true,
            style: {
                background: "#1f2937", // Dark Gray
                borderRadius: "12px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                fontFamily: "Poppins, sans-serif",
                fontSize: "14px",
                padding: "16px",
                minWidth: "320px",
                border: "1px solid #374151"
            },
        });
        
        toastInstance.showToast();
    }
};
