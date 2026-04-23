// Exposes Shepherd.js as a global window.Shepherd for use in PHP-injected tour scripts.
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
(globalThis as typeof globalThis & { Shepherd: typeof Shepherd }).Shepherd = Shepherd;
export default Shepherd;
