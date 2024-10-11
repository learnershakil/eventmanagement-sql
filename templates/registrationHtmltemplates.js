export const newRegistrationButtonClick = (details) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            width: 80%;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .summary {
            margin-bottom: 20px;
        }
        .summary h2 {
            margin-bottom: 10px;
        }
        .summary p {
            margin: 5px 0;
        }
        .team-members, .events {
            margin-bottom: 20px;
        }
        .team-members ul, .events ul {
            list-style-type: none;
            padding: 0;
        }
        .team-members li, .events li {
            margin-bottom: 5px;
        }
        .footer {
            text-align: center;
            font-size: 0.9em;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Registration Confirmation TechSprint</h1>
        </div>
        <div class="summary">
            <h2>Summary</h2>
            <p><strong>Team Name:</strong> ${details.teamName}</p>
            <p><strong>Payment Status:</strong> ${
              details.payment.paymentStatus
            }</p>
            <p><strong>Total Amount:</strong> RS${details.amount}</p>
        </div>
        <div class="team-members">
            <h3>Team Members</h3>
            <ul>
                ${details.team
                  .map(
                    (member) => `
                <li>
                    <strong>Name:</strong> ${member.fullname}<br>
                    <strong>Email:</strong> ${member.email}<br>
                    <strong>Phone:</strong> ${member.phoneNumber}<br>
                    <strong>Class:</strong> ${member.class}<br>
                    <strong>Accommodation:</strong> ${
                      member.optAccomodation ? "Yes" : "No"
                    }
                </li>
                `
                  )
                  .join("")}
            </ul>
        </div>
        <div class="events">
            <h3>Registered Events</h3>
            <ul>
                ${details.eventIds
                  .map(
                    (event) => `
                <li>${event.eventName} - ${event.registrationCharge.currency} ${event.registrationCharge.amount}</li>
                `
                  )
                  .join("")}
            </ul>
        </div>
        <div class="footer">
            <p>Thank you for registering with us!</p>
        </div>
    </div>
</body>
</html>`;
};
