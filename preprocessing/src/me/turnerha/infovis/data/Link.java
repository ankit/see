package me.turnerha.infovis.data;

import java.util.ArrayList;

// TODO verify link e.g check if the type exists in both target and destination
public class Link {
	private Integer targetBicluster;
	private Integer destinationBicluster;
	private int chaining_link_id;
	private String type; // delete-able
	private double coeff = -1.0; // delete-able

	protected Link(Integer targetBicluster, Integer destinationBicluster,
			int chaining_link_id) {
		this.targetBicluster = targetBicluster;
		this.destinationBicluster = destinationBicluster;
		this.chaining_link_id = chaining_link_id;
	}

	public Bicluster getTarget() {
		return Cache.getBicluster(targetBicluster);
	}

	public Bicluster getDestination() {
		return Cache.getBicluster(destinationBicluster);
	}

	public int getLinkId() {
		return chaining_link_id;
	}

	public String getType() {
		if (type != null)
			return type;

		// Find Type ID
		String query = "SELECT chaining_link_type_id FROM " + DBUtils.SYMFONY
				+ ".chaining_link c WHERE c.id=" + chaining_link_id;
		int typeId = DBUtils.executeQueryForInt(query);

		// Find Type Name
		String nameQuery = "SELECT name FROM " + DBUtils.SYMFONY
				+ ".chaining_link_type c WHERE c.id=" + typeId;
		type = DBUtils.executeQueryForString(nameQuery);
		return type;
	}

	public boolean isOverlapLink() {
		Bicluster target = getTarget();
		Bicluster dest = getDestination();
		if (target.getRow().getName().equals(dest.getRow().getName())
				&& (target.getCol().getName().equals(dest.getCol().getName())))
			return true;
		return false;
	}

	/**
	 * Returns the jicard coeff for these two biclusters. Throws exception if
	 * these are overlapped, not connected
	 */
	public double getCoeff() {
		if (isOverlapLink())
			throw new IllegalStateException(
					"Coeff does not make sense on overlapped biclusters");

		if (coeff != -1.0)
			return coeff;

		Bicluster target = getTarget();
		Bicluster dest = getDestination();

		String link = getType();
		ArrayList<String> tValues = target.getDimension(link).getValues();
		ArrayList<String> dValues = dest.getDimension(link).getValues();

		double intersecton = 0;
		for (String s : tValues)
			if (dValues.contains(s))
				intersecton++;
		double union = tValues.size() + dValues.size() - intersecton;

		coeff = intersecton / union;
		return coeff;
	}

	public boolean isConnectionLink() {
		return !isOverlapLink();
	}
}
