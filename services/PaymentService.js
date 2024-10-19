import sql from "mssql";
import { getRequest } from "../config/sql.js";

// write a service to create a new payment into payments table with registrationId return patmentId
const createPayment = async (registrationId, amount) => {
  try {
    const request = await getRequest();
    const query = `
      INSERT INTO payments (registrationId, amount) 
      VALUES (@registrationId, @amount); 

      SELECT SCOPE_IDENTITY() AS paymentId;
    `;

    // Parameterize the query to prevent SQL injection
    request.input("registrationId", sql.Int, registrationId);
    request.input("amount", sql.Decimal(10, 2), amount);

    const result = await request.query(query);

    // Return the paymentId
    return result.recordset[0].paymentId;
  } catch (error) {
    console.error("Error creating payment:", error);
    return null;
  }
};

const PaymentServices = { createPayment };

export default PaymentServices;
