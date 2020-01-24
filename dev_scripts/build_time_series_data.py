import pandas as pd
import os

from dev_scripts.d3m_wrap_dataset import d3m_wrap_dataset

data_input_dir = os.path.abspath('./time_series_data/')
os.makedirs(data_input_dir, exist_ok=True)

data_output_dir = os.path.abspath('/ravens_volume/test_data')
os.makedirs(data_output_dir, exist_ok=True)

def build_shampoo():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'shampoo.csv')],
        about={
            'datasetName': 'TR_TS_shampoo',
            'sourceURI': 'https://machinelearningmastery.com/time-series-datasets-for-machine-learning/',
            'description': """This dataset describes the monthly number of sales of shampoo over a 3 year period.

The units are a sales count and there are 36 observations. The original dataset is credited to Makridakis, Wheelwright and Hyndman (1998)."""
        },
        problem={
            'targets': ["Sales"],
            'time': ['Month'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )

def build_temperatures():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'minimum_daily_temperatures.csv')],
        about={
            'datasetName': 'TR_TS_minimum_daily_temp',
            'sourceURI': 'https://machinelearningmastery.com/time-series-datasets-for-machine-learning/',
            'description': """This dataset describes the minimum daily temperatures over 10 years (1981-1990) in the city Melbourne, Australia.

The units are in degrees Celsius and there are 3650 observations. The source of the data is credited as the Australian Bureau of Meteorology."""
        },
        problem={
            'targets': ["Temp"],
            'time': ['Date'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )

def build_sunspots():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'sunspots.csv')],
        about={
            'datasetName': 'TR_TS_sunspots',
            'sourceURI': 'https://machinelearningmastery.com/time-series-datasets-for-machine-learning/',
            'description': """This dataset describes a monthly count of the number of observed sunspots for just over 230 years (1749-1983).

The units are a count and there are 2,820 observations. The source of the dataset is credited to Andrews & Herzberg (1985)."""
        },
        problem={
            'targets': ["Sunspots"],
            'time': ['Month'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )


def build_female_births():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'births.csv')],
        about={
            'datasetName': 'TR_TS_births',
            'sourceURI': 'https://machinelearningmastery.com/time-series-datasets-for-machine-learning/',
            'description': """This dataset describes the number of daily female births in California in 1959.

The units are a count and there are 365 observations. The source of the dataset is credited to Newton (1988)."""
        },
        problem={
            'targets': ["Births"],
            'time': ['Date'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )


def build_eeg_eye_state():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'eeg_eye_state.csv')],
        about={
            'datasetName': 'TR_TS_eeg_eye_state',
            'sourceURI': 'http://archive.ics.uci.edu/ml/datasets/EEG+Eye+State#',
            'description': """All data is from one continuous EEG measurement with the Emotiv EEG Neuroheadset. The duration of the measurement was 117 seconds. The eye state was detected via a camera during the EEG measurement and added later manually to the file after analysing the video frames. '1' indicates the eye-closed and '0' the eye-open state. All values are in chronological order with the first measured value at the top of the data."""
        },
        problem={
            'targets': ["eyeDetection"],
            'time': [],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['classification', 'timeSeries']
        }
    )

def build_occupancy_classification():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'occupancy.csv')],
        about={
            'datasetName': 'TR_TS_occupancy_classification',
            'sourceURI': 'http://archive.ics.uci.edu/ml/datasets/Occupancy+Detection+#',
            'description': """Experimental data used for binary classification (room occupancy) from Temperature,Humidity,Light and CO2. Ground-truth occupancy was obtained from time stamped pictures that were taken every minute."""
        },
        problem={
            'targets': ["Occupancy"],
            'time': ['Date'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['classification', 'timeSeries']
        }
    )

def build_occupancy_forecasting():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'occupancy.csv')],
        about={
            'datasetName': 'TR_TS_occupancy_forecasting',
            'sourceURI': 'http://archive.ics.uci.edu/ml/datasets/Occupancy+Detection+#',
            'description': """Experimental data used for binary classification (room occupancy) from Temperature,Humidity,Light and CO2. Ground-truth occupancy was obtained from time stamped pictures that were taken every minute."""
        },
        problem={
            'targets': ["Light"],
            'time': ['Date'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )

def build_order_demand():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'Daily_Demand_Forecasting_Orders.csv')],
        about={
            'datasetName': 'TR_TS_order_demand',
            'sourceURI': 'http://archive.ics.uci.edu/ml/datasets/Daily+Demand+Forecasting+Orders',
            'description': """The database was collected during 60 days, this is a real database of a Brazilian company of large logistics. Twelve predictive attributes and a target that is the total of orders for daily."""
        },
        problem={
            'targets': ["Target_(Total_orders)"],
            'time': ['Week of the month', 'Day of the week (Monday to Friday)'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )


def build_air_quality():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'AirQualityUCI.csv')],
        about={
            'datasetName': 'TR_TS_air_quality',
            'sourceURI': 'http://archive.ics.uci.edu/ml/datasets/Air+Quality',
            'description': """Contains the responses of a gas multisensor device deployed on the field in an Italian city. Hourly responses averages are recorded along with gas concentrations references from a certified analyzer. The dataset contains 9358 instances of hourly averaged responses from an array of 5 metal oxide chemical sensors embedded in an Air Quality Chemical Multisensor Device. The device was located on the field in a significantly polluted area, at road level,within an Italian city. Data were recorded from March 2004 to February 2005 (one year)representing the longest freely available recordings of on field deployed air quality chemical sensor devices responses. Ground Truth hourly averaged concentrations for CO, Non Metanic Hydrocarbons, Benzene, Total Nitrogen Oxides (NOx) and Nitrogen Dioxide (NO2) and were provided by a co-located reference certified analyzer. Evidences of cross-sensitivities as well as both concept and sensor drifts are present as described in De Vito et al., Sens. And Act. B, Vol. 129,2,2008 (citation required) eventually affecting sensors concentration estimation capabilities. Missing values are tagged with -200 value.""",
            'license': 'This dataset can be used exclusively for research purposes. Commercial purposes are fully excluded.'
        },
        problem={
            'targets': ["RH"],
            'time': ['Date', 'Time'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )


def build_appliance():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'energydata_complete.csv')],
        about={
            'datasetName': 'TR_TS_appliance',
            'sourceURI': 'http://archive.ics.uci.edu/ml/datasets/Appliances+energy+prediction',
            'description': """The data set is at 10 min for about 4.5 months. The house temperature and humidity conditions were monitored with a ZigBee wireless sensor network. Each wireless node transmitted the temperature and humidity conditions around 3.3 min. Then, the wireless data was averaged for 10 minutes periods. The energy data was logged every 10 minutes with m-bus energy meters. Weather from the nearest airport weather station (Chievres Airport, Belgium) was downloaded from a public data set from Reliable Prognosis (rp5.ru), and merged together with the experimental data sets using the date and time column. Two random variables have been included in the data set for testing the regression models and to filter out non predictive attributes (parameters).""",
        },
        problem={
            'targets': ["Appliances"],
            'time': ['date'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['forecasting', 'timeSeries']
        }
    )

# build_shampoo()
# build_temperatures()
# build_sunspots()
# build_female_births()
# build_eeg_eye_state()
build_occupancy_classification()
build_occupancy_forecasting()
# build_order_demand()
# build_appliance()


# busted
# build_air_quality()
