import os
import pandas as pd
from sklearn.metrics import roc_auc_score, accuracy_score
import json
import csv

base_folder = '/home/shoe/automl_scores'
split = 'all'

def score_folder(path):
    solution_scores = []
    for run_name in os.listdir(path):

        with open(os.path.join(path, run_name, 'problem 0.json')) as prob_file:
            metadata = json.load(prob_file)
            target = metadata['targets'][0]

        run_dir = os.path.join(path, run_name)

        test_data = pd.read_csv(os.path.join(run_dir, 'splits', 'test.csv'))
        test_data.dropna(inplace=True)
        test_data.reset_index(drop=True, inplace=True)
        test_data = test_data[['d3mIndex', target]]

        for solution_id in os.listdir(os.path.join(run_dir, 'solutions')):

            roc_auc = None
            prob_path = os.path.join(run_dir, 'solutions', solution_id, split + '_PROBABILITIES.csv')
            if os.path.exists(prob_path):

                solution_data = pd.read_csv(prob_path)

                joined = test_data.merge(solution_data,
                                         left_on='d3mIndex', right_on='d3mIndex',
                                         suffixes=('_actual', '_fitted'))
                joined.dropna(inplace=True)

                roc_auc = roc_auc_score(
                    joined[target],
                    joined['p_1' if 'p_1' in joined else 'p1'])

            acc = None
            raw_path = os.path.join(run_dir, 'solutions', solution_id, split + '_RAW.csv')
            if os.path.exists(raw_path):

                solution_data = pd.read_csv(raw_path)

                joined = test_data.merge(solution_data,
                                         left_on='d3mIndex', right_on='d3mIndex',
                                         suffixes=('_actual', '_fitted'))
                joined.dropna(inplace=True)

                acc = accuracy_score(
                    joined[f'{target}_actual'],
                    joined[f'{target}_fitted'])

            with open(os.path.join(run_dir, 'solutions', solution_id, 'summary.json')) as solution_file:
                summary = json.load(solution_file)
                system_id = summary.get('systemId', summary.get('system'))

            elapsed_time = metadata['solverState']\
                .get(system_id, {})\
                .get('elapsed_time', metadata
                     .get('searchOptions', metadata)
                     .get('timeBoundSearch', 0.5) * 60.) / 60.

            if system_id == 'd3m':
                solution_config = metadata['solutions']['d3m'][solution_id.replace('d3m-', '')]
                if 'scores' in solution_config:
                    cross_val_scores = solution_config['scores']
                    if roc_auc:
                        print('roc_auc already computed')
                    else:
                        roc_auc_config = next(i for i in cross_val_scores if i['metric']['metric'] == 'ROC_AUC')
                        # roc_auc = roc_auc_config['value']['raw']['double']

                    if acc:
                        print('acc already computed')
                    else:
                        acc_config = next(i for i in cross_val_scores if i['metric']['metric'] == 'ACCURACY')
                        # acc = acc_config['value']['raw']['double']

            solution_scores.append({
                "name": solution_id,
                "ROC_AUC": roc_auc,
                'ACCURACY': acc,
                'time (minutes)': elapsed_time
            })

    return sorted(solution_scores, key=lambda v: -(v['ACCURACY' if 'Goldstone' in path else 'ROC_AUC'] or 0))


def score_all():
    scores = {}
    for folder in os.listdir(base_folder):
        if folder == '.git':
            continue

        if folder.startswith('TR13'):
            scores[folder] = score_folder(os.path.join(base_folder, folder))
    return scores


all_scores = score_all()

with open('/home/shoe/Desktop/results.csv', 'w') as results_file:
    writer = csv.writer(results_file, delimiter=',', quoting=csv.QUOTE_MINIMAL)

    writer.writerow([
        'problem', 'solution', 'ROC_AUC', 'ACCURACY', 'time (minutes)'
    ])

    for problem in sorted(all_scores.keys()):
        for solution in all_scores[problem]:
            writer.writerow([
                problem, solution['name'], solution['ROC_AUC'], solution['ACCURACY'], solution['time (minutes)']
            ])

