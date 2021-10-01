const socket = io("/");
const CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.stunprotocol.org",
    },
  ],
};
const peer1 = new RTCPeerConnection(CONFIG);
const peer2 = new RTCPeerConnection(CONFIG);
const message = document.querySelector("input[name='message']");
const invite = document.querySelector("button#invite");
const video = document.querySelector("button#video");
const audio = document.querySelector("button#audio");
const msgContainer = document.querySelector("#message-container");
const messages = document.querySelector("#messages");
const remoteVideo = document.querySelector("#remoteVideo");
let myVideoStream;
let newUser;

window.addEventListener("resize", () => {
  if (window.innerWidth > 1190) {
    msgContainer.removeAttribute("style");
  }
});

/* Attempts to send a message when the 'send' button is clicked */
document.querySelector("button#send").addEventListener("click", () => {
  if (message.value.trim().length !== 0) {
    socket.emit("message", message.value.trim());
    message.value = "";
  }
});

/* Attempts to send a message when the 'Enter' key is pressed */
message.addEventListener("keydown", (e) => {
  if (e.key == "Enter" && message.value.trim().length !== 0) {
    socket.emit("message", message.value.trim());
    message.value = "";
  }
});

/* Gives the user the link to use for invites */
invite.addEventListener("click", () => {
  prompt(
    "Copy this link and send it to people you want to meet with:",
    location.href
  );
});

/* Displays chat for smaller devices */
document.querySelector("button#chat").addEventListener("click", () => {
  msgContainer.style.display = "flex";
});

/* Hides chat for smaller devices */
document.querySelector("button#back").addEventListener("click", () => {
  msgContainer.style.display = "none";
});

/* Disables or enables access to camera */
video.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;

  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    video.innerHTML = `<i class="fas fa-video-slash"></i>`;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    video.innerHTML = `<i class="fas fa-video"></i>`;
  }

  video.classList.toggle("bg-red");
});

/* Disables or enables access to microphone */
audio.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;

  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    audio.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    audio.innerHTML = `<i class="fas fa-microphone"></i>`;
  }

  audio.classList.toggle("bg-red");
});

/* Accesses video and audio, displays prompts, and gets the initial users in the room */
socket.on("connect", () => {
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
      myVideoStream = stream;
      document.querySelector("#localVideo").srcObject = stream;
      stream.getTracks().forEach((track) => peer1.addTrack(track, stream));
      prompts();
      socket.emit("requestMessages");
    })
    .catch((err) => alert(err));
});

/**
 * Displays prompts that gets the name of the room and the username or connects to a room
 */
const prompts = () => {
  // Checks if the user has joined a room
  if (document.querySelector("#video-container h2").innerText == "") {
    let room = "";

    // Room Validation
    while (room == null || room.trim().length == 0) {
      room = prompt("Please enter the name of this room", "Room-1");
    }

    // Gets the desired username
    let username = localStorage.getItem("username");
    let valid = false;

    // Checks if the user has entered a username or if the username should change
    if (localStorage.getItem("username")) {
      if (!confirm("Do you wish to keep your username?")) {
        while (!valid) {
          username = prompt(
            "Please enter your new username",
            localStorage.getItem("username")
          );
          if (username != null && username.trim().length > 0) valid = true;
        }
      }
    } else {
      while (!valid) {
        username = prompt("Please enter your username", "john-smith");
        if (username != null && username.trim().length > 0) valid = true;
      }
    }

    // Saves username in localStorage
    localStorage.setItem(
      "username",
      username.replace(new RegExp(" ", "g"), "-")
    );

    // Redirects to the room
    location.pathname += room.replace(new RegExp(" ", "g"), "-");
  } else {
    socket.emit("joinRoom", ROOM, localStorage.getItem("username"));
    socket.emit("requestUserList");
  }
};

/* Tells the user that the room is full */
socket.on("roomFull", () => {
  alert("This room is full");
  location.pathname = "/";
});

/* Gets the all users in the room to determine how to update the page */
socket.on("updateUserList", async ({ users }) => {
  let usersInRoom = users.filter((user) => user.room === ROOM);

  if (usersInRoom.length == 2) {
    invite.disabled = true;
    remoteVideo.removeAttribute("style");
    newUser = usersInRoom.filter((user) => user.id !== socket.id)[0];
    await addUser();
  } else if (usersInRoom.length > 2) {
    socket.emit("removeUser", usersInRoom[usersInRoom.length - 1]);
  } else {
    invite.disabled = false;
    remoteVideo.style.display = "none";
  }
});

/**
 * Adds a new user to the room
 */
const addUser = async () => {
  const localPeerOffer = await peer1.createOffer();
  await peer1.setLocalDescription(localPeerOffer);

  socket.emit("mediaOffer", {
    offer: localPeerOffer,
    from: socket.id,
    to: newUser.id,
  });
};

/* Creates a offer for adding a new user */
socket.on("mediaOffer", async (data) => {
  try {
    await peer2.setRemoteDescription(data.offer);
    const peerAnswer = await peer2.createAnswer();
    await peer2.setLocalDescription(peerAnswer);

    socket.emit("mediaAnswer", {
      answer: peerAnswer,
      from: socket.id,
      to: data.from,
    });
  } catch (err) {
    console.error(err);
  }
});

/* Answers the offer that was created */
socket.on("mediaAnswer", async (data) => {
  await peer1.setRemoteDescription(data.answer);
});

/**
 * Creates the ICE candidate
 * @param {RTCPeerConnectionIceEvent} e   Represents the event that occurred
 */
const onIceCandidateEvent = (e) => {
  socket.emit("iceCandidate", {
    to: newUser.id,
    candidate: e.candidate,
  });
};

peer1.onicecandidate = onIceCandidateEvent;
peer2.onicecandidate = onIceCandidateEvent;

/* Transfers the ICE candidate to another peer */
socket.on("remotePeerIceCandidate", async (data) => {
  try {
    await peer1.addIceCandidate(new RTCIceCandidate(data.candidate));
    await peer2.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (err) {
    console.error(err);
  }
});

/* Adds the other stream to the peer */
peer2.addEventListener("track", (e) => {
  const [stream] = e.streams;
  remoteVideo.srcObject = stream;
});

/* Gets all messages in the room */
socket.on("getMessages", ({ userMessages }) => {
  userMessages
    .filter((obj) => obj.room == ROOM)
    .forEach((obj) =>
      addMessage(obj.userId, socket.id, obj.username, obj.message)
    );
});

/**
 * Adds messages to the page
 * @param {string} userId     Represents the ID of the user
 * @param {string} socketId   Represents the ID of the socket (the current user)
 * @param {string} username   Represents the user's username
 * @param {string} message    Represents the message that was sent
 */
const addMessage = (userId, socketId, username, message) => {
  // Setup message container
  const messageEl = document.createElement("div");
  messageEl.className = "message";

  // Add user info to container
  const bUserInfo = document.createElement("b");
  bUserInfo.id = "user-info";
  const icon = document.createElement("i");
  icon.className = "far fa-user-circle";
  bUserInfo.append(icon, userId == socketId ? "me" : username);
  messageEl.append(bUserInfo);

  // Add message to container
  const spanMessage = document.createElement("span");
  spanMessage.append(message);
  messageEl.append(spanMessage);

  // Add message container to the document
  messages.append(messageEl);
};

/* Adds messages that were recently sent */
socket.on("createMessage", (message, userId, username) => {
  addMessage(userId, socket.id, username, message);
});
