midiPath = "/home/marcus/Documents/TwoRavens_Su17/Datasets/MID/Incident-level/MIDI_4.01.csv"
midipPath = "/home/marcus/Documents/TwoRavens_Su17/Datasets/MID/Incident-level/MIDIP_4.01.csv"

masterPath = "/home/marcus/Documents/TwoRavens_Su17/Datasets/MID/Incident-level/MID_formated.tsv"	#chose output to be tsv so the actors will be a comma list

midiIn = open(midiPath, "r")
midipIn = open(midipPath, "r")
masterOut = open(masterPath, "w")

midiHeader = midiIn.readline().split(",")
midipHeader = midipIn.readline().split(",")

#~ print(midiHeader)
#~ print(midipHeader)

print (set(midiHeader) - set(midipHeader))
print (set(midipHeader) - set(midiHeader))

#output header to formated data
masterHeader = midiHeader
masterHeader.append("src_actors")
masterHeader.append("tgt_actors")
for seg in masterHeader:
	masterOut.write("\t".join(seg))
masterOut.write("\n")

for midiLine in midiIn:
	# read next few lines; peek to match event
	eventInfo = midiLine.split(",")
	curEvent = eventInfo[midiHeader.index("IncidNum3")]

	#~ if curEvent != "3551001":
		#~ break
	srcAdded = []
	tgtAdded = []
	while True:
		cur = midipIn.tell()
		splitEvent = midipIn.readline().split(",")
		event = splitEvent[midipHeader.index("IncidNum3")]
		if (event != curEvent):
			print str(event + " out")
			midipIn.seek(cur)
			break
		# now append actors
		if splitEvent[midipHeader.index("InSide A")] == "1":	#source
			srcAdded.append(splitEvent[midipHeader.index("StAbb")])
		else:												#target
			tgtAdded.append(splitEvent[midipHeader.index("StAbb")])		#store response?
	print curEvent
	print srcAdded
	print tgtAdded

	if len(srcAdded) == 0:
		break;
	#~ eventInfo.append(

midiIn.close()
midipIn.close()
masterOut.close()
