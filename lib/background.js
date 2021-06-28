// ephemeral array to hold meets temporarily to prevent an odd race condition
let meetTabs = []

// cleanup any old meetings left in storage by error
let cleanupStoredMeetings = (meetings) => {
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

let checkRemovedTab = (tabid, removeInfo) => {
  chrome.storage.local.get('meetings', function (result) {
    const meetings = result.meetings || []
    const tabIndex = meetings.findIndex(m => m.tabId === tabid)
    if (tabIndex !== -1) { // tab is a meet
      meetings.splice(tabIndex, 1)
      updateBrowserButton()
      chrome.storage.local.set({ meetings: meetings }, function () {
        return
      })
    }
  })
}

let updateBrowserButton = (status=null) => {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)')
  const iconColor = isDarkMode ? 'dark' : 'light'
  let icon = 'micdisabled'
  if (status) {
    icon = status.muted ? 'micoff' : 'micon'
    chrome.browserAction.enable()
  } else {
    // reset icon to original state then disable
    chrome.browserAction.disable()
    chrome.browserAction.setBadgeText({text: ''})
    chrome.browserAction.setTitle({title: 'Toggle Mute in Meeting'})
  }
  chrome.browserAction.setIcon({
    path: {
      16: `../img/${icon}-${iconColor}16.png`,
      32: `../img/${icon}-${iconColor}32.png`,
      48: `../img/${icon}-${iconColor}48.png`,
      128: `../img/${icon}-${iconColor}128.png`
    }
  })
}

let monitorMeeting = (meeting) => {
  chrome.storage.local.get('meetings', (result) => {
    let meetings = []
    if (result.meetings) {
      meetings = cleanupStoredMeetings(result.meetings)
    }
    // check both to ensure same meeting isnt open in 2 tabs
    const tabIndex = meetings.findIndex(m => m.tabId === meeting.tabId)
    const meetIndex = meetings.findIndex(m => m.meetId === meeting.meetId)
    if (tabIndex === -1 && meetIndex === -1) { // new meeting
      meetings.push(meeting)
      if (!meetTabs.includes(meeting.tabId)) meetTabs.push(meeting.tabId)
    } else { // meeting in storage
      meetings[tabIndex].muted = meeting.muted
    }
    chrome.storage.local.set({meetings: meetings}, () => {
      return
    })
  })
}

let toggleMute = () => {
  chrome.storage.local.get('meetings', (result) => {
    result.meetings.forEach( (m) => {
      chrome.tabs.sendMessage(m.tabId, {
        action: "toggle"
      }, null, (response) => {
        console.log(response.message);
      })
    })
  })
}

// *************
// event handlers
// *************

let messageHandler = (request, sender, sendResponse) => {
  if (request.action === 'leaving') {
    checkRemovedTab(sender.tab.id, null)
    return
  } else if (request.action === 'update') {  
    if (sender.tab) {
      let meetId = sender.url.match(/https?:\/\/meet\.google\.com\/(?:_meet\/)?(\w+-\w+-\w+)(?:\?.*$)?/)
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
}

let hotkeyHandler = (cmd, tab) => {
  switch (cmd) {
    case 'toggle-mute':
      toggleMute()
      break
    default:
      console.log('Unknown command:', cmd)
  }
}

// *************
// event listeners
// *************

// browser button click listener
chrome.browserAction.onClicked.addListener(toggleMute)

// content script message listener
chrome.runtime.onMessage.addListener(messageHandler)

// hotkey listener
chrome.commands.onCommand.addListener(hotkeyHandler)

// set initial browser action state to disabled
chrome.browserAction.disable()
