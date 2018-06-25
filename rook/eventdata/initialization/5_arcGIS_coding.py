# run the following from the arcGIS desktop application on Windows to generate an event layer
# modify paths as needed. Since arcGIS is windows only, transfer the locations_*.csv files over

import arcpy
from arcpy import env
import os
arcpy.env.workspace = "c:/data"

# FOR PLACE DATA
# 0. Install and run arcGIS pro: http://pro.arcgis.com/en/pro-app/get-started/install-and-sign-in-to-arcgis-pro.htm
# 1. create a new TwoRavens arcGIS project. This will create TwoRavens.gdb, where data is stored.
# 2. From the top ribbon, go to Analysis > Tools, this will open a new tab on the right.
# 3. Geocoding Tools > Geocode Addresses, provide the input table icews_filtered.csv and select the esri online geocoder, make sure the fields match up
# 4. after running, the data is located within TwoRavens.gdb under a 'File Geodatabase Feature Class' (you can't make this up)
# 5. save to json via the python console within arcGIS:
arcpy.FeaturesToJSON_conversion(os.path.join("TwoRavens.gdb","locations_icews_filtered_GeocodeAddresse"),"icews_coded.json")
arcpy.FeaturesToJSON_conversion(os.path.join("TwoRavens.gdb","locations_acled_filtered_GeocodeAddresse"),"acled_coded.json")

# FOR COORDINATE DATA
# use the python console within arcGIS:
location_path = r"C:/Users/mike/Documents/locations/locations_cline_filtered.csv"
x_coords = "Longitude"
y_coords = "Latitude"
out_Layer = "Cline_xy_layer"
saved_Layer = r"C:/data/Cline_xy.lyr"
spRef = arcpy.SpatialReference("WGS 1984")
arcpy.MakeXYEventLayer_management(location_path, x_coords, y_coords, out_Layer, spRef)
arcpy.SaveToLayerFile_management(out_Layer, saved_Layer)