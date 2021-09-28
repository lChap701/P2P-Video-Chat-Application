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
const messages = document.querySelector("#messages");
const remoteVideo = document.querySelector("#remoteVideo");
let myVideoStream;
let newUser;

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
    })
    .catch((err) => alert(err));
});

/**
 * Displays prompts that gets the name of the room and the username or connects to a room
 */
const prompts = () => {
  // Checks if the user has joined a room
  if (document.querySelector("#video-container h2").innerText == "") {
    let room = prompt("Please enter the name of this room", "Room-1");

    // Room Validation
    if (room == null || room.trim().length == 0) location.reload();

    // Gets the desired username
    let username = localStorage.getItem("username");

    // Checks if the user has entered a username or if the username should change
    if (localStorage.getItem("username")) {
      if (!confirm("Do you wish to keep your username?")) {
        username = prompt("Please enter your new username", username);
      }
    } else {
      username = prompt("Please enter your username", "john-smith");
    }

    // Username Validation
    if (username == null || username.trim().length == 0) location.reload();

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

/* Gets the all users in the room */
socket.on("updateUserList", async ({ users }) => {
  if (users.length == 2) {
    invite.disabled = true;
    newUser = users.filter((user) => user.id !== socket.id)[0];
    await addUser();
  } else if (users.length > 2) {
    socket.emit("removeUser", users[users.length - 1]);
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

/**
 * Creates a offer for adding a new user
 * @param {*} data    Represents the data to use for adding this user
 */
const onMediaOffer = async (data) => {
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
};

socket.on("mediaOffer", onMediaOffer);

/**
 * Answers the offer that was created
 * @param {*} data  Represents the data that should be used to answer the call
 */
const onMediaAnswer = async (data) => {
  await peer1.setRemoteDescription(data.answer);
};

socket.on("mediaAnswer", onMediaAnswer);

/**
 * Creates the ICE candidate
 * @param {RTCPeerConnectionIceEvent} e   Represents the event that occurred
 */
const onIceCandidateEvent = (e) => {
  if (Boolean(e) || e.candidate) {
    socket.emit("iceCandidate", {
      to: newUser.id,
      candidate: e.candidate,
    });
  }
};

peer1.onicecandidate = onIceCandidateEvent;
peer2.onicecandidate = onIceCandidateEvent;

/**
 * Transfers the ICE candidate to another peer
 * @param {*} data    Represents the data to transfer
 */
const onRemotePeerIceCandidate = async (data) => {
  try {
    await peer1.addIceCandidate(new RTCIceCandidate(data.candidate));
    await peer2.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (err) {
    console.error(err);
  }
};

socket.on("remotePeerIceCandidate", onRemotePeerIceCandidate);

/**
 * Adds the other stream to the peer
 *
 * @param {RTCTrackEvent} e   Represents the event that occurred
 */
const gotRemoteStream = (e) => {
  const [stream] = e.streams;
  remoteVideo.removeAttribute("style");
  remoteVideo.srcObject = stream;
};

peer2.addEventListener("track", gotRemoteStream);

/* Adds messages that were recently sent */
socket.on("createMessage", (message, userId, username) => {
  // Setup message container
  const messageEl = document.createElement("div");
  messageEl.className = "message";

  // Add user info to container
  const bUserInfo = document.createElement("b");
  bUserInfo.id = "user-info";
  const icon = document.createElement("i");
  icon.className = "far fa-user-circle";
  bUserInfo.append(icon, userId == socket.id ? "me" : username);
  messageEl.append(bUserInfo);

  // Add message to container
  const spanMessage = document.createElement("span");
  spanMessage.append(message);
  messageEl.append(spanMessage);

  // Add message container to the document
  messages.append(messageEl);
});
