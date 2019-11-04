import sys
import numpy as np
import pandas as pd


def write_data_splits_csv_file(learning_data_csv_file, data_splits_csv_file):
    ldf = pd.read_csv(learning_data_csv_file)
    num_instances = ldf.shape[0]
    
    test_inds = []
    for i, grp in enumerate(ldf.groupby(['cultivar', 'sitename'])):
        #print(i, grp)
        test_inds.extend(grp[1].tail()[-1:].d3mIndex.values)
    
    split_array = np.array(['TRAIN']*num_instances)  
    split_array[test_inds] = 'TEST'
    
    data_splits_df = ldf.copy()
    data_splits_df['type'] = split_array
    data_splits_df['fold']=[0]*len(ldf)
    data_splits_df['repeat']=[0]*len(ldf)
    data_splits_df = data_splits_df.drop(['cultivar', 'sitename', 'day', 'canopy_height'], axis=1)
    data_splits_df = data_splits_df.set_index('d3mIndex')
    
    data_splits_df.to_csv(data_splits_csv_file)

if __name__ == "__main__":
    write_data_splits_csv_file(sys.argv[1], sys.argv[2])
