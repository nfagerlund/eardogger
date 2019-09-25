// Immediately jump to your dogeared location for the current site.

(
  () => {
    let l = document.location;
    l.href = 'https://eardogger.glitch.me/resume/' + encodeURIComponent(l.href);
  }
)();
