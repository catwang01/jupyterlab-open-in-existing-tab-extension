const page = document.getElementById('root');

const renderPage = () => {
  var div = document.createElement("div")
  div.className = "container"

  var p = document.createElement("p")
  var span = document.createElement("span")
  p.appendChild(span)

  chrome.storage.sync.get().then(
    (value) => {
      span.textContent = `current value: ${value.prefix}`
    }
  )
  var input = document.createElement("input")
  var button = document.createElement("button")
  button.textContent = "save"
  div.appendChild(input)
  div.appendChild(button)
  div.appendChild(p)

  const handleButtonClick = (e) => {
    console.log({ prefix: input.value })
    chrome.storage.sync.set({ prefix: input.value })
    alert("saved!")
  }

  button.addEventListener('click', handleButtonClick)
  page.append(div);

  chrome.storage.onChanged.addListener(
    (value) => {
      span.textContent = `current value: ${value.prefix.newValue}`
    }
  )
}

renderPage()