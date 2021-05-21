import os

import pandas as pd
import json

from shapely.geometry import shape, Point
from dev_scripts.d3m_wrap_dataset import d3m_wrap_dataset


def find_feature(polygons, x_coord, y_coord):
    point = Point(x_coord, y_coord)
    for polygons_id, polygons_shape in polygons.items():
        if polygons_shape.contains(point):
            return polygons_id


def augment_geojson_id(data, geojson, x_name, y_name, id_name):
    print('parsing polygons')
    polygons = {feature['properties'][id_name]: shape(feature['geometry']) for feature in geojson['features']}
    print('constructing augment column')
    data[id_name] = data.apply(lambda row: find_feature(polygons, row[x_name], row[y_name]), axis=1)
    return data


if __name__ == "__main__":
    print('loading CSV')
    incidents = pd.read_csv('dallas/Police_Incidents.csv')
    cod_organizations_path = "/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/geojson/COD_Organizations.json"
    print('loading geojson')
    cod_organizations = json.load(open(cod_organizations_path, 'r'))
    # print(incidents.columns.values)
    incidents = augment_geojson_id(
        data=incidents,
        geojson=cod_organizations,
        x_name="X Coordinate",
        y_name="Y Cordinate",
        id_name="ASSO_NAME")

    print(incidents["ASSO_NAME"].unique())

    print('writing CSV')
    incidents_augmented_path = 'dallas/Police_Incidents_augmented.csv'
    incidents.to_csv(incidents_augmented_path, index=False)

    data_output_dir = os.path.abspath('/ravens_volume/test_data')
    os.makedirs(data_output_dir, exist_ok=True)

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[incidents_augmented_path],
        about={
            'datasetName': 'TR104_Police_Incidents',
        },
        problem={
            'targets': 'Type of Incident',
            'taskType': 'classification'
        }
    )