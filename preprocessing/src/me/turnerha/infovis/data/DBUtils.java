package me.turnerha.infovis.data;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// TODO only allow most of these methods to be seen from Cache and Bicluster
public class DBUtils {

	// Use atlantic storm or crescent
	private static final boolean USE_CRESCENT = false;

	public static int MINING_ID = -1;
	public static int CHAINING_ID = -1;
	public static String SYMFONY = "";

	static {
		if (USE_CRESCENT) {
			MINING_ID = 2;
			CHAINING_ID = 2;
			SYMFONY = "symfony_crescent";
		} else {
			MINING_ID = 2;
			CHAINING_ID = 3;
			SYMFONY = "as_symfony";
		}
	}

	private static final boolean DEBUG = false;
	private static String dbUrl = "jdbc:mysql://localhost/?user=root&password=";
	private static Connection conn = null;

	private static void ensureConnection() {
		try {
			if (conn == null || conn.isClosed()) {
				Class.forName("com.mysql.jdbc.Driver").newInstance();
				conn = DriverManager.getConnection(dbUrl);
			}
		} catch (SQLException e) {
			e.printStackTrace();
		} catch (InstantiationException e) {
			e.printStackTrace();
		} catch (IllegalAccessException e) {
			e.printStackTrace();
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		}
	}

	public static void close() {
		if (conn != null)
			try {
				conn.close();
			} catch (SQLException e) {
				e.printStackTrace();
			}
	}

	protected static ResultSet executeQuery(String query) {
		ensureConnection();

		if (DEBUG)
			System.err.println("Executing " + query);

		Statement stmt;
		ResultSet result = null;
		try {
			stmt = conn.createStatement();
			result = stmt.executeQuery(query);
		} catch (SQLException e) {
			System.err.println("Query was " + query);
			e.printStackTrace();
		}

		return result;
	}

	protected static int executeQueryForInt(String query) {
		ResultSet rs = executeQuery(query);
		int result = -1;

		try {
			rs.first();
			result = rs.getInt(1);
			if (rs.next())
				throw new IllegalStateException(
						"Expected to only receive one result row!");

		} catch (SQLException e) {
			e.printStackTrace();
		}

		// if (DEBUG)
		// System.err.println("Returning " + result);
		return result;
	}

	protected static String executeQueryForString(String query) {
		ResultSet rs = executeQuery(query);
		String result = null;

		try {
			rs.first();
			result = rs.getString(1);
			if (rs.next())
				throw new IllegalStateException(
						"Expected to only receive one result row!");
		} catch (SQLException e) {
			e.printStackTrace();
		}

		// if (DEBUG)
		// System.err.println("Returning " + result);
		return result;
	}

	protected static List<Bicluster> listBiclusters() {
		return listBiclusters(-1);
	}

	// TODO have some offset parameters
	// Pass -1 for no limit
	protected static List<Bicluster> listBiclusters(int limit) {
		String query = "SELECT id FROM " + SYMFONY
				+ ".mining_bi_cluster WHERE mining_id=" + MINING_ID;
		if (limit != -1)
			query += " LIMIT " + limit;
		ResultSet rs = executeQuery(query);

		ArrayList<Bicluster> result = new ArrayList<Bicluster>(400);
		try {
			while (rs.next())
				result.add(Cache.getBicluster(rs.getInt(1)));
		} catch (SQLException e) {
			e.printStackTrace();
		}

		return result;
	}
}
