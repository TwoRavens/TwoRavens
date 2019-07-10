export let getSolutionAdapter = (problem, solution) => ({
    getName: () => solution.meta.label,
    getActualValues: target =>
        problem.actualValues && problem.actualValues.map(point => point[target]) || solution.meta.actualValues,
    getFittedValues: target => solution.models[target].fittedValues.map(parseFloat),

    // metric is ignored
    getScore: (target, metric) => {
        target = target || Object.keys(solution.models)[0];

        metric = solution.models[target].sortingMetric || {
            'classification': 'Accuracy',
            'regression': 'RMSE'
        }[solution.meta.task];
        let criterion = ['RMSE', 'MAE'].includes(metric) ? Math.min : Math.max;
        return criterion(...solution.models[target].gridResults.map(result => result[metric]));
    },
    getDescription: () => solution.meta.label,
    getTask: () => solution.meta.task,
    getModel: () => solution.meta.label
});
