import json
import os

import geopandas
import matplotlib.pyplot as plt
import requests

OUTPUT_DIR = "/Users/michael/TwoRavens/tworaven_apps/eventdata_queries"
ZIP_GEOJSON = "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/tx_texas_zip_codes_geo.min.json"

shapefiles = {
    "Dallas_City_Limits": "https://gis.dallascityhall.com/resources/zip/Citylimit.zip",

    ## disabled because Line strings
    ## "Dallas_Streets": "https://gis.dallascityhall.com/resources/zip/STREETS.zip",

    ## disabled because too granular
    ## "Dallas_Tax_Parcels": "https://gis.dallascityhall.com/resources/zip/tax_appraisal/Parcel.zip",

    "Dallas_Current_Council_Districts": "https://gis.dallascityhall.com/resources/zip/Councils.zip",

    ## disabled because only covers water bodies
    ## "Dallas_Hydrologic": "https://gis.dallascityhall.com/resources/zip/planimetric/HydroImp.zip",

    ## disabled because not disjoint - Neighborhood assoc., homeowner assoc. and neighborhood coalitions
    ## "Dallas_Neighborhoods": "https://gis.dallascityhall.com/resources/zip/pud_public/COD_Organizations.zip",

    # "Dallas_Parks": "https://gis.dallascityhall.com/Downloads/ShpZip/Parks/Parks.zip",
    # "Dallas_Library_Service_Areas": "https://gis.dallascityhall.com/Downloads/ShpZip/Library/LibraryServiceAreas.zip",
    # "Dallas_Neighborhood_Typologies": "https://gis.dallascityhall.com/resources/zip/oca_public/CulturalNeighborhoodTypologies.zip",

    ## disabled because missing id column
    ## "Dallas_Airport_Noise_Contours": "https://gis.dallascityhall.com/resources/zip/sdc_public/Airport_Noise_Contours.zip",
    ## disabled because missing id column
    ## "Dallas_Alcohol_Free_Buffers": "https://gis.dallascityhall.com/resources/zip/sdc_public/Alcohol_Free_Buffers.zip",

    ## disabled because this is probably not useful?
    ## "Dallas_Flood_Plain": "https://gis.dallascityhall.com/resources/zip/sdc_public/CurrentFloodPlain.zip",

    ## disabled because these are points
    ## "Dallas_Fire_Stations": "https://gis.dallascityhall.com/Downloads/ShpZip/fire/firestn.zip",

    "Dallas_Targeted_Area_Action_Grids": "https://gis.dallascityhall.com/Downloads/ShpZip/police/TAAG.zip",
}

id_name = {
    # "Dallas_Neighborhood_Typologies": "GEOID",
    "Dallas_City_Limits": "CITY",
    "Dallas_Current_Council_Districts": "COUNCIL",
    # "Dallas_Parks": "ParkID",
    # "Dallas_Library_Service_Areas": "LibDist",
    "Dallas_Targeted_Area_Action_Grids": "TAAG_Name",
    # "Texas_Zip_Codes": "ZCTA5CE10"
}


def prepare_maps(name, path):
    print('processing', name)
    geojson_path = os.path.join(OUTPUT_DIR, "geojson", f"{id_name[name]}.json")
    data = geopandas.read_file(path)
    data = data.set_crs(epsg=2276).to_crs(epsg=4326)
    # 1" degrees
    data["geometry"] = data.geometry.simplify(tolerance=360 / 43200 / 30, preserve_topology=True)
    data.plot()
    plt.title(name)
    plt.show()

    data.to_file(geojson_path, driver='GeoJSON')


def prepare_alignments(name):
    geojson_path = os.path.join(OUTPUT_DIR, "geojson", f"{name}.json")
    alignment_path = os.path.join(OUTPUT_DIR, "alignments", f"{name}.json")

    with open(geojson_path, 'r') as geojson_file:
        geojson = json.load(geojson_file)

    alignment = []
    for feature in geojson['features']:
        alignment.append({id_name[name]: feature['properties'][id_name[name]]})

    with open(alignment_path, 'w') as alignment_file:
        json.dump(alignment, alignment_file, indent=4)


def download_zip_geojson():
    geojson_path = os.path.join(OUTPUT_DIR, "geojson", f"Texas_Zip_Codes.json")
    with open(geojson_path, 'w') as geojson_file:
        geojson_file.write(requests.get(ZIP_GEOJSON).text)


if __name__ == '__main__':
    # download_zip_geojson()
    #
    # for name, url in shapefiles.items():
    #     prepare_maps(name, url)
    #
    # for name in id_name:
    #     prepare_alignments(name)
    pass
