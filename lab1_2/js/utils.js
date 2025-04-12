import { EPSILON } from './config.js';

export function formatNumber(num) {
    if (Math.abs(num) < EPSILON) return "0.00";
    return num.toFixed(2);
}