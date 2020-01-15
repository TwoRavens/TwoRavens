let manipulationExample = [
    {
        type: "subset",
        abstractQuery: []
    }
];

let solutionD3MExample = {
    pipelineID: '218',
    predictedValues: {
        success: true,
        data: []
    },
    score: 12.3,
    steps: []
};

let problemExample = {
    problemId: 'Problem 1',
    predictors: ['bats'],
    targets: ['home_runs'],
    manipulations: manipulationExample,
    solutions: {
        d3m: {
            '218': solutionD3MExample
        }
    }
};

let datasetsExample = {
    '185_bl_problem_train': {
        hardManipulations: manipulationExample,
        problems: {
            'Problem 1': problemExample
        },
        // stores all variable names from preprocess on initial page load
        // when hard manipulations are applied, preprocess is overwritten,
        // but editing/building the pipelines still needs knowledge about the original variables
        variablesInitial: []
    }
};
