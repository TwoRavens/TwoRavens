let manipulationExample = [
    {
        type: "subset",
        abstractQuery: []
    }
];

let preprocessExample = { // from preprocess rook endpoint
    'bats': {
        max: 40,
        min: 12,
        mean: 23,
        sd: 452.8
    },
    'home_runs': {
        max: 40,
        min: 12,
        mean: 23,
        sd: 452.8
    }
};

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
    problemID: 'Problem 1',
    predictors: ['bats'],
    targets: ['home_runs'],
    manipulations: manipulationExample,
    preprocess: preprocessExample,
    solutions: {
        d3m: {
            '218': solutionD3MExample
        }
    }
};

let datasetsExample = {
    '185_bl_problem_train': {
        preprocess: preprocessExample,
        manipulations: manipulationExample,
        problems: {
            'Problem 1': problemExample
        },
        // stores all variable names from preprocess on initial page load
        // when hard manipulations are applied, preprocess is overwritten,
        // but editing/building the pipelines still needs knowledge about the original variables
        variablesInitial: []
    }
};
