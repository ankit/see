package me.turnerha.infovis;

import java.io.File;
import java.io.PrintWriter;
import java.util.Collection;
import java.util.Collections;

import me.turnerha.infovis.data.Bicluster;
import me.turnerha.infovis.data.Link;
import edu.uci.ics.jung.algorithms.importance.BetweennessCentrality;
import edu.uci.ics.jung.graph.UndirectedSparseGraph;
import edu.uci.ics.jung.graph.util.EdgeType;

/**
 * Spits out the mining.csv file, plus the ' Importance' column, which scales
 * from [0..1] -- the max and min are always 0 and 1.
 * 
 * @author hamiltont
 * 
 */
public class DBtoMiningCSV {

	public static void main(String[] args) {
		long start = System.currentTimeMillis();
		UndirectedSparseGraph<Integer, Integer> graph = new UndirectedSparseGraph<Integer, Integer>();

		int linkID = 0;
		for (Bicluster bc : Bicluster.getAllBiclusters()) {
			graph.addVertex(bc.getBiclusterId());
			for (Link link : bc.getAllLinks()) {
				graph
						.addEdge(linkID++, link.getTarget().getBiclusterId(),
								link.getDestination().getBiclusterId(),
								EdgeType.UNDIRECTED);
			}
		}

		long create = System.currentTimeMillis() - start;
		start = System.currentTimeMillis();

		BetweennessCentrality<Integer, Integer> centrality = new BetweennessCentrality<Integer, Integer>(
				graph);

		// bc.printRankings(false, true);
		centrality.setRemoveRankScoresOnFinalize(false);
		centrality.evaluate();

		// for (Bicluster c : Bicluster.getAllBiclusters())
		// System.out.println("BetweennessCentrality for\t"
		// + c.getBiclusterId() + "\t"
		// + bc.getVertexRankScore(c.getBiclusterId()));

		final double N = Bicluster.getAllBiclusters().size();
		final double scaleFactor = (N - 1) * (N - 2) / 2.0;

		Collection<Number> values = centrality.getVertexRankScores(
				"centrality.BetweennessCentrality").values();
		Collection<Double> v2 = (Collection) values;
		final double min = Collections.min(v2) / scaleFactor;
		final double max = Collections.max(v2) / scaleFactor;

		try {
			PrintWriter writer = new PrintWriter(new File("mining.csv"));
			writer.println("BiCluster Id, Row Type, Array of Rows, "
					+ "Column Type, Array of Columns, Importance");

			for (Bicluster c : Bicluster.getAllBiclusters()) {
				// ID
				writer.print(c.getBiclusterId());
				writer.append(',');

				// Row info
				writer.append(c.getRow().getName());
				writer.append(",\"");
				for (String val : c.getRow().getValues())
					writer.append(val).append(',');
				writer.append("\",");

				// Col info
				writer.append(c.getCol().getName());
				writer.append(",\"");
				for (String val : c.getCol().getValues())
					writer.append(val).append(',');
				writer.append("\",");

				// Importance
				double score = centrality
						.getVertexRankScore(c.getBiclusterId());
				score = score / scaleFactor;

				// We also want to normalize the values so that the min is
				// *always* 0 and the max is *always* one. Luckily this is
				// always a scale up operation, so we don't lose any precision
				// Math from
				// http://stackoverflow.com/questions/5294955/how-to-scale-down-a-range-of-numbers-with-a-known-min-and-max-value
				double normalized = (score - min) / (max - min);

				writer.printf("%.20f\n", normalized);
				System.out.printf("%.20f,", normalized);
			}

			writer.flush();
			writer.close();
		} catch (Exception e) {
			e.printStackTrace();
		}

		// System.out.println("Creating graph took " + create);
		// System.out.println("Solving and Storing graph took "
		// + (System.currentTimeMillis() - start));

	}

}
