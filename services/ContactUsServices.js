import sql from "mssql";
import { getRequest } from "../config/sql.js";
import { validateFields } from "../helpers/validators.js";
import { CREATED, NOT_FOUND, OK } from "../helpers/commonErrors.js";

const createContactUs = async (data) => {
  const { fullname, phone, email, designation } = data;
  try {
    validateFields([
      { field: fullname, message: "fullname" },
      { field: phone, message: "phone" },
      { field: email, message: "email" },
      { field: designation, message: "designation" },
    ]);
    const request = await getRequest();
    const result = await request
      .input("fullname", sql.VarChar, fullname)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("designation", sql.VarChar, designation).query(`
        INSERT INTO ContactUs (fullname, phone, email, designation)
        OUTPUT INSERTED.* 
        VALUES (@fullname, @phone, @email, @designation);
      `);
    return CREATED("Contact Created", result.recordset[0]);
  } catch (error) {
    console.error("Error creating contact:", error.message);
    return INTERNAL_SERVER_ERROR("Error creating contact:", error.message);
  }
};

const getAllContactUs = async () => {
  try {
    const request = await getRequest();
    const result = await request.query(
      "SELECT * FROM ContactUs WHERE isDeleted = 0"
    );
    return OK("Contacts Fetched", result.recordset);
  } catch (error) {
    console.error("Error creating contact:", error.message);
    return INTERNAL_SERVER_ERROR("Error creating contact:", error.message);
  }
};

const updateContactUs = async (data) => {
  const { id, fullname, phone, email, designation } = data;
  try {
    validateFields([
      { field: fullname, message: "fullname" },
      { field: phone, message: "phone" },
      { field: email, message: "email" },
      { field: designation, message: "designation" },
    ]);
    const request = await getRequest();

    const existingContactResult = await request
      .input("id", sql.Int, id)
      .query("SELECT * FROM ContactUs WHERE id = @id");

    // Check if the contact exists before attempting to update
    if (existingContactResult.recordset.length === 0) {
      return NOT_FOUND("Contact not found");
    }

    const updateResult = await request
      .input("fullname", sql.VarChar, fullname)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("designation", sql.VarChar, designation).query(`
        UPDATE ContactUs 
        SET fullname = @fullname, phone = @phone, email = @email, 
            designation = @designation
        OUTPUT INSERTED.*
        WHERE id = @id;
      `);

    return OK("Contact Updated", updateResult.recordset[0]);
  } catch (error) {
    console.error("Error creating contact:", error.message);
    return INTERNAL_SERVER_ERROR("Error creating contact:", error.message);
  }
};

const deleteContactUs = async (Id) => {
  const id = Number(Id);
  if (typeof id !== "number" || isNaN(id)) {
    return BAD_REQUEST("Invalid user ID.");
  }
  try {
    const request = await getRequest();
    const deleteResult = await request.input("id", sql.Int, id).query(`
        UPDATE ContactUs 
        SET isDeleted = 1 
        OUTPUT INSERTED.* -- Or DELETE FROM ContactUs WHERE id = @id if you're actually deleting the row
        WHERE id = @id;
      `);
    return OK("Contact Deleted", deleteResult.recordset[0]);
  } catch (error) {
    console.error("Error creating contact:", error.message);
    return INTERNAL_SERVER_ERROR("Error creating contact:", error.message);
  }
};

const ContactUsService = {
  createContactUs,
  getAllContactUs,
  updateContactUs,
  deleteContactUs,
};

export default ContactUsService;
