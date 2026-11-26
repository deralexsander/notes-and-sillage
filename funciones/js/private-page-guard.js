import { onAuthStatusChange } from "./firebase-config.js";

document.body.classList.add("auth-checking");

const redirectTimer = window.setTimeout(() => {
  if (!window.firebaseAuth?.currentUser) {
    window.location.replace("catalogo.html");
  }
}, 2500);

onAuthStatusChange(user => {
  window.clearTimeout(redirectTimer);

  if (user) {
    document.body.classList.remove("auth-checking");
  } else {
    document.body.classList.add("auth-checking");
    window.location.replace("catalogo.html");
  }
});
