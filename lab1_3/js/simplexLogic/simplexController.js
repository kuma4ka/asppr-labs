import { logToProtocol } from '../protocol/protocolManager.js';
import { logTableau, formatTableauAsHTML as formatTableauAsHTML_protocol } from '../protocol/protocolFormatters.js'; // <--- ВИПРАВЛЕНО/ДОДАНО
import {
    initializeTableauStructure,
    populateConstraintRows,
    initializeObjectiveRow,
    setOriginalNumDecisionVariables as setOpsOriginalNumVars
} from './tableauOperations.js';
import {
    removeZeroRows,
    findSupportSolution,
    findOptimalSolutionPhaseII
} from './simplexPhases.js';

const M_VALUE = 1000;

export function initializeSimplex(inputData) {
    setOpsOriginalNumVars(inputData.numVariables);
    const tableauState = initializeTableauStructure(inputData);
    populateConstraintRows(tableauState, inputData.constraints);
    initializeObjectiveRow(tableauState, inputData.objective, M_VALUE);
    return tableauState;
}

export function runFullSimplexAlgorithm(inputData, getInitialStateOnly = false) {
    try {
        const originalNumDecisionVariables = inputData.numVariables;

        const initialTableauState = initializeSimplex(inputData);

        if (getInitialStateOnly) {
            return initialTableauState;
        }

        logTableau(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders, "Вхідна симплекс-таблиця (після ініціалізації, можливо з Big M)");

        const zeroRowResultState = removeZeroRows(initialTableauState, originalNumDecisionVariables);
        let zeroRowSummaryText = zeroRowResultState.summary || "Процес видалення 0-рядків завершено (деталі в протоколі).";
        if (zeroRowResultState.error) {
            return {
                optimalSolution: "Error during 0-row removal",
                optimalZ: "Error",
                finalTableau: zeroRowResultState.tableau,
                initialTableauForSummary: formatTableauAsHTML_protocol(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders),
                zeroRowSummary: "Помилка під час видалення 0-рядків.",
                basicFeasibleSolutionSummary: null,
                optimizationSummary: null
            };
        }

        const supportSolResultState = findSupportSolution(zeroRowResultState, inputData.objective.type, originalNumDecisionVariables);
        if (supportSolResultState.error || !supportSolResultState.feasible) {
            return {
                optimalSolution: supportSolResultState.feasible ? "Error" : "Infeasible (Фаза I)",
                optimalZ: supportSolResultState.feasible ? "Error" : "Infeasible (Фаза I)",
                finalTableau: supportSolResultState.tableau,
                initialTableauForSummary: formatTableauAsHTML_protocol(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders),
                zeroRowSummary: zeroRowSummaryText,
                basicFeasibleSolutionSummary: supportSolResultState.basicFeasibleSolutionForSummary || "Н/Д",
                optimizationSummary: null
            };
        }

        const optResultState = findOptimalSolutionPhaseII(supportSolResultState, inputData.objective.type, originalNumDecisionVariables);
        return {
            optimalSolution: optResultState.optimalSolution,
            optimalZ: optResultState.optimalZ,
            finalTableau: optResultState.tableau,
            initialTableauForSummary: formatTableauAsHTML_protocol(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders),
            zeroRowSummary: zeroRowSummaryText,
            basicFeasibleSolutionSummary: supportSolResultState.basicFeasibleSolutionForSummary,
            optimizationSummary: optResultState.optimizationSummary || "Етап оптимізації завершено (деталі в протоколі)."
        };
    } catch (e) {
        console.error("Критична помилка в runFullSimplexAlgorithm:", e);
        logToProtocol(`\n!!! КРИТИЧНА ПОМИЛКА АЛГОРИТМУ: ${e.message}\n${e.stack || ''}`, 'text');
        return {
            optimalSolution: "Критична помилка",
            optimalZ: "Помилка",
            finalTableau: [[]],
            initialTableauForSummary: "Помилка ініціалізації",
            zeroRowSummary: "Помилка",
            basicFeasibleSolutionSummary: "Помилка",
            optimizationSummary: "Помилка"
        };
    }
}