import geopandas
import matplotlib.pyplot as plt

data = geopandas.read_file("/Users/michael/Downloads/COD_Organizations.zip")
# data.set_crs(epsg=2276)

data = data.to_crs(epsg=4326)

data['COD_Organization'] = data['ASSO_NAME']
del data['ASSO_NAME']
data.to_file("/Users/michael/TwoRavens/tworaven_apps/eventdata_queries/geojson/COD_Organization.json", driver='GeoJSON')
print(data)
data.plot()
plt.show()
#
# transform(cod_proj, latlon_proj, 2491391.27513282,6976920.22628063)