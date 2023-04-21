const getPath = (link) => {
  const filePath = ((link, delimiter) => {
    startIndex = link.indexOf(delimiter) + delimiter.length
    return decodeURI(link.substring(startIndex))
  })(link, 'tree/')
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
  chrome.tabs.query(
    {}, 
    async tabs => {
      const currentTab = tabs.filter(tab => tab.id == tabId)[0]
      console.log({ currentTab })
      await handleNewTab(currentTab)
    }
  )
}

// throttle is important to avoid redirections
const handleNewTab = throttled(async (currentTab) => {
  console.log({ currentTab })
  if (!(await isJupyterLabNotebook(currentTab)))
    return
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
})

const getPrefix = async() => {
  return (await chrome.storage.sync.get()).prefix
}

const isJupyterLabTab = async (tab, prefix) => {
  const url = retrieveUrl(tab)
  prefix = prefix ?? await getPrefix()
  const expression = new RegExp("^" + prefix)
  const matched = url.match(expression)
  return matched !== null
}

const isJupyterLabNotebook = async (tab, prefix) => {
  const url = retrieveUrl(tab)
  prefix = prefix ?? await getPrefix()
  const expression = new RegExp("^" + prefix + ".*\.ipynb$")
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

const openInExistingTab = async ({answer, currentTab}) => {
  if (answer) {
    chrome.tabs.query({},
      async tabs => {
        const existingJuyterLabTabs = await findExistingJupyterLabTab(tabs, currentTab)
        const existingJuyterLabTabsCount = existingJuyterLabTabs.length
        if (!existingJuyterLabTabsCount)
        {
          console.log('No existing tab hosting jupyter lab.')
          return
        }
        console.log(`Detect ${existingJuyterLabTabsCount} existing jupyterlab tabs. Use the first one`)
        console.log({ existingJuyterLabTabs })
        var tab = existingJuyterLabTabs[0]
        openJupyterLab(tab, retrieveUrl(currentTab), () => 
        {
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

// chrome.tabs.onCreated.addListener(
//   handleNewTab,
// )

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    console.log(`[onBeforeNavigate]: `, details)
    handleTabNavigation(details.tabId)
  }
)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request)
  if (request.type == "openInExistingTab") {
    openInExistingTab(request.options)
  }
});