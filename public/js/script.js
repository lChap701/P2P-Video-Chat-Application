window.onload = () => {
  const H2 = document.querySelector("#video-container h2");

  if (H2.innerHTML.split(" ")[1] == "") {
    let answer = window.prompt("Please enter the name of this room", "None");

    if (answer == null) {
      window.location.reload();
    } else {
      window.location.pathname += answer;
    }
  }
};


