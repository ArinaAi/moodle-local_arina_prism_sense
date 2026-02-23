import { createRoot } from 'react-dom/client';
import React from 'react';
import { App } from './App';
import './styles/index.css';

// Mount the Credit Management System React app
const initCMS = (): void => {
    const container = document.getElementById('lecturebot-cms-root');
    if (container) {
        const root = createRoot(container);
        root.render(React.createElement(App));
    } else {
        console.error('CMS root element (#lecturebot-cms-root) not found');
    }
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
