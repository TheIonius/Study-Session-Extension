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
      updateTimerDisplay(timeLeft);
    } else {
      chrome.runtime.sendMessage('PAUSE_TIMER');
      startButton.textContent = 'Start';
      enableDeleteButtons();
      updateTimerDisplay(timeLeft);
    }
  }

  function resetTimer() {
    chrome.runtime.sendMessage('RESET_TIMER');
    chrome.runtime.sendMessage('GET_TIMER_STATE', (response) => {
      if (response) {
        timeLeft = response.timeLeft;
        updateTimerDisplay(timeLeft);
      }
    });
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

  function makeTimerEditable() {
    const timerDisplay = document.getElementById('timer');
    
    if (!timerDisplay.parentElement.classList.contains('timer-container')) {
        const container = document.createElement('div');
        container.className = 'timer-container';
        timerDisplay.parentNode.insertBefore(container, timerDisplay);
        container.appendChild(timerDisplay);
    }
    
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.className = 'edit-icon';
    timerDisplay.parentNode.appendChild(editIcon);

    editIcon.addEventListener('click', () => {
      const currentTime = timerDisplay.textContent;
      const minutes = parseInt(currentTime.split(':')[0]);
      
      const input = document.createElement('input');
      input.type = 'number';
      input.value = minutes;
      input.min = 1;
      input.max = 120;
      input.className = 'timer-input';
      
      timerDisplay.style.display = 'none';
      editIcon.style.display = 'none';
      timerDisplay.parentNode.insertBefore(input, timerDisplay);
      input.focus();

      input.addEventListener('blur', () => {
        const newMinutes = Math.min(Math.max(parseInt(input.value) || 25, 1), 120);
        chrome.runtime.sendMessage({ type: 'SET_TIMER', minutes: newMinutes });
        timerDisplay.style.display = 'block';
        editIcon.style.display = 'inline';
        input.remove();
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    });
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
  }, 100);

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

  makeTimerEditable();
});