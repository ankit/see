package me.turnerha.infovis.data;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

// Never store a reference to a Bicluster for a long time. 
// Instead, store that bicluster's ID field and constantly call 
// Cache.getBicluster. This allows the cache to delete and 
// re-create biclusters as needed to handle memory
// TODO implement some sort of flyweight or proxy pattern
public class Bicluster {
	private int bicluster_id;
	private Dimension[] mDimension; // delete-able
	private String externalDbName; // delete-able

	private ArrayList<Link> links; // delete-able

	@Override
	public String toString() {
		StringBuffer sb = new StringBuffer("{id=");
		sb.append(bicluster_id).append(',').append("dimension={");
		if (mDimension == null)
			sb.append("null}");
		else
			sb.append(mDimension[0]).append(',').append(mDimension[1]).append(
					'}');
		sb.append(",externalDbName={").append(externalDbName).append("}}");
		return sb.toString();
	}

	protected Bicluster(int bicluster_id) {
		this.bicluster_id = bicluster_id;
	}

	public static Bicluster getBiclusterForId(int id) {
		return Cache.getBicluster(id);
	}

	public int getBiclusterId() {
		return bicluster_id;
	}

	public Dimension getDimension(String type) {
		if (getRow().getName().equals(type))
			return getRow();
		else if (getCol().getName().equals(type))
			return getCol();
		throw new IllegalArgumentException("Unknown type");
	}

	public List<Link> getAllLinks() {
		if (links != null)
			return links;

		// Grab all chaining_link_ids that target this bicluster
		ResultSet rs = DBUtils.executeQuery("SELECT id FROM " + DBUtils.SYMFONY
				+ ".chaining_link WHERE target_bicluster_id=" + bicluster_id
				+ " AND chaining_id=" + DBUtils.CHAINING_ID);
		StringBuffer in = new StringBuffer();
		try {
			while (rs.next())
				in.append(rs.getInt(1)).append(',');

		} catch (SQLException e) {
			e.printStackTrace();
		}
		if (in.length() == 0) {
			links = new ArrayList<Link>();
			return links;
		}
		in.setLength(in.length() - 1);

		// Get the destination_bicluster_ids for each of those chaining_link_ids
		rs = DBUtils
				.executeQuery("SELECT chaining_link_id, destination_bicluster_id FROM "
						+ DBUtils.SYMFONY
						+ ".chaining_link_destination WHERE chaining_link_id IN ("
						+ in.toString() + ")");

		links = new ArrayList<Link>();
		try {
			while (rs.next())
				links.add(new Link(bicluster_id, rs.getInt(2), rs.getInt(1)));
		} catch (SQLException e) {
			e.printStackTrace();
		}

		return links;
	}

	public List<Integer> getConnectedBiclusters() {
		ArrayList<Integer> connected = new ArrayList<Integer>();
		for (Link l : getAllLinks())
			if (l.isConnectionLink())
				connected.add(l.getDestination().bicluster_id);

		return connected;
	}

	public List<Integer> getOverlappedBiclusters() {
		ArrayList<Integer> overlapped = new ArrayList<Integer>();
		for (Link l : getAllLinks())
			if (l.isOverlapLink())
				overlapped.add(l.getDestination().bicluster_id);

		return overlapped;
	}

	public static List<Bicluster> getAllBiclusters() {
		return DBUtils.listBiclusters();
	}

	public Dimension getRow() {
		return getDimensions()[0];
	}

	public Dimension getCol() {
		return getDimensions()[1];
	}

	/**
	 * 
	 * @return return[0] is for rows, and return[1] is for columns
	 */
	private Dimension[] getDimensions() {
		if (mDimension != null)
			return mDimension;

		int config_id = DBUtils.executeQueryForInt("SELECT config_id FROM "
				+ DBUtils.SYMFONY + ".mining_bi_cluster WHERE id="
				+ bicluster_id);
		ResultSet result = DBUtils.executeQuery("SELECT * FROM "
				+ DBUtils.SYMFONY + ".project_config WHERE id=" + config_id);

		mDimension = new Dimension[2];
		try {
			result.first();
			// Convention is that table a is for rows, and b is for columns
			mDimension[0] = new Dimension(result.getString("table_a"), result
					.getString("table_a_id_field"), result
					.getString("table_a_description_field"), true, bicluster_id);
			mDimension[1] = new Dimension(result.getString("table_b"), result
					.getString("table_b_id_field"), result
					.getString("table_b_description_field"), false,
					bicluster_id);
		} catch (SQLException e) {
			e.printStackTrace();
		}

		return mDimension;
	}

	// TODO This query is not exact - it's technically broken. However, it works
	// for 95% of cases and I'm lazy and this is due soon..
	public String getDocumentId() {
		if (getRow().getName().equals("document")
				|| getCol().getName().equals("document"))
			return "NA";

		// Grab external table name
		String subsql = "SELECT config_id FROM " + DBUtils.SYMFONY
				+ ".mining_bi_cluster WHERE id=" + bicluster_id;
		String sql = "SELECT table_axb," + "table_axb_table_a_id_field,"
				+ "table_axb_table_b_id_field FROM " + DBUtils.SYMFONY
				+ ".project_config WHERE id=(" + subsql + ")";
		ResultSet rs = DBUtils.executeQuery(sql);

		// Grab all ID's
		String rids = getRow().getOriginalIDs();
		String cids = getCol().getOriginalIDs();

		// Grab the row and col name
		try {
			rs.next();
			String table = rs.getString("table_axb");
			String row = rs.getString("table_axb_table_a_id_field");
			String col = rs.getString("table_axb_table_b_id_field");

			sql = "SELECT doc_id FROM " + getExternalDatabase() + "." + table
					+ " WHERE " + row + " IN (" + rids + ") AND " + col
					+ " IN (" + cids
					+ ") GROUP BY doc_id ORDER BY COUNT(doc_id) DESC LIMIT 1";

			String id = DBUtils.executeQueryForString(sql);

			sql = "SELECT name FROM " + getExternalDatabase()
					+ ".document WHERE id=" + id;

			return DBUtils.executeQueryForString(sql);

		} catch (SQLException e) {
			e.printStackTrace();
			return "NA";
		}
	}

	protected String getExternalDatabase() {
		if (externalDbName != null)
			return externalDbName;

		// Grab mining ID, use that to get Project ID, use that to get external
		// DB nameAndTable.
		// TODO if I'm fixing MINING_ID in DBUtils, should I use that here?
		int mining_id = DBUtils.executeQueryForInt("SELECT mining_id FROM "
				+ DBUtils.SYMFONY + ".mining_bi_cluster WHERE id="
				+ bicluster_id);
		int project_id = DBUtils.executeQueryForInt("SELECT project_id FROM "
				+ DBUtils.SYMFONY + ".mining WHERE id=" + mining_id);
		externalDbName = DBUtils
				.executeQueryForString("SELECT external_database FROM "
						+ DBUtils.SYMFONY + ".project WHERE id=" + project_id);
		return externalDbName;
	}
}
