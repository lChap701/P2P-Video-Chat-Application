/**
 * Gets the name of the room or prepares to access video and audio
 */
window.onload = () => {
  const roomEl = document.querySelector("#video-container h2");

  if (roomEl.innerText == "") {
    let room = window.prompt("Please enter the name of this room", "Room-1");

    if (room == null) {
      window.location.reload();
    } else {
      window.location.pathname += room.replace(new RegExp(" ", "g"), "-");
    }
  } else {
    let username = window.prompt("Please enter your username", "john-smith");

    if (username == null) {
      window.location.reload();
    } else {
      console.log(username.replace(new RegExp(" ", "g"), "-"));
      accessVideo();
    }
  }
};

/**
 * Access the camera and microphone
 */
function accessVideo() {
  let myVideoStream;
  const myVideo = document.createElement("video");

  myVideo.muted = true;
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
      myVideoStream = stream;
      addVideoStream(myVideo, stream);
    });
}

/**
 * Streams the video using the camera and microphone
 * @param {HTMLVideoElement} video  Represents the newly created video element
 * @param {MediaStream}     stream  Represents the video being streamed
 */
function addVideoStream(video, stream) {
  video.srcObject = stream;

  video.addEventListener("loadedmetadata", () => {
    video.play();
    document.querySelector("#videos").append(video);
  });
}
