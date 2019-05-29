
task_types = """  TASK_TYPE_UNDEFINED = 0;
CLASSIFICATION = 1;
REGRESSION = 2;
CLUSTERING = 3;
LINK_PREDICTION = 4;
VERTEX_NOMINATION = 5;
VERTEX_CLASSIFICATION = 6;
COMMUNITY_DETECTION = 7;
GRAPH_MATCHING = 8;
TIME_SERIES_FORECASTING = 9;
COLLABORATIVE_FILTERING = 10;
OBJECT_DETECTION = 11;
SEMISUPERVISED_CLASSIFICATION = 12;
SEMISUPERVISED_REGRESSION = 13;""".split('\n')

metrics = """METRIC_UNDEFINED = 0;
ACCURACY = 1;
PRECISION = 2;
RECALL = 3;
F1 = 4;
F1_MICRO = 5;
F1_MACRO = 6;
ROC_AUC = 7;
ROC_AUC_MICRO = 8;
ROC_AUC_MACRO = 9;
MEAN_SQUARED_ERROR = 10;
ROOT_MEAN_SQUARED_ERROR = 11;
MEAN_ABSOLUTE_ERROR = 12;
R_SQUARED = 13;
NORMALIZED_MUTUAL_INFORMATION = 14;
JACCARD_SIMILARITY_SCORE = 15;
PRECISION_AT_TOP_K = 17;
OBJECT_DETECTION_AVERAGE_PRECISION = 18;
HAMMING_LOSS = 19;
RANK = 99;
LOSS = 100;""".split('\n')

def format_for_js(lines_to_format):
    info_lines2 = [line.replace(';', '').strip() for line in lines_to_format]

    for line in info_lines2:

        name, value = [y.strip() for y in line.split(' = ')]

        # rocAucMicro:["description", "ROC_AUC_MICRO" , 7],
        js_name = name.replace('_', ' ').title().replace(' ', '')
        js_name_fmt = js_name[0].lower() + js_name[1:]
        js_line = f'{js_name_fmt}: ["description", "{name}", {value}],'
        print(f'      {js_line}')

if __name__ == '__main__':
    format_for_js(task_types)
