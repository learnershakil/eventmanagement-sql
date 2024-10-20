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

let pool;

// Function to connect to the database
const connectToDatabase = async () => {
  try {
    // Establish the connection
    pool = await sql.connect(config);
    console.log("Connected to SQL Server successfully!");

    // Example query
    const result = await pool.request().query("SELECT 1 AS number");
    console.log(result.recordset);
  } catch (err) {
    console.error("Database connection failed:", err);
  }
};

// Call the function to connect
connectToDatabase();

const getRequest = async () => {
  if (!pool) {
    await connectToDatabase(); // Ensure the pool is connected
  }
  return pool.request();
};

const getRequestConnection = async () => {
  if (!pool) {
    await connectToDatabase(); // Ensure the pool is connected
  }
  return new sql.Request(pool);
};

// Close the pool on process exit
process.on("exit", () => {
  if (pool) {
    pool.close();
  }
});

export { getRequest, getRequestConnection, config };
