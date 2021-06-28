// global
let tabMuteStatus = true

// send mute toggle key combo based on OS
let toggleMute = () => {
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
let setMuteStatus = (target) => {
  muted = target.getAttribute('data-is-muted') == 'true'
  micProblem = target.getAttribute('aria-label') == 'Microphone problem. Show more info'
  if (tabMuteStatus !== muted) {
    tabMuteStatus = muted
    chrome.runtime.sendMessage({
      action: "update", 
      muted: micProblem ? 'unknown' : muted
    }, (response) => {
      console.log(response.message);
      //return
    });
  }
}

// observer callback - find mute button via attribute matching
let pageChanged = (mutations, observer) => {
  mutations.forEach( (m) => {
    if (m.type == 'attributes') {
      if (
        m.target.matches('div[data-tooltip*="microphone"]') 
        || m.target.matches('div[aria-label*="microphone"]')
        || m.target.matches('button[aria-label*="microphone"]')
      )  {
        setMuteStatus(m.target)
      }
    }
  })
}

// full page mutation observer
const pageObserver = new MutationObserver(pageChanged)
pageObserver.observe(document.body, {
  subtree: true,
  childList: false,
  attributes: true,
  attributeFilter: ['data-is-muted']
})

// *************
// event handlers
// *************

let handleMessage = (request, sender, sendResponse) => {
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

let handleMeetClosed = (event) => {
  chrome.runtime.sendMessage({
    muted: 'unknown',
    action: 'leaving'
  }, function (response) {
    return
  })
}

// *************
// event listeners
// *************

// background script message listener
chrome.runtime.onMessage.addListener(handleMessage)

// fires on domain change or tab close
window.addEventListener("beforeunload", handleMeetClosed)