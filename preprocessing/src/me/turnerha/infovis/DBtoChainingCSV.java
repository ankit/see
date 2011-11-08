package me.turnerha.infovis;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

import me.turnerha.infovis.data.Bicluster;
import me.turnerha.infovis.data.Dimension;
import me.turnerha.infovis.data.Link;

/**
 * Takes the current Database and spits it out in the MineVis CSV format
 * 
 * @author hamiltont
 * 
 */
public class DBtoChainingCSV {
	public static final boolean DEBUG = false;

	public DBtoChainingCSV() {

		try {
			// Build chain
			File chaining = new File("chaining.csv");
			FileWriter writer = new FileWriter(chaining);

			writer.write("Link Id, Link Type, Source Id, Source Row "
					+ "Type, Source Rows, Source Column Type, Source "
					+ "Columns, Destination Id, Destination Row Type, "
					+ "Destination Rows, Destination Column Type, Destination "
					+ "Columns\n");

			for (Bicluster cluster : Bicluster.getAllBiclusters()) {

				Dimension row = cluster.getRow(), col = cluster.getCol();

				System.out.println("I am " + cluster.getBiclusterId() + ": "
						+ row.getName() + " <> " + col.getName());

				for (Link link : cluster.getAllLinks()) {
					// if (link.isOverlapLink())
					// continue;

					if (link.getTarget() != cluster)
						System.err.println("WTF");

					// ID
					writer.write("" + link.getLinkId());
					writer.append(',');

					// Type
					writer.append(link.getType());
					writer.append(',');

					// Source ID
					writer.write("" + cluster.getBiclusterId());
					writer.append(',');

					// Row Type
					writer.write(row.getName());
					writer.append(",\"");

					// Row Values
					for (String val : row.getValues())
						writer.append(val).append(',');
					writer.write("\",");

					// Col Type
					writer.write(col.getName());
					writer.append(",\"");

					// Col Values
					for (String val : col.getValues())
						writer.append(val).append(',');
					writer.write("\",");

					Bicluster chd = link.getDestination();
					row = chd.getRow();
					col = chd.getCol();

					// Dest ID
					writer.write("" + chd.getBiclusterId());
					writer.append(',');

					// Dest Row Type
					writer.append(row.getName());
					writer.append(",\"");

					// Dest Row values
					for (String val : row.getValues())
						writer.append(val).append(',');
					writer.append("\",");

					// Dest Col type
					writer.append(col.getName());
					writer.append(",\"");

					// Dest Col Values
					for (String val : col.getValues())
						writer.write(val + ",");
					writer.write("\"");

					// Final endline
					writer.write("\n");

					if (DEBUG) {
						System.out.println("\tConnected with "
								+ chd.getBiclusterId() + ": " + row.getName()
								+ " <> " + col.getName() + " by "
								+ link.getType());

						List<String> clusterRow = cluster.getRow().getValues();
						List<String> clusterCol = cluster.getCol().getValues();
						List<String> rowValues = row.getValues();
						List<String> colValues = col.getValues();
						int max = 0;
						if (clusterCol.size() > max)
							max = clusterCol.size();
						if (clusterRow.size() > max)
							max = clusterRow.size();
						if (rowValues.size() > max)
							max = rowValues.size();
						if (colValues.size() > max)
							max = colValues.size();

						for (int i = 0; i < max; i++) {
							String crow = "", ccol = "", lrow = "", lcol = "";
							if (i < clusterRow.size())
								crow = clusterRow.get(i);
							if (i < clusterCol.size())
								ccol = clusterCol.get(i);
							if (i < rowValues.size())
								lrow = rowValues.get(i);
							if (i < colValues.size())
								lcol = colValues.get(i);

							System.out.printf(
									"\t\t%-15s >< %-15s | %-15s >< %-15s\n",
									crow, ccol, lrow, lcol);
						}
					}
				}

			}

			// Final endline
			writer.write("\n");
			writer.close();

		} catch (IOException e) {
			e.printStackTrace();
		}

	}

	public static void main(String[] args) {
		new DBtoChainingCSV();
	}

}
