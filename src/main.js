import { Game } from './Game.js';

// Bootstrap: wire the canvas + UI root and start the render loop.
const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

const game = new Game(canvas, uiRoot);
game.start();

// Expose for debugging in the console.
window.__game = game;
