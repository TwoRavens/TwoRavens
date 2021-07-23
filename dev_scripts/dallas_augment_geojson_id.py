import os

import pandas as pd
import json

from geopandas.geodataframe import GeoDataFrame
from shapely.geometry import shape, Point
import geopandas
from dev_scripts.d3m_wrap_dataset import d3m_wrap_dataset


def find_feature(polygons, x_coord, y_coord):
    point = Point(x_coord, y_coord)
    for polygons_id, polygons_shape in polygons.items():
        if polygons_shape.contains(point):
            return polygons_id


def augment_geojson_id(data, geojson, x_name, y_name, id_name, augment_name):
    print('parsing polygons')
    polygons = {feature['properties'][id_name]: shape(feature['geometry']) for feature in geojson['features']}
    print('constructing augment column')
    data[augment_name] = data.apply(lambda row: find_feature(polygons, row[x_name], row[y_name]), axis=1)
    return data


if __name__ == "__main__":
    from dev_scripts.dallas_download_gis import id_name
    print('loading CSV')
    incidents = pd.read_csv('dallas/Police_Incidents.csv', usecols=[
        "Incident Number w/year", "Year of Incident", "Watch", "Call (911) Problem", "Type of Incident",
        "Type  Location", "Type of Property", "Division", "Date1 of Occurrence", "Date of Report",
        "Person Involvement Type", "Victim Type", "Victim Race", "Victim Ethnicity", "Victim Gender",
        "Victim Age", "Investigating Unit 2", "Offense Status", "Victim Condition", "Family Offense", "Hate Crime",
        "Gang Related Offense", "Drug Related Istevencident", "NIBRS Crime Category", "X Coordinate", "Y Cordinate",
        "Zip Code"
    ])
    # incidents = incidents.loc[incidents['Year of Incident'] == 2021]
    points = geopandas.points_from_xy(incidents['X Coordinate'], incidents['Y Cordinate'], crs=2276)
    points = GeoDataFrame(geometry=points).to_crs(4326)
    incidents['X Coordinate'] = [p.x for p in points.geometry]
    incidents['Y Coordinate'] = [p.y for p in points.geometry]
    del incidents['Y Cordinate']
    incidents['Zip Code'] = incidents['Zip Code'].astype(str)

    incidents.columns = incidents.columns.str.replace(' ', '_')

    for geojson_name in id_name:
        cod_organizations_path = f"/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/geojson/{id_name[geojson_name]}.json"
        print('loading geojson', geojson_name)
        cod_organizations = json.load(open(cod_organizations_path, 'r'))

        # print(incidents.columns.values)
        incidents = augment_geojson_id(
            data=incidents,
            geojson=cod_organizations,
            x_name="X_Coordinate",
            y_name="Y_Coordinate",
            id_name=id_name[geojson_name],
            augment_name=geojson_name)

    print('writing CSV')
    incidents_augmented_path = 'dallas/Police_Incidents_trimmed.csv'
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
            'targets': 'Type_of_Incident',
            'taskType': 'classification'
        }
    )

    incidents = incidents.loc[incidents['Year_of_Incident'] == 2021]
    incidents_reduced_path = 'dallas/Police_Incidents_reduced.csv'
    incidents.to_csv(incidents_reduced_path, index=False)

    data_output_dir = os.path.abspath('/ravens_volume/test_data')
    os.makedirs(data_output_dir, exist_ok=True)

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[incidents_reduced_path],
        about={
            'datasetName': 'TR104_reduced_Police_Incidents',
        },
        problem={
            'targets': 'Type_of_Incident',
            'taskType': 'classification'
        }
    )