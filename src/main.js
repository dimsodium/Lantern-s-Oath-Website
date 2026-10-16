// Lantern's Oath: site entry point.
import './styles.css';
import { initStarfield } from './site/starfield.js';
import './site/audio.js';
import { initMogo } from './site/mogo.js';
import { initHomeMenu } from './site/home-menu.js';
import { initApp } from './app.js';

initStarfield();
initApp();
initMogo();
initHomeMenu();
