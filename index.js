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

// Display index.ejs with the room that was entered
app.get("/:room", (req, res) => {
  res.render("index", { room: req.params.room });
});

// Socket.io Handling
let connectedUsers = []; // Array of users connected to a room
let userMessages = []; // Array of messages

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    connectedUsers = connectedUsers.filter((user) => user.id !== socket.id);
    socket.broadcast.emit("updateUserList", { users: connectedUsers });
    console.log("A user disconnected");
  });

  socket.on("joinRoom", (room, username) => {
    socket.join(room);

    let result =
      connectedUsers.length > 0
        ? connectedUsers.find((user) => user.id === socket.id)
        : undefined;

    if (result == undefined) {
      connectedUsers.push({
        id: socket.id,
        username: username,
        room: room,
      });
    }

    console.log("A user join room '" + room + "'");

    socket.on("requestUserList", () => {
      io.to(room).emit("updateUserList", { users: connectedUsers });
    });

    socket.on("removeUser", (user) => {
      if (
        socket.id === user.id &&
        connectedUsers.filter((u) => u.room === user.room).length > 2
      ) {
        console.log("user left");
        socket.leave(user.room);
        connectedUsers = connectedUsers.filter((u) => u.id != user.id);
      }

      socket.to(user.id).emit("roomFull");
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

    socket.on("requestMessages", () => {
      socket.emit("getMessages", { userMessages: userMessages });
    });

    socket.on("message", (message) => {
      userMessages.push({
        room: room,
        message: message,
        userId: socket.id,
        username: username,
      });
      io.to(room).emit("createMessage", message, socket.id, username);
    });
  });
});

// Sets the port used to access my app
const listener = server.listen(process.env.PORT || 8080, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
