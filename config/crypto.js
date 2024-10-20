import { createHash } from "crypto";

const etagMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    let dataToHash;

    // Determine the type of body and prepare data for hashing
    if (typeof body === "string" || Buffer.isBuffer(body)) {
      dataToHash = body;
    } else if (typeof body === "object") {
      dataToHash = JSON.stringify(body);
    } else {
      dataToHash = String(body); // Convert to string for any other type
    }

    // Create ETag from the hash of the response body
    const etag = createHash("md5").update(dataToHash).digest("hex");
    res.setHeader("ETag", etag);

    // Check if the client has the latest version
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end(); // Not Modified
    }

    // Set caching headers
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Call the original send method to send the response
    originalSend.call(this, body);
  };

  next();
};

export default etagMiddleware;
