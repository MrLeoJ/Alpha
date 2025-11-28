## Single Source of Truth (SSOT) for Web Platform Build

This document specifies the requirements for developing the web platform, guiding the build process to ensure a cohesive, maintainable, modern user experience (UX) and user interface (UI), including **full responsiveness** and **Firebase integration**.

---

## Technical Architecture

### Modular Folder Structure

The platform must adopt a **modular, feature-centric architecture**. Every UI element or functional feature will reside in its own dedicated, top-level folder, and this folder will contain all associated files, such as HTML, CSS, JavaScript, and asset files.

### Database and Backend

* **Database:** **Firebase** will be used as the primary database and backend service provider.
* **Integration:** All data persistence, authentication, and real-time functions must be implemented using Firebase services (Firestore, Authentication, etc.).

---

## Design & Aesthetic Guidelines

### Visual Style and Colour Palette

The design must be **minimalist, modern, and sleek**, prioritising clarity and ample white space.

* **Primary Accent Colour:** `#fe6a5f` (Used for key interactive elements, calls-to-action, and highlights).
* **Secondary Accent Colour:** `#475a54` (Used for text, backgrounds of non-primary elements, or deep contrast).
* **Background Integration:** The main application background colour must be a light neutral (e.g., pure white or off-white like `#f5f5f5`) to ensure the specified accent colours have maximum impact and readability.

### Typography

* **Font Family:** **Poppins** must be used for all text elements.

### Iconography

* **Source:** All icons must be sourced exclusively from **Feather Icons** ([https://feathericons.com](https://feathericons.com)).
* **Format:** Icons must be rendered as SVGs.

---

## Responsiveness and Adaptive UI

### Mandatory Responsiveness

The platform must be **fully responsive** and follow a **mobile-first approach**. The design must ensure all elements look and work equally well across all common viewport sizes, including **desktops, laptops, tablets, and mobile phones**.

### Implementation Requirements

* **Mobile-First Design:** Development must start by designing and styling for the smallest screens first.
* **Media Queries:** CSS media queries must be used extensively to adjust layouts, typography, and component visibility for different screen sizes.
* **Flexible Layouts:** The layout must employ **CSS Flexbox and Grid** for creating flexible and predictable structures.
* **Viewport Meta Tag:** The main HTML document must include the necessary viewport meta tag.
* **Component Adaptation:** Complex features must have distinct, optimised presentations for mobile screens.

---

## User Feedback & Notifications

### Toast Notifications

All system messages, alerts, and user feedback must be presented via **stylish toast notifications**.

* **Requirement:** Standard browser alerts and pop-ups are **forbidden**.
* **Style:** Must integrate with the minimalist design.
* **Consistency:** Toasts must appear in a fixed, consistent position, which should be adjusted via media queries for optimal viewing on smaller screens.