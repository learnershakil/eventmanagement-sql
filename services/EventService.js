import sql from "mssql";
import { getRequest } from "../config/sql.js";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
} from "../helpers/commonErrors.js";
import FileServices from "./FileService.js";
import STATUSCODE from "../helpers/HttpStatusCodes.js";
import CommonQueries from "../commonQueries/findQueries.js";

const createEvent = async (eventData) => {
  try {
    // const { request, connection } = await getRequestConnection();
    // const transaction = new sql.Transaction(connection);
    // await transaction.begin();

    const request = await getRequest();

    try {
      // Inner try-catch for transaction rollback
      const {
        eventName,
        eventType,
        description,
        organiserName,

        location,
        // landmark,
        // city,
        // state,
        // country,

        eventDate,
        day,
        shift,
        category = 'sr',

        participants,
        // participants_min,
        // participants_max,

        registrationCharge,
        // registrationCharge_currency,
        // registrationCharge_amount,
        // registrationCharge_isMandatory,

        uplodedBy,

        avengerCharacter,
        ruleBook,
        structure,
        eligibilities,
        rules,
        photos,

        contacts,
      } = eventData;
      const { min, max } = participants;
      const { landmark, city, state, country } = location;
      const { currency, amount, isMandatory } = registrationCharge;

      // 1. Insert into Events table
      const eventInsertQuery = `
                INSERT INTO Events (eventName, eventType, description, organiserName, landmark, city, state, country, eventDate, day, shift, category, participants_min, participants_max, registrationCharge_currency, registrationCharge_amount, registrationCharge_isMandatory, uplodedBy, avengerCharacter, ruleBook)
                OUTPUT INSERTED.*
                VALUES (@eventName, @eventType, @description, @organiserName, @landmark, @city, @state, @country, @eventDate, @day, @shift, @category, @participants_min, @participants_max, @registrationCharge_currency, @registrationCharge_amount, @registrationCharge_isMandatory, @uplodedBy, @avengerCharacter, @ruleBook);
            `;

      // request input
      {
        request.input("eventName", sql.VarChar, eventName);
        request.input("eventType", sql.VarChar, eventType);
        request.input("description", sql.Text, description);
        request.input("organiserName", sql.VarChar, organiserName);
        request.input("landmark", sql.VarChar, landmark);
        request.input("city", sql.VarChar, city);
        request.input("state", sql.VarChar, state);
        request.input("country", sql.VarChar, country);
        request.input("eventDate", sql.DateTime2, eventDate);
        request.input("day", sql.Int, day);
        request.input("shift", sql.VarChar, shift);
        request.input("category", sql.VarChar, category);
        request.input("participants_min", sql.Int, min);
        request.input("participants_max", sql.Int, max);
        request.input("registrationCharge_currency", sql.VarChar, currency);
        request.input("registrationCharge_amount", sql.Decimal(10, 2), amount);
        request.input("registrationCharge_isMandatory", sql.Bit, isMandatory);
        request.input("uplodedBy", sql.Int, uplodedBy);
        request.input("avengerCharacter", sql.Int, avengerCharacter);
        request.input("ruleBook", sql.Int, ruleBook);
      }

      const result = await request.query(eventInsertQuery);
      const event = result.recordset[0];
      const eventId = event.id || event.Id;

      // Event sub tables
      {
        // Event_Structure
        if (structure && structure.length > 0) {
          for (const item of structure) {
            if (!item.trim() || item === "") continue;

            const newRequest = await getRequest();
            const query = `
                        INSERT INTO Event_Structure (event_id, structure)
                        VALUES (@eventId, @structure);
                    `;
            newRequest.input("eventId", sql.Int, eventId);
            newRequest.input("structure", sql.VarChar, item);
            await newRequest.query(query);
          }
        }

        // Event_Eligibilities
        if (eligibilities && eligibilities.length > 0) {
          for (const item of eligibilities) {
            if (!item.trim() || item === "") continue;

            const newRequest = await getRequest();
            const query = `
                        INSERT INTO Event_Eligibilities (event_id, eligibility)
                        VALUES (@eventId, @eligibility);
                    `;
            newRequest.input("eventId", sql.Int, eventId);
            newRequest.input("eligibility", sql.VarChar, item);
            await newRequest.query(query);
          }
        }

        // Event_Rules
        if (rules && rules.length > 0) {
          for (const item of rules) {
            if (!item.trim() || item === "") continue;

            const newRequest = await getRequest();
            const query = `
                        INSERT INTO Event_Rules ([event_id], [rule])
                        VALUES (@event_id, @rule);
                    `;
            newRequest.input("event_id", sql.Int, eventId);
            newRequest.input("rule", sql.Text, item);
            await newRequest.query(query);
          }
        }

        // Event_Photos
        const ids = [photos];
        if (ids && ids.length > 0) {
          for (const photoId of ids) {
            if (!photoId) continue;

            const newRequest = await getRequest();
            const query = `
                        INSERT INTO Event_Photos (event_id, photo_id)
                        VALUES (@eventId, @photoId);
                    `;
            newRequest.input("eventId", sql.Int, eventId);
            newRequest.input("photoId", sql.Int, photoId);
            await newRequest.query(query);
          }
        }

        // Event_Contacts
        if (contacts && contacts.length > 0) {
          for (const contact of contacts) {
            const newRequest = await getRequest();
            const query = `
                        INSERT INTO Event_Contacts (event_id, name, phone)
                        VALUES (@eventId, @name, @phone);
                    `;
            newRequest.input("eventId", sql.Int, eventId);
            newRequest.input("name", sql.VarChar, contact.name);
            newRequest.input("phone", sql.VarChar, contact.phone);
            await newRequest.query(query);
          }
        }
      }

      // update file till
      {
        FileServices.updateFileTill(photos, "EventPhotos");
        FileServices.updateFileTill(ruleBook, "RuleBook");
        FileServices.updateFileTill(avengerCharacter, "EventPhotos");
      }

      return OK("Event Created", event);
    } catch (error) {
      console.error("Error creating event (rolling back transaction):", error);
      return INTERNAL_SERVER_ERROR(
        "Error initiating transaction:" + error + "\n" + error.message
      );
    }
  } catch (error) {
    // Outer try-catch for connection or transaction initialization errors
    console.error("Error initiating transaction:", error);
    return INTERNAL_SERVER_ERROR(
      "Error initiating transaction:" + error + "\n" + error.message
    );
  }
};

