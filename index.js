require("dotenv").config();

const express = require("express");
const app = express();

// Socket.io Setup
const { createServer } = require("http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Allows stylesheets, JS scripts, and other files to be loaded
app.use(express.static(__dirname + "/public"));

// Allows EJS to be used instead of HTML
app.set("view engine", "ejs");

// Displays index.ejs by default
app.get("/", (req, res) => {
  res.render("index", { room: "" });
});

// Array of users connected to a room
let connectedUsers = [];

// Display index.ejs with the room that was entered
app.get("/:room", (req, res) => {
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      connectedUsers = connectedUsers.filter(
        (user) => user.id !== socket.id && user.room == req.params.room
      );
      
      socket.broadcast.emit("updateUserList", {
        users: connectedUsers,
      });

      console.log(connectedUsers);
    });

    socket.on("joinRoom", (room, username) => {
      // Checks if the user should join the room
      if (connectedUsers.filter((user) => user.room == room).length < 2) {
        socket.join(room);

        let res =
          connectedUsers.length > 0
            ? connectedUsers.find((user) => user.id === socket.id)
            : undefined;

        if (res == undefined) {
          connectedUsers.push({
            id: socket.id,
            username: username,
            room: room,
          });
        }

        console.log(connectedUsers);

        let usersInRoom = connectedUsers.filter((user) => user.room == room);

        socket.on("message", (message) => {
          io.to(room).emit("createMessage", message, socket.id, username);
        });

        socket.on("requestUserList", () => {
          socket.emit("updateUserList", { users: usersInRoom });
          socket.broadcast.emit("updateUserList", { users: usersInRoom });
        });

        socket.on("mediaOffer", (data) => {
          socket.to(data.to).emit("mediaOffer", {
            from: data.from,
            offer: data.offer,
          });
        });

        socket.on("mediaAnswer", (data) => {
          socket.to(data.to).emit("mediaAnswer", {
            from: data.from,
            answer: data.answer,
          });
        });

        socket.on("iceCandidate", (data) => {
          socket.to(data.to).emit("remotePeerIceCandidate", {
            candidate: data.candidate,
          });
        });
      } else {
        socket.emit("roomFull");
      }
    });
  });

  res.render("index", { room: req.params.room });
});

// Sets the port used to access my app
const listener = server.listen(process.env.PORT || 8080, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
