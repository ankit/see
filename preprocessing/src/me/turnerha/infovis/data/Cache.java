package me.turnerha.infovis.data;

import java.util.HashMap;

// TODO turn into singleton? 
public class Cache {
	private static HashMap<Integer, Bicluster> mCache = new HashMap<Integer, Bicluster>();
	
	private Cache() {}
	
	/**
	 * Either creates and returns the bicluster, or returns the cached copy
	 * 
	 * @param bicluster_id
	 */
	protected static Bicluster getBicluster(int bicluster_id) {
		Bicluster bc = mCache.get(new Integer(bicluster_id));
		if (bc == null) {
			bc = new Bicluster(bicluster_id);
			mCache.put(new Integer(bicluster_id), bc);
		}
		return bc;
	}
}
