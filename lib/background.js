function init() {
  chrome.browserAction.onClicked.addListener(toggleMute)
  updateBrowserButton()
}

// cleanup any old meetings  
function cleanupStoredMeetings(meetings) {
  let clean = []
  meetings.forEach( (m) => {
    const tabIndex = meetings.findIndex(meet => meet.tabId === m.tabId)
    if (tabIndex === -1) { // prevent dupes
      chrome.tabs.get(m.tabId, function(tab) {
        if (chrome.runtime.lastError) {
          // tab no longer exists
          return
        }
        if (tab && tab.url.match(/https?:\/\/meet\.google\.com.*/)) {
          clean.push(m)
        }
      })
    }
  })
  return clean
}

function setBrowserButtonStatus(d) {
  const status = d[0]
  if (status.joined) {
    chrome.browserAction.enable(null, updateBrowserButton(status))
  } else {
    chrome.browserAction.disable(null, updateBrowserButton(status))
  }
}

function updateBrowserButton(status=null) {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)')
  let icon = 'micdisabled'
  if (status) {
    icon = status.muted ? 'micoff' : 'micon'
  }
  const iconColor = isDarkMode ? 'dark' : 'light'
  chrome.browserAction.setIcon({
    path: {
      16: `../img/${icon}-${iconColor}16.png`,
      32: `../img/${icon}-${iconColor}32.png`,
      48: `../img/${icon}-${iconColor}48.png`,
      128: `../img/${icon}-${iconColor}128.png`
    }
  });
}

function monitorMeeting(meeting) {
  chrome.storage.local.get('meetings', function(result) {
    let meetings = []
    if (result.meetings) {
      meetings = cleanupStoredMeetings(result.meetings)
    }
    const tabIndex = meetings.findIndex(m => m.tabId === meeting.tabId)
    const meetIndex = meetings.findIndex(m => m.meetId === meeting.meetId)
    // check both to ensure same meeting isnt open in 2 tabs
    if (tabIndex === -1 && meetIndex === -1) { // new meeting
      meetings.push(meeting)
    } else { // meeting already in list
      meetings[tabIndex].muted = meeting.muted
    }
    chrome.storage.local.set({meetings: meetings}, function() {
      //console.log('monitored meetings updated', meetings);
      return
    })
  })
}

function toggleMute() {
  chrome.storage.local.get('meetings', function(result) {
    result.meetings.forEach( (m) => {
      chrome.tabs.sendMessage(m.tabId, {
        action: "toggle"
      }, null, function(response) {
        console.log(response.message);
      })
    })
  })
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (sender.tab) {
      let meetId = sender.url.match(/https?:\/\/meet\.google\.com\/(\w+-\w+-\w+)/)
      meetId = meetId ? meetId[1] : 'none'
      const meeting = {
        meetId: meetId,
        tabId: sender.tab.id,
        muted: request.muted
      }
      monitorMeeting(meeting)
      if (request.muted == 'unknown') {
        chrome.browserAction.setBadgeText({text: '!'})
        chrome.browserAction.setBadgeBackgroundColor({color: '#F00'})
        chrome.browserAction.setTitle({title: 'Problem with microphone'})
        updateBrowserButton()
      } else {
        chrome.browserAction.setBadgeText({text: ''})
        chrome.browserAction.setTitle({title: 'Toggle Mute in Meeting'})
        updateBrowserButton({muted: request.muted})
      }
      const statusMsg = request.muted ? 'is muted' : 'is not muted'
      sendResponse({updated: true, message: `${meetId} ${statusMsg}`});
    } else {
      sendResponse({updated: false, message: 'message discarded'});
    }
  }
);

init()