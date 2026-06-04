import { createRoot } from 'react-dom/client';
import React from 'react';
import { CollegeAdminApp } from './CollegeAdminApp';
import './styles/index.css';

const initCollegeAdmin = (): void => {
    const container = document.getElementById('arina-college-admin-root');
    if (container) {
        const root = createRoot(container);
        root.render(React.createElement(CollegeAdminApp));
    } else {
        console.error('College Admin root element (#arina-college-admin-root) not found');
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollegeAdmin);
} else {
    initCollegeAdmin();
}

export { initCollegeAdmin };
export const init = initCollegeAdmin;
