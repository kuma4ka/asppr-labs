import { EPSILON } from './config.js';

export function formatNumber(num, precision = 2) {
    if (num === null || typeof num === 'undefined') return "N/A";

    const numAbs = Math.abs(num);
    if (numAbs < EPSILON) return (0).toFixed(precision).replace('-', '');

    const factor = Math.pow(10, precision);

    let roundedNum;
    if (num > 0) {
        roundedNum = Math.floor(num * factor + EPSILON * factor) / factor;
    } else {
        roundedNum = Math.ceil(num * factor - EPSILON * factor) / factor;
    }

    if (Math.abs(roundedNum) < EPSILON && roundedNum !== 0) return (0).toFixed(precision).replace('-', '');

    let strNum = roundedNum.toFixed(precision);
    if (strNum === "-0.00") strNum = "0.00";
    return strNum;
}