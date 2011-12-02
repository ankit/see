

jig = open('AtlanticStorm.jig','r')
csv = open('atlanticstorm_documents.csv','w')

csv.write('id,text\n')

last_doc_id = -1

for line in jig:
	if "<docID>" in line:
		last_doc_id = line[11:-9].replace(',','%2C')
	if "<docText>" in line:
		csv.write(last_doc_id)
		csv.write(',')
		csv.write(line[13:-11].replace(',','%2C'))
		csv.write('\n')

csv.close()
jig.close()
