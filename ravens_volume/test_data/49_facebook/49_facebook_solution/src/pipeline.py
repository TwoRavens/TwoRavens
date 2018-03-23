import os, sys, json, subprocess, time, threading
import pandas as pd 
from d3mds import D3MDataset, D3MProblem, D3MDS
import networkx as nx
from sklearn.metrics import accuracy_score

here = os.path.dirname(os.path.abspath(__file__))
dspath = os.path.join(here, '..', '..', '49_facebook_dataset')
prpath = os.path.join(here, '..', '..', '49_facebook_problem')
solpath = os.path.join(here, '..')
graphpath = os.path.join(dspath, 'graphs')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

def run_subProcess(cmd):
	# print(cmd)
	p = subprocess.Popen(cmd, stdout=subprocess.PIPE, shell=True)
	out, err = p.communicate() 
	result = out.decode("utf-8").split('\n')
	for lin in result:
		if not lin.startswith('#'):
			print(lin)
	return out

class Spinner:
	busy = False
	delay = 0.1

	@staticmethod
	def spinning_cursor():
		while 1: 
			for cursor in '|/-\\': yield cursor

	def __init__(self, delay=None):
		self.spinner_generator = self.spinning_cursor()
		if delay and float(delay): self.delay = delay

	def spinner_task(self):
		while self.busy:
			sys.stdout.write(next(self.spinner_generator))
			sys.stdout.flush()
			time.sleep(self.delay)
			sys.stdout.write('\b')
			sys.stdout.flush()

	def start(self):
		self.busy = True
		threading.Thread(target=self.spinner_task).start()

	def stop(self):
		self.busy = False
		time.sleep(self.delay)

def create_map_between_nodeID_nodeIindex(G):
	map = {}
	for nodeIndex, node in G.nodes(data=True):
		map[node['nodeID']] = nodeIndex
	return map

def convert_graphs():
	G1 = nx.read_gml(os.path.join(graphpath, 'G1.gml'))
	nx.write_edgelist(G1, os.path.join(here, 'G1.tab'),  delimiter='\t', data=False)

	G2 = nx.read_gml(os.path.join(graphpath, 'G2.gml'))
	nx.write_edgelist(G2, os.path.join(here, 'G2.tab'),  delimiter='\t', data=False)

def run_graph_align():
	os.chdir(here)
	cmd = './NETAL G1.tab G2.tab -a 0 -b 0 -c 1 -i 10'
	spinner = Spinner()
	spinner.start()
	run_subProcess(cmd)
	spinner.stop()
	os.chdir(solpath)

def string_to_int(x):
	try:
		return int(float(x))
	except:
		return x


def get_solution_map(solutionFile):
	pdf = pd.read_csv(os.path.join(here, solutionFile), sep='->', header=None)
	pdf[0]=pdf[0].apply(str)
	pdf[0]=pdf[0].apply(str.strip)
	pdf[0]=pdf[0].apply(string_to_int)

	pdf[1]=pdf[1].apply(str)
	pdf[1]=pdf[1].apply(str.strip)
	pdf[1]=pdf[1].apply(string_to_int)

	pdf0 = pdf[0].values.tolist()
	pdf1 = pdf[1].values.tolist()
	d = dict(zip(pdf0, pdf1))
	solutionMap = dict(zip(pdf1, pdf0))
	return solutionMap


if __name__ == '__main__':
	try:
		pd.read_csv(os.path.join(here, 'G1.tab'))
	except:
		convert_graphs()

	solutionFile = '(G1.tab-G2.tab)-a0-b0-c1-i10.alignment'

	run_graph_align()

	solutionMap = get_solution_map(solutionFile)
	# print(solutionMap)


	testData = d3mds.get_test_data()

	# convert nodeIDs in testData to nodeIndexs
	G1 = nx.read_gml(os.path.join(graphpath, 'G1.gml'))
	g1_nodeIndex_map = create_map_between_nodeID_nodeIindex(G1)
	# print(g1_nodeIndex_map)

	G2 = nx.read_gml(os.path.join(graphpath, 'G2.gml'))
	g2_nodeIndex_map = create_map_between_nodeID_nodeIindex(G2)
	# print(g2_nodeIndex_map)

	matchCol = []
	for row in testData.iterrows():
		node1 = row[1]['G1.nodeID']
		node1_index = g1_nodeIndex_map[node1]

		node2 = row[1]['G2.nodeID']
		node2_index = g2_nodeIndex_map[node2]

		if node1_index not in solutionMap:
			matchCol.append(0)
		else:
			node2_tilde = solutionMap[node1_index]

			# print(node2_index, node2_tilde, type(node2_index), type(node2_tilde))
			
			if node2_index == node2_tilde:
				matchCol.append(1)
			else:
				matchCol.append(0)
	
	testData['match'] = matchCol

	testData.pop('G1.nodeID')
	testData.pop('G2.nodeID')
	testData.to_csv('predictions.csv')

	y_pred = matchCol

	try:
		y_truth =  d3mds.get_test_targets().ravel()
		accuracy = accuracy_score(y_truth, y_pred)
		print('accuracy on test data', accuracy)
		df = pd.DataFrame(columns=['metric', 'value'])
		df.loc[len(df)] = ['accuracy', accuracy]
		df.to_csv(os.path.join(solpath, 'scores.csv'))
	except:
		pass



		

	 




