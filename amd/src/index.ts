import { createRoot } from 'react-dom/client';
import React from 'react';
import './styles/global.css';
import { App } from './components/Core/App';
import './types/window';

// Simple global initialization
const initLectureBot = (): void => {
  const container = document.getElementById('lecturebot-react-root');
  if (container) {
    const root = createRoot(container);
    root.render(React.createElement(App));
  } else {
    console.error('LectureBot root element not found');
  }
};

// Export to window in multiple ways to ensure it's available
window.LectureBot = {
  init: initLectureBot,
};

window.initLectureBot = initLectureBot;

window.local_lecturebot = {
  init: initLectureBot,
};

// Also add a global function
window.initLectureBotGlobal = initLectureBot;

export { initLectureBot };
export const init = initLectureBot;
