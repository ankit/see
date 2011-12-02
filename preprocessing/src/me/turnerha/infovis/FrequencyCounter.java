package me.turnerha.infovis;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.HashMap;

import me.turnerha.infovis.data.Bicluster;

public class FrequencyCounter {

	/**
	 * @param args
	 */
	public static void main(String[] args) {
		HashMap<String, Integer> counter = new HashMap<String, Integer>(500);

		for (Bicluster bc : Bicluster.getAllBiclusters()) {
			for (String s : bc.getRow().getValues())
				counter.put(s, counter.get(s) == null ? 1 : counter.get(s) + 1);
			for (String s : bc.getCol().getValues())
				counter.put(s, counter.get(s) == null ? 1 : counter.get(s) + 1);
		}

		try {
			FileWriter out = new FileWriter(new File(
					"element_frequency_data.csv"));
			
			out.write("\"key\",\"value\"\n");
			for (String key : counter.keySet()) {
				out.write("\"" + key + "\",\"");
				out.write("" + counter.get(key) + "\"\n");
			}
			
			out.flush();
			out.close();
		} catch (IOException e) {
			e.printStackTrace();
		}

	}
}
