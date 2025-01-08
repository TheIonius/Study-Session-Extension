let timer;
let timeLeft = 25 * 60;
let isRunning = false;
let blockedSites = [];

chrome.storage.local.get(['blockedWebsites'], function(result) {
    blockedSites = result.blockedWebsites || [];
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === 'START_TIMER') {
        isRunning = true;
        if (timeLeft === 0) {
            timeLeft = 25 * 60;
        }
        startTimer();
    } else if (message === 'RESET_TIMER') {
        timeLeft = 25 * 60;
        if (isRunning) {
            startTimer();
        }
    } else if (message === 'GET_TIMER_STATE') {
        sendResponse({
            isRunning: isRunning,
            timeLeft: timeLeft
        });
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
        
        const url = new URL(details.url);
        if (blockedSites.some(site => url.hostname.includes(site))) {
            chrome.tabs.update(details.tabId, {
                url: 'blocked.html'
            });
        }
    }
);

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blockedWebsites) {
        blockedSites = changes.blockedWebsites.newValue || [];
    }
});