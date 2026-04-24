import React from 'react';
import { createRoot } from 'react-dom/client';
import StudentApp from './StudentApp';

// Export init function to window.ArinaPrismSense
export const initStudent = (): void => {
    const container = document.getElementById('arina_prism_sense-student-root');
    if (container) {
        const root = createRoot(container);
        root.render(React.createElement(StudentApp));
    } else {
        // eslint-disable-next-line no-console
        console.error('❌ Student root element not found');
    }
};
