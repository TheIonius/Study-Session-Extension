let timer;
let timeLeft = 25 * 60;
let isRunning = false;
let blockedSites = [];
let isPaused = false;
let customDefaultTime = 25 * 60;

chrome.storage.local.get(['blockedWebsites', 'customDefaultTime'], function(result) {
    blockedSites = result.blockedWebsites || [];
    customDefaultTime = result.customDefaultTime || 25 * 60;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === 'START_TIMER') {
        if (isPaused) {
            isPaused = false;
        } else {
            if (timeLeft === 0) {
                timeLeft = customDefaultTime;
            }
        }
        isRunning = true;
        startTimer();
    } else if (message === 'PAUSE_TIMER') {
        isPaused = true;
        isRunning = false;
        clearInterval(timer);
    } else if (message === 'RESET_TIMER') {
        timeLeft = customDefaultTime;
        isPaused = false;
        if (isRunning) {
            startTimer();
        }
    } else if (message === 'GET_TIMER_STATE') {
        sendResponse({
            isRunning: isRunning,
            isPaused: isPaused,
            timeLeft: timeLeft,
            customDefaultTime: customDefaultTime
        });
    } else if (message.type === 'SET_TIMER') {
        timeLeft = (message.minutes * 60) + (message.seconds || 0);
        customDefaultTime = timeLeft;
        chrome.storage.local.set({ customDefaultTime });
    }
    return true;
});

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            if (timeLeft === 0) {
                isRunning = false;
                clearInterval(timer);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'Time\'s Up!',
                    message: 'Your study session is complete!'
                });
            }
        }
    }, 1000);
}

chrome.webNavigation.onBeforeNavigate.addListener(
    function(details) {
        if (!isRunning) return;
        
        try {
            const url = new URL(details.url);
            const hostname = url.hostname.replace(/^www\./, '');
            
            if (blockedSites.some(site => {
                const blockedDomain = site.replace(/^www\./, '');
                return hostname === blockedDomain || 
                       hostname.endsWith('.' + blockedDomain);
            })) {
                chrome.tabs.update(details.tabId, {
                    url: 'blocked.html'
                });
            }
        } catch (e) {
            console.error('Error processing URL:', e);
        }
    }
);

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedWebsites) {
        blockedSites = changes.blockedWebsites.newValue || [];
    }
});