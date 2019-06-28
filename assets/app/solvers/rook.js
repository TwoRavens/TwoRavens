
export let getName = (problem, solution) => solution.meta.label;
export let getActualValues = (problem, solution, target) => problem.actualValues && problem.actualValues.map(point => point[target]) || solution.meta.actualValues;
export let getFittedValues = (problem, solution, target) => solution.models[target].fittedValues.map(parseFloat);
export let getScore = (problem, solution, target) => {
    target = target || Object.keys(solution.models)[0];
    let metric = solution.models[target].sortingMetric || {
        'classification': 'Accuracy',
        'regression': 'RMSE'
    }[solution.meta.task];
    let criterion = ['RMSE', 'MAE'].includes(metric) ? Math.min : Math.max;
    return criterion(...solution.models[target].gridResults.map(result => result[metric]));
};
export let getDescription = (problem, solution) => solution.meta.label;
export let getTask = (problem, solution) => solution.meta.task;
export let getModel = (problem, solution) => solution.meta.label;