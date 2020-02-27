import os
import subprocess
import pandas as pd

repository_url = "https://github.com/CSSEGISandData/COVID-19.git"
mongo_collection_name = "covid_19"
repository_dir = os.path.abspath('./COVID-19')
index_columns = ["Province/State", "Country/Region", "Last Update"]
count_columns = ["Confirmed", "Deaths", "Recovered"]

if not os.path.exists(repository_dir):
    subprocess.call(f"git clone {repository_url}", shell=True, cwd=".")
subprocess.call(f"git pull", shell=True, cwd=repository_dir)

data_dir = os.path.join(repository_dir, "csse_covid_19_data", "csse_covid_19_daily_reports")
time_series_confirmed_path = os.path.join(repository_dir, "csse_covid_19_data", "csse_covid_19_time_series", "time_series_19-covid-Confirmed.csv")

df_days_list = []
for day_filename in os.listdir(data_dir):
    if not day_filename.endswith('.csv'):
        continue

    df_day = pd.read_csv(os.path.join(data_dir, day_filename))
    df_day['Last Update'] = pd.to_datetime(day_filename.replace(".csv", ""))
    df_days_list.append(df_day)

df_corona = pd.concat(df_days_list)

# df_corona['Last Update'] = pd.to_datetime(df_corona['Last Update']).dt.floor("D")
df_corona['Province/State'].fillna("", inplace=True)

# print(df_corona['Last Update'])
df_corona.set_index(index_columns, inplace=True)
df_corona.sort_index(inplace=True)

# print(df_corona.loc[("", "Mainland China")])
# print(df_corona)

cross_sections = []
for index, cross_section in df_corona.groupby(index_columns[:2]):
    cross_sections.append(cross_section[count_columns] \
                          .diff().fillna(cross_section[count_columns]))

df_diffed = pd.concat(cross_sections)
df_diffed.sort_index(inplace=True)


df_diffed.reset_index(inplace=True)
df_melt = pd.melt(df_diffed,
                  id_vars=index_columns, var_name="Status",
                  value_vars=count_columns, value_name="Cases")

df_melt.dropna(inplace=True, subset=["Cases"])

df_melt["Cases"] = df_melt["Cases"].astype(int)
df_melt = df_melt[df_melt["Cases"] != 0]

df_melt.to_csv("./diffed_ncovid.csv", index=False)


df_lat_lon = pd.read_csv(time_series_confirmed_path)[["Province/State","Country/Region","Lat","Long"]]

lat_lon_map = {}
for idx, location in df_lat_lon.iterrows():
    lat_lon_map[(location['Province/State'] or "", location['Country/Region'])] = {
        "Lat": location["Lat"],
        "Long": location["Long"]
    }


from pymongo import MongoClient

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

if mongo_collection_name in db.collection_names():
    db[mongo_collection_name].drop()

for idx, row in df_melt.iterrows():
    row = dict(row)
    location_id = (row["Province/State"], row['Country/Region'])
    print(lat_lon_map.get(location_id))
    row.update(lat_lon_map.get(location_id, {
        "Lat": None,
        "Long": None
    }))
    db[mongo_collection_name].insert(row)
