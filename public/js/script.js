window.onload = () => {
  const H2 = document.querySelector("#video-container h2");

  if (H2.innerHTML.split(" ")[1] == "") {
    let answer = window.prompt("Please enter the name of this room", "None");

    if (answer == null) {
      window.location.reload();
    } else {
      window.location.pathname += answer;
    }
  } else {
    accessVideo();
  }
};

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

function addVideoStream(video, stream) {
  video.srcObject = stream;
  
  video.addEventListener("loadedmetadata", () => {
    video.play();
    document.querySelector("#videos").append(video);
  });
}
