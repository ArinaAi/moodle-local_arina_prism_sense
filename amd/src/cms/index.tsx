import { createRoot } from 'react-dom/client';
import React from 'react';
import { App } from './App';
import './styles/index.css';

// Guard against double-initialization using a DOM attribute so the check
// survives across separate module-scope evaluations (e.g. script tag + AMD).
const initCMS = (): void => {
    const container = document.getElementById('arina_prism_sense-cms-root');
    if (!container) {
        console.error('CMS root element (#arina_prism_sense-cms-root) not found');
        return;
    }
    if (container.hasAttribute('data-arina-initialized')) {
        return;
    }
    container.setAttribute('data-arina-initialized', 'true');
    const root = createRoot(container);
    root.render(React.createElement(App));
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCMS);
} else {
    initCMS();
}

// Export for manual initialization if needed
export { initCMS };
export const init = initCMS;
