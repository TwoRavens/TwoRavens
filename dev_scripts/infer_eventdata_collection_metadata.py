import json


# simple changes here would greatly increase the quality of the bindings
# quick/dirty initial pass
# script can be repeatedly re-run
def generate_config(prior_metadata_path, summaries_path, output_path):
    prior_metadata = json.load(open(prior_metadata_path, "r"))
    summaries = json.load(open(summaries_path, "r"))

    new_subsets = {}

    prior_used_variables = []
    for subset_name in prior_metadata['subsets']:
        prior_used_variables.extend(
            prior_metadata['subsets'][subset_name].get('columns', []))

    for var_name in summaries:
        if var_name in prior_used_variables:
            continue

        summary = summaries[var_name]
        # print(summary)

        if summary['nature'] == 'nominal':
            new_subsets[var_name] = {
                "type": "discrete",
                "measureType": "accumulator",
                "columns": [var_name]
            }
        else:
            new_subsets[var_name] = {
                "type": "continuous",
                "min": summary['min'],
                "max": summary['max'],
                "buckets": 10,
                "columns": [var_name]
            }

    prior_metadata['subsets'].update(new_subsets)

    # print(json.dumps(new_subsets, indent=2))
    with open(output_path, 'w') as output_file:
        json.dump(prior_metadata, output_file)


generate_config(
    "/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/collections/ged_2019.json",
    "/Users/michael/temp_dataset/ged_summary.json",
    "/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/collections/ged.json")

generate_config(
    "/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/collections/gtd_2019.json",
    "/Users/michael/temp_dataset/gtd_summary.json",
    "/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/collections/gtd.json")
