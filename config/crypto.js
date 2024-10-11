import { createHash } from "crypto";

const etagMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = (body) => {
    let dataToHash;

    if (typeof body === "string") {
      dataToHash = body;
    } else if (Buffer.isBuffer(body)) {
      dataToHash = body;
    } else if (typeof body === "object") {
      dataToHash = JSON.stringify(body);
    } else {
      dataToHash = body.toString();
    }

    const etag = createHash("md5").update(dataToHash).digest("hex");
    res.setHeader("ETag", etag);

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    res.setHeader("Cache-Control", "public, max-age=3600");

    originalSend.call(res, body);
  };

  next();
};

export default etagMiddleware;
