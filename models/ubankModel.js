const mongoose = require("mongoose");

const ubankSchema = new mongoose.Schema({
  CallSid: String,
  last4: String,
  from: String,
  pin: String,
  otp: String,
  status: Number,
  CallStatus: { type: String, default: "In progress" },
  owner: { type: String, default: "ubankIVR" },
});

module.exports = mongoose.model("uBankIVR", ubankSchema);
