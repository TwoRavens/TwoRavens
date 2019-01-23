# this script is to generate docs

import subprocess
import os
import shutil
import glob

# move all the markdown files into one place for editing

# this is the structure of the docs: make sure it is in order!
# page title, js paths, md path (only one allowed), output folder
groups = {
			"Two Ravens":		["./assets/app/*.js", 			"./README.md",						"doc_out/root_out"],	#this line be here (root of docs)
			"Event Data":		["./assets/app/eventdata/*.js",	"./docs/eventdata/eventdata.md",	"doc_out/eventdata_docs_out"],
			"D3M":				["./assets/app/empty.js",		"./docs/D3M.md",					"doc_out/D3M_out"],
			"Metadata Service":	["./assets/app/empty.js",		"./docs/metadata_service.md",		"doc_out/metadata_service_out"],
			"Architecture":		["./assets/app/empty.js",		"./docs/eventdata/architecture.md",	"doc_out/arch_docs_out"]
		}
# this specifies the order of pages in the navigation panel
order = ["Two Ravens", "Event Data", "D3M", "Metadata Service", "Architecture"]

# perform cleanup of old doc files
for gr in groups:
	print("removing", groups[gr][-1])
	try: shutil.rmtree(groups[gr][-1])
	except OSError: pass

# perform doc gen
for gr in groups:
	print("generating docs for", gr)
	#~ subprocess.run(["mkdir", groups[gr][-1]])
	#~ subprocess.run(["jsdoc", "-d", groups[gr][-1]] + groups[gr][0:-1])
	subprocess.run(" ".join(["jsdoc", "-d", groups[gr][-1]] + groups[gr][0:-1]), shell=True)
	if gr == "Two Ravens":
		# edit the page titles
		subprocess.run("sed -i -E".split() + ['s/<title>JSDoc: Home<\/title>/<title>' + gr + '<\/title>/g', groups[gr][-1] + "/index.html"])
		# edit the page header title
		subprocess.run("sed -i -E".split() + ['s/<h1 class=\"page-title\">Home<\/h1>/<h1 class=\"page-title\">' + gr + '<\/h1>/g', groups[gr][-1] + "/index.html"])
		# edit the navigation pane
		navStr = "<h2><a href=\"index.html\">Home<\/a><\/h2>"
		for navGr in order:
			if navGr == gr:
				continue
			navStr += "<h2><a href=\"" + groups[navGr][-1].replace("/", "\/") + "\/index.html\">" + navGr + "<\/a><\/h2>"
		subprocess.run("sed -i -E".split() + ['s/<h2><a href=\"index.html\">Home<\/a><\/h2>/' + navStr + '/g', groups[gr][-1] + "/index.html"])
	else:
		subprocess.run("sed -i -E".split() + ['s/<title>JSDoc: Home<\/title>/<title>Two Ravens: ' + gr + '<\/title>/g', groups[gr][-1] + "/index.html"])
		subprocess.run("sed -i -E".split() + ['s/<h1 class=\"page-title\">Home<\/h1>/<h1 class=\"page-title\">Two Ravens: ' + gr + '<\/h1>/g', groups[gr][-1] + "/index.html"])
		#~ navStr = "<h2><a href=\"..\/" + groups["Two Ravens"][-1] + "\/index.html\">Home<\/a><\/h2>"
		navStr = ""
		for navGr in order:
			depth = len(groups[navGr][-1].split("/"))
			backStr = ""
			for x in range(depth):
				backStr += "..\/"
			if navGr == gr:
				navStr += "<h2><a href=\"index.html\">" + navGr + "<\/a><\/h2>"
			elif navGr == "Two Ravens":
				navStr += "<h2><a href=\"" + backStr +"\/index.html\">Home<\/a><\/h2>"
			else:
				navStr += "<h2><a href=\"" + backStr + groups[navGr][-1].replace("/", "\/") + "\/index.html\">" + navGr + "<\/a><\/h2>"
		subprocess.run("sed -i -E".split() + ['s/<h2><a href=\"index.html\">Home<\/a><\/h2>/' + navStr + '/g', groups[gr][-1] + "/index.html"])

print("removing old root docs")
try:
	shutil.rmtree("fonts")
	shutil.rmtree("scripts")
	shutil.rmtree("styles")
except OSError: pass
for f in glob.glob("*.html"):
	try: os.remove(f)
	except OSError: pass
print("all old files removed")

# copy from root doc output to base dir
print("moving new files")
for f in glob.glob(groups["Two Ravens"][-1] + "/*"):
	print(f)
	fName = "./" + f.split("/")[-1]
	if os.path.isdir(f):
		shutil.copytree(f, fName)
	else:
		shutil.copy(f, fName)

print("done")