const getAllEvents = async () => {
  try {
    const request = await getRequest();

    const query = `
            SELECT 
                e.*,
                s.structure,
                el.eligibility,
                r.[rule],
                c.name AS contactName, 
                c.phone AS contactPhone, 
                p.photo_id AS photo 
            FROM Events e
            LEFT JOIN Event_Structure s ON e.id = s.event_id
            LEFT JOIN Event_Eligibilities el ON e.id = el.event_id
            LEFT JOIN [Event_Rules] r ON e.id = r.event_id
            LEFT JOIN Event_Contacts c ON e.id = c.event_id
            LEFT JOIN [Event_Photos] p ON e.id = p.event_id
            WHERE e.isDeleted = 0;
        `;

    const result = await request.query(query);

    let brochure;

    {
      const brochureRequest = await getRequest();
      const brochureQuery = `SELECT * FROM Files WHERE [used] = @used`;
      brochureRequest.input("used", sql.VarChar(255), "Brochure");
      const brochureResult = await brochureRequest.query(brochureQuery);
      if (brochureResult.recordset && brochureResult.recordset.length > 0)
        brochure =
          brochureResult.recordset[0].id || brochureResult.recordset[0].Id;
    }

    const events = {};
    result.recordset.forEach((row) => {
      const eventId = row.id;

      if (!events[eventId]) {
        events[eventId] = {
          ...row,
          brochure,
          _id: eventId,
          location: {
            state: row.state,
            city: row.city,
            country: row.country,
            landmark: row.landmark,
          },
          registrationCharge: {
            amount: row.registrationCharge_amount,
            currency: row.registrationCharge_currency,
            isMandatory: row.registrationCharge_isMandatory,
          },
          participants: {
            min: row.participants_min,
            max: row.participants_max,
          },
          structure: [],
          eligibilities: [],
          rules: [],
          contacts: [],
          photos: [],
        };
      }

      if (row.structure && !events[eventId].structure.includes(row.structure)) {
        events[eventId].structure.push(row.structure);
      }
      if (
        row.eligibility &&
        !events[eventId].eligibilities.includes(row.eligibility)
      ) {
        events[eventId].eligibilities.push(row.eligibility);
      }
      if (row.rule && !events[eventId].rules.includes(row.rule)) {
        events[eventId].rules.push(row.rule);
      }
      if (row.photo && !events[eventId].photos.includes(row.photo)) {
        events[eventId].photos.push(row.photo);
      }
      if (row.contactName && row.contactPhone) {
        const contact = { name: row.contactName, phone: row.contactPhone };
        if (
          !events[eventId].contacts.some(
            (c) => c.name === contact.name && c.phone === contact.phone
          )
        ) {
          events[eventId].contacts.push(contact);
        }
      }
    });

    return OK("Events Fetched", Object.values(events));
  } catch (error) {
    console.error("Error getting all events:", error.message);
    INTERNAL_SERVER_ERROR("Error getting all events:" + error.message);
  }
};

