package me.turnerha.infovis;

import java.util.List;

import me.turnerha.infovis.data.Bicluster;
import me.turnerha.infovis.data.Link;

public class Coeffs {

	/**
	 * @param args
	 */
	public static void main(String[] args) {
		List<Bicluster> bc = Bicluster.getAllBiclusters();

		for (Bicluster cl : bc) {
			System.out.println("I am " + cl.getCol().getName() + " >< "
					+ cl.getRow().getName());

			for (Link l : cl.getAllLinks()) {
				if (l.isOverlapLink())
					continue;

				System.out.println("\t" + l.getDestination().getCol().getName()
						+ " >< " + l.getDestination().getRow().getName()
						+ " : " + l.getCoeff());
			}
		}

	}
}
