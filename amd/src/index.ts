import { createRoot } from 'react-dom/client';
import React from 'react';
import './styles/global.css';
import { App } from './components/Core/App';
import './types/window';

// Simple global initialization
const initArinaPrismSense = (): void => {
  const container = document.getElementById('arina_prism_sense-react-root');
  if (container) {
    const root = createRoot(container);
    root.render(React.createElement(App));
  } else {
    console.error('ArinaPrismSense root element not found');
  }
};

// Export to window in multiple ways to ensure it's available
window.ArinaPrismSense = {
  init: initArinaPrismSense,
};

window.initArinaPrismSense = initArinaPrismSense;

window.local_arina_prism_sense = {
  init: initArinaPrismSense,
};

// Also add a global function
window.initArinaPrismSenseGlobal = initArinaPrismSense;

export { initArinaPrismSense };
export const init = initArinaPrismSense;
