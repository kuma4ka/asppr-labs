import { defaultMatrixA, defaultMatrixB } from './js/matrixOptions.js';
import { initMatrices } from './js/matrixRendering.js';
import { initializeButtons } from './js/buttonEventHandlers.js';

document.addEventListener("DOMContentLoaded", () => {
    initMatrices(defaultMatrixA, defaultMatrixB);
    initializeButtons();
});