// global
let tabMuteStatus = true

function toggleMute() {
  let macos = false;
  if (navigator.appVersion.indexOf("Mac")!=-1) macos = true;
  if (macos) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        metaKey: true,
          keyCode: 68,
          code: "KeyD"
        })
    );
  } else {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
          keyCode: 68,
          code: "KeyD"
        })
    );
  }
}

// send mute status to the background script for processing
function setMuteStatus(target) {
  muted = target.getAttribute('data-is-muted') == 'true'
  micProblem = target.getAttribute('aria-label') == 'Microphone problem. Show more info'
  if (tabMuteStatus !== muted) {
    tabMuteStatus = muted
    chrome.runtime.sendMessage({
      muted: micProblem ? 'unknown' : muted
    }, function(response) {
      console.log(response.message);
      //return
    });
  }
}

// listener callback - wait for DOM to completely load and find mute button
function pageChanged(mutations, observer) {
  mutations.forEach( (m) => {
    if (m.type == 'attributes') {
      if (m.target.matches('div[data-tooltip*="microphone"]') || m.target.matches('div[aria-label~="Microphone"]')) {
        setMuteStatus(m.target)
      }
    }
  })
}

// initial full page mutation observer
const pageObserver = new MutationObserver(pageChanged)
pageObserver.observe(document.body, {
  subtree: true,
  childList: false,
  attributes: true,
  attributeFilter: ['data-is-muted']
})

function handleMessage(request, sender, sendResponse) {
  if (!sender.tab) { 
    switch (request.action) {
      case 'toggle':
        toggleMute()
        sendResponse({updated: true, message: 'mute toggled'});
        break;
      default:
        sendResponse({updated: false, message: 'error'});
        console.log("unknown action:", request.action)
    }
  }
}

chrome.runtime.onMessage.addListener(handleMessage)