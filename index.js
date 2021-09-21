require("dotenv").config();

const express = require("express");
const app = express();

// Allows stylesheets, JS scripts, and other files to be loaded
app.use(express.static(__dirname + "/public"));

// Allows EJS to be used instead of HTML
app.set("view engine", "ejs");

// Displays index.ejs by default
app.get("/", (req, res) => {
  res.render("index", { room: "" });
});

// Display index.ejs with the room that was entered
app.get("/:room", (req, res) => {
  res.render("index", { room: req.params.room });
});

// Sets the port used to access my app
const listener = app.listen(process.env.PORT || 8080, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
