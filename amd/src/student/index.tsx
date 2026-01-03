import React from 'react';
import { createRoot } from 'react-dom/client';
import StudentApp from './StudentApp';

// Export init function to window.LectureBot
export const initStudent = (): void => {
    const container = document.getElementById('lecturebot-student-root');
    if (container) {
        const root = createRoot(container);
        root.render(React.createElement(StudentApp));
        console.log('✅ Student App Initialized');
    } else {
        console.error('❌ Student root element not found');
    }
};
