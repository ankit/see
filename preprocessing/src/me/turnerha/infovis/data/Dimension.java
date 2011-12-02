package me.turnerha.infovis.data;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;

public class Dimension {
	private String nameAndTable;
	private String idField;
	private String valueField;
	private boolean isRow;
	private ArrayList<String> values; // delete-able
	private Integer parentBicluster;

	// idField == the field in the table for this dimension
	// isRow == when looking for values, are we in the "row" or the "column"
	// table
	public Dimension(String name, String idField, String valueField,
			boolean isRow, Integer parentBicluster) {
		this.nameAndTable = name;
		this.idField = idField;
		this.valueField = valueField;
		this.isRow = isRow;
		this.parentBicluster = parentBicluster;
	}

	public String getName() {
		return nameAndTable;
	}

	@Override
	public String toString() {
		StringBuffer sb = new StringBuffer("{nameAndTable=");
		sb.append(nameAndTable).append(',').append("idField=").append(idField)
				.append(',').append("valueField=").append(valueField).append(
						',').append("isRow=").append(isRow).append(',').append(
						"values=").append(values).append('}');
		return sb.toString();
	}

	public ArrayList<String> getValues() {
		if (values != null)
			return values;

		String exDB = Cache.getBicluster(parentBicluster).getExternalDatabase();
		String idTable = isRow ? "mining_bi_cluster_row"
				: "mining_bi_cluster_col";
		String selection = isRow ? "row_id" : "col_id";

		// Grab the row ID's of all our values from mining_bi_cluster_row
		ResultSet rs = DBUtils.executeQuery("SELECT " + selection + " FROM "
				+ DBUtils.SYMFONY + "." + idTable + " WHERE bicluser_id="
				+ parentBicluster);

		StringBuffer idINlist = new StringBuffer();
		try {
			while (rs.next()) {
				idINlist.append(rs.getString(1));
				idINlist.append(',');
			}
		} catch (SQLException e) {
			e.printStackTrace();
		}
		idINlist.setLength(idINlist.length() - 1);

		// Grab the values from the original table
		String query = "SELECT " + valueField + " FROM " + exDB + "."
				+ nameAndTable + " WHERE " + idField + " IN ("
				+ idINlist.toString() + ")";

		rs = DBUtils.executeQuery(query);
		ArrayList<String> result = new ArrayList<String>(
				idINlist.length() / 2 + 10);
		try {
			while (rs.next())
				result.add(rs.getString(1));
		} catch (SQLException e) {
			e.printStackTrace();
		}

		values = result;

		return values;
	}

	public String getOriginalIDs() {
		String idTable = isRow ? "mining_bi_cluster_row"
				: "mining_bi_cluster_col";
		String selection = isRow ? "row_id" : "col_id";

		// Grab the row ID's of all our values from mining_bi_cluster_row
		ResultSet rs = DBUtils.executeQuery("SELECT " + selection + " FROM "
				+ DBUtils.SYMFONY + "." + idTable + " WHERE bicluser_id="
				+ parentBicluster);

		StringBuffer idINlist = new StringBuffer();
		try {
			while (rs.next()) {
				idINlist.append(rs.getString(1));
				idINlist.append(',');
			}
		} catch (SQLException e) {
			e.printStackTrace();
		}
		idINlist.setLength(idINlist.length() - 1);

		return idINlist.toString();
	}

}
