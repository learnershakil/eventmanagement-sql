import sql from "mssql";
import {
  MSSQL_USER,
  MSSQL_PASS,
  MSSQL_IP,
  MSSQL_PORT,
  MSSQL_DBNAME,
} from "../ENV.js";

// Configuration object for the SQL Server connection
const config = {
  user: MSSQL_USER,
  password: MSSQL_PASS,
  server: MSSQL_IP,
  port: Number(MSSQL_PORT),
  database: MSSQL_DBNAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Function to connect to the database
const connectToDatabase = async () => {
  try {
    // Establish the connection
    const pool = await sql.connect(config);
    console.log("Connected to SQL Server successfully!");

    // Example query
    const result = await pool.request().query("SELECT 1 AS number");
    console.log(result.recordset);

    // Close the connection
    return pool;
  } catch (err) {
    console.error("Database connection failed:", err);
  }
};

// Call the function to connect
const pool = await connectToDatabase();

const getRequest = async () => {
  try {
    await pool.connect();
    return pool.request();
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
};

const getRequestConnection = async () => {
  try {
    const poolConnection = await pool.connect();
    const transactionRequest = new sql.Request(poolConnection);
    return { request: transactionRequest, connection: poolConnection };
  } catch (err) {
    console.error("Error getting request object:", err);
    throw err;
  }
};


process.on("exit", () => {
  pool.close();
});

export { getRequest, getRequestConnection };
