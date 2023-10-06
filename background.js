const getPath = (link) => {
  const delimiter = 'tree/';
  const url = new URL(link);
  const pathname = url.pathname;
  startIndex = pathname.indexOf(delimiter) + delimiter.length
  const filePath = decodeURIComponent(pathname.substring(startIndex))
  return filePath
}

function throttled(fn, delay = 5000) {
  let oldtime = null;
  let newtime = null;
  return function (...args) {
    newtime = Date.now();
    if (oldtime === null || newtime - oldtime >= delay) {
      fn.apply(null, args)
      oldtime = Date.now();
      newtime = null;
    }
  }
}

const handleTabNavigation = (tabId) => {
  console.log('handleTabNavigation is invoked')
  chrome.tabs.query(
    {},
    async tabs => {
      const currentTab = tabs.filter(tab => tab.id == tabId)[0]
      console.log("The current tab is ", currentTab);
      await handleNewTab(currentTab)
    }
  )
}

// throttle is important to avoid redirections
const handleNewTab = async (currentTab) => {
  console.log("The current tab is jupyter notebook, invoking function in the current tab: ", currentTab);
  chrome.scripting.executeScript({
    target: {
      tabId: currentTab.id
    },
    args: [currentTab],
    func: (currentTab) => {
      const answer = confirm("You can open it in existing tabs hosting jupyter lab (if any), do you want to do it?")
      chrome.runtime.sendMessage({
        type: "openInExistingTab",
        options: {
          answer,
          currentTab
        }
      })
    }
  })
};

const getOptions = async () => {
  const options = await chrome.storage.sync.get();
  console.log("The option is ", options);
  return options;
}

const getPrefix = async () => {
  const options = await getOptions();
  return options.prefix;
}

const isJupyterLabTab = async (tab, pattern) => {
  const url = retrieveUrl(tab)
  const finalPattern = pattern ?? await getPrefix();
  const expression = new RegExp(finalPattern)
  const matched = url.match(expression)
  console.log({ url, expression, matched })
  return matched !== null
}

const isJupyterLabNotebook = async (tab, pattern) => {
  const url = retrieveUrl(tab)
  if (!url.endsWith(".ipynb"))
    return false;
  const finalPattern = pattern ?? await getPrefix();
  console.log(`The pattern is ${finalPattern}`);
  const expression = new RegExp(finalPattern)
  const matched = url.match(expression)
  return matched !== null
}

const findExistingJupyterLabTab = async (tabs, currentTab) => {
  var flags = await Promise.all(
    tabs.map(async tab => await isJupyterLabTab(tab) && tab.id !== currentTab.id)
  );
  return tabs.filter((_, i) => flags[i]);
}

const retrieveUrl = tab => tab.pendingUrl || tab.url || ""

const openInExistingTab = async ({ answer, currentTab }) => {
  if (answer) {
    chrome.tabs.query({},
      async tabs => {
        const existingJuyterLabTabs = await findExistingJupyterLabTab(tabs, currentTab)
        const existingJuyterLabTabsCount = existingJuyterLabTabs.length
        if (!existingJuyterLabTabsCount) {
          console.log('No existing tab hosting jupyter lab.')
          return
        }
        console.log(`Detect ${existingJuyterLabTabsCount} existing jupyterlab tabs. Use the first one`)
        console.log({ existingJuyterLabTabs })
        var tab = existingJuyterLabTabs[0]
        openJupyterLab(tab, retrieveUrl(currentTab), () => {
          chrome.tabs.highlight({
            tabs: tab.index,
            windowId: tab.windowId
          },
            window => console.log(`window ${window} is highlighted!`)
          )
          // close opening new tab
          chrome.tabs.remove(
            [currentTab.id],
            () => {
              console.log(`opening tab is closed!`)
            }
          )
        })
      },
    )
  }
}

const openJupyterLab = (tab, url, callback) => {
  chrome.scripting.executeScript({
    target: {
      tabId: tab.id
    },
    args: [getPath(url)],
    func: (filePath) => {
      document.evaluate('//*[@data-command="filebrowser:open-path"]', document).iterateNext().click()
      setTimeout(
        () => {
          document.evaluate('//*[@id="jp-dialog-input-id"]', document).iterateNext().value = filePath
          setTimeout(
            () => {
              document.evaluate('//div[contains(@class, "jp-Dialog-buttonLabel") and text()="Open"]', document).iterateNext().click()
            },
            500
          )
        },
        1000
      )
    }
  },
    callback
  )
}

chrome.webNavigation.onCommitted.addListener(
  async (details, filter) => {
    console.log("[onCompleted]: accept args: ", { details, filter })
    if (await isJupyterLabNotebook(details)) {
      handleTabNavigation(details.tabId)
    }
  }
);

chrome.runtime.onMessage.addListener(
  async (request, sender, sendResponse) => {
    if (request.type === "openInExistingTab") {
      await openInExistingTab(request.options)
    }
  }
);