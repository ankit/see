

jig = open('AtlanticStorm.jig','r')
csv = open('AS_documents.csv','w')

last_doc_id = -1

for line in jig:
	if "<docID>" in line:
		last_doc_id = line[11:-9]
	if "<docText>" in line:
		csv.write(last_doc_id)
		csv.write(',')
		csv.write(line[13:-11])
		csv.write('\n')

csv.close()
jig.close()