const updateEvent = async (eventId, eventData) => {
  try {
    const result = await createEvent(eventData);
    if (!result.status) return result;

    CommonQueries.findAndDeleteById({
      id: eventId,
      tableName: "events",
      userId: eventData.uplodedBy,
    });

    return { ...result, message: "Update Event Successfull" };
  } catch (error) {
    console.error("Update event Failed: ", error.message);
    return INTERNAL_SERVER_ERROR("Update event Failed: " + error.message);
  }
};

const deleteEvent = async (eventId) => {
  try {
    const res = await getAllEvents();
    const data = res.data;

    const result = await CommonQueries.findAndDeleteById({
      id: eventId,
      tableName: "events",
    });

    data.forEach((event) => {
      if (event._id == eventId) {
        console.log(event);
        const photos = event.photos;
        const avengerCharacter = event.avengerCharacter;
        const ruleBook = event.ruleBook;

        photos.forEach((photo) => {
          FileServices.deleteFileById(photo);
        });
        FileServices.deleteFileById(avengerCharacter);
        FileServices.deleteFileById(ruleBook);
      }
    });

    return result;
  } catch (error) {
    console.error("Update event Failed: ", error.message);
    return INTERNAL_SERVER_ERROR("Update event Failed: " + error.message);
  }
};

const updateAccommodationPrice = async (Price) => {
  const price = Number(Price);
  if (isNaN(price)) {
    return BAD_REQUEST("Price should be number");
  }

  try {
    const result = await CommonQueries.findAll({
      tableName: "accommodations",
    });
    if (result.status) {
      const data = result.data;
      for (const d of data) {
        const prevPriceId = d.id || d.Id;
        CommonQueries.findAndDeleteById({
          id: prevPriceId,
          tableName: "accommodations",
        });
      }
    }

    const request = await getRequest();
    const query = `
      INSERT INTO accommodations (price) 
      OUTPUT INSERTED.* 
      VALUES (@price);
    `;

    request.input("price", sql.Decimal, price);
    const insertResult = await request.query(query);

    return OK("Price Created / Updated", insertResult.recordset[0]);
  } catch (error) {
    console.error("Update event Failed: ", error.message);
    return INTERNAL_SERVER_ERROR("Update event Failed: " + error.message);
  }
};

const getAccommodationPrice = async () => {
  try {
    const result = await CommonQueries.findAll({ tableName: "accommodations" });
    if (!result.status) {
      return NOT_FOUND("Accomodation Price Not Found");
    }

    const price = result.data[result.data.length - 1].price;
    return OK("Accomodation Price", price);
  } catch (error) {
    console.error("Accomodation Price fetch Failed: ", error.message);
    return INTERNAL_SERVER_ERROR(
      "Accomodation Price fetch Failed: " + error.message
    );
  }
};

const deleteBrochure = async () => {
  try {
    const brochureRequest = await getRequest();
    const brochureQuery = `SELECT * FROM Files WHERE [used] = @used`;
    brochureRequest.input("used", sql.VarChar(255), "Brochure");
    const brochureResult = await brochureRequest.query(brochureQuery);

    const brochures = brochureResult.recordset;
    for (const brochure of brochures) {
      let id = brochure.Id ? brochure.Id : brochure.id;
      if (id) {
        // Await the result of findAndDeleteById
        FileServices.deleteFileById(id);
      }
    }

    return OK("Brocher deleted", brochures);
  } catch (error) {
    console.error("Brocher deleted Failed: ", error.message);
    return INTERNAL_SERVER_ERROR("Brocher deleted Failed: " + error.message);
  }
};

// Example usage:
async function test() {
  try {
    const events = await getAllEvents();
    console.log(events);
  } catch (error) {
    console.error("Error in test function:", error);
  }
}

// test();

const EventServices = {
  createEvent,
  getAllEvents,
  updateEvent,
  deleteEvent,
  getAccommodationPrice,
  updateAccommodationPrice,
  deleteBrochure,
};

export default EventServices;
