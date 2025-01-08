document.addEventListener('DOMContentLoaded', () => {
  const timerDisplay = document.getElementById('timer');
  const startButton = document.getElementById('startTimer');
  const resetButton = document.getElementById('resetTimer');
  const websiteInput = document.getElementById('websiteInput');
  const addWebsiteButton = document.getElementById('addWebsite');
  const blockedWebsitesList = document.getElementById('blockedWebsites');
  let timeLeft = 25 * 60;

  function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function disableDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.style.opacity = '0.5';
      button.style.pointerEvents = 'none';
    });
  }

  function enableDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
    });
  }

  function startTimer() {
    if (startButton.textContent === 'Start') {
      chrome.runtime.sendMessage('START_TIMER');
      startButton.textContent = 'Pause';
      disableDeleteButtons();
    } else {
      chrome.runtime.sendMessage('RESET_TIMER');
      startButton.textContent = 'Start';
      enableDeleteButtons();
    }
  }

  function resetTimer() {
    timeLeft = 25 * 60;
    updateTimerDisplay(timeLeft);
    chrome.runtime.sendMessage('RESET_TIMER');
  }

  async function addWebsite() {
    const website = websiteInput.value.trim().toLowerCase();
    if (!website) return;

    const result = await chrome.storage.local.get(['blockedWebsites']);
    const blockedWebsites = Array.isArray(result.blockedWebsites) ? result.blockedWebsites : [];
    
    if (!blockedWebsites.includes(website)) {
      blockedWebsites.push(website);
      await chrome.storage.local.set({ blockedWebsites });
      websiteInput.value = '';
      updateBlockedWebsitesList();
    }
  }

  async function updateBlockedWebsitesList() {
    const result = await chrome.storage.local.get(['blockedWebsites']);
    const blockedWebsites = Array.isArray(result.blockedWebsites) ? result.blockedWebsites : [];
    
    blockedWebsitesList.innerHTML = '';
    
    blockedWebsites.forEach(website => {
      const li = document.createElement('li');
      li.textContent = website;
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '×';
      deleteButton.className = 'delete-btn';
      deleteButton.onclick = () => removeWebsite(website);
      
      li.appendChild(deleteButton);
      blockedWebsitesList.appendChild(li);
    });
  }

  async function removeWebsite(website) {
    const result = await chrome.storage.local.get(['blockedWebsites']);
    const blockedWebsites = result.blockedWebsites.filter(site => site !== website);
    await chrome.storage.local.set({ blockedWebsites });
    updateBlockedWebsitesList();
  }

  startButton.addEventListener('click', startTimer);
  resetButton.addEventListener('click', resetTimer);
  addWebsiteButton.addEventListener('click', addWebsite);
  websiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addWebsite();
    }
  });

  updateTimerDisplay(timeLeft);
  updateBlockedWebsitesList();

  setInterval(() => {
    chrome.runtime.sendMessage('GET_TIMER_STATE', (response) => {
      if (response) {
        timeLeft = response.timeLeft;
        if (response.isRunning) {
          startButton.textContent = 'Pause';
          disableDeleteButtons();
        }
        updateTimerDisplay(timeLeft);
      }
    });
  }, 1000);

  chrome.runtime.sendMessage('GET_TIMER_STATE', (response) => {
    if (response) {
      timeLeft = response.timeLeft;
      if (response.isRunning) {
        startButton.textContent = 'Pause';
        disableDeleteButtons();
      }
      updateTimerDisplay(timeLeft);
    }
  });
});