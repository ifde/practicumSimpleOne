window.s_widget_custom = window.s_widget_custom || {};

setTimeout(function() {
  document.getElementById('myButton').click();
  setTimeout(() => {
    document.getElementById('myButton').click();
  }, 950);
}, 150);

const progressBar = document.getElementById('progressBar');
let width = 0;
const interval = 50; // milliseconds
const duration = 1100; // 1.1 seconds
const increment = (interval / duration) * 100;

async function updateProgress() {
  width += increment;
  progressBar.style.width = width + '%';
  if (width >= 100) {
    clearInterval(progressInterval);
    document.getElementById('progressBarContainer').style.visibility = "hidden";
    document.getElementById('progressBarText').style.visibility = "hidden";
    return;
  }
}

const progressInterval = setInterval(updateProgress, interval);
