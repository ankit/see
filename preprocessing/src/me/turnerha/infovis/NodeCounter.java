package me.turnerha.infovis;

import java.util.List;

import me.turnerha.infovis.data.Bicluster;

public class NodeCounter {

	public static void main(String[] args) {
		List<Bicluster> bc = Bicluster.getAllBiclusters();

		for (Bicluster cl : bc) {

			System.out.println("I am "
					+ cl.getBiclusterId()
					+ ". I have "
					+ (cl.getConnectedBiclusters().size() + +cl
							.getOverlappedBiclusters().size()));

		}
	}
}
