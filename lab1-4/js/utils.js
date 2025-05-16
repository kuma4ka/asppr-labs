import { EPSILON } from './config.js';

export function formatNumber(num, precision = 2) {
    if (Math.abs(num) < EPSILON) return (0).toFixed(precision);
    return parseFloat(num.toFixed(precision + 5)).toFixed(precision);
}

export function getFractionalPart(num, epsilon = EPSILON) {
    if (Math.abs(num) < epsilon) return 0;
    const rounded = Math.round(num);
    if (Math.abs(num - rounded) < epsilon) {
        return 0;
    }

    let fractional = num - Math.floor(num);

    if (fractional < 0) {
        fractional += 1.0;
    }

    if (fractional < epsilon) return 0;
    if (Math.abs(fractional - 1.0) < epsilon) return 0;

    return fractional;
}