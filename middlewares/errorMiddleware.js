import { FRONTEND_URL } from "../ENV.js";

const errorMiddleware = (err, req, res, next) => {
  // console.error(err);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Internal server error";

  if (
    err.statusCode === 404 &&
    (err.message === "Page Not Found" || err.message === "Api Not Found")
  ) {
    return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333;
            text-align: center;
            padding: 50px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            font-size: 48px;
            margin-bottom: 10px;
        }
        p {
            font-size: 18px;
            margin-bottom: 20px;
        }
        a {
            color: #007BFF;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>Oops! The page you're looking for doesn't exist.</p>
        <p>It might have been moved or deleted.</p>
        <p><a href="${FRONTEND_URL}">Return to Homepage</a></p>
    </div>
</body>
</html>`);
  }

  return res.status(err.statusCode).json({
    status: err.statusCode,
    message: err.message,
  });

  // Send response with error details
};

export default errorMiddleware;
