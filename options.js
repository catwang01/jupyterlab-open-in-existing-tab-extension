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

// Reacts to a button click by marking the selected button and saving
// the selection
// function handleButtonClick(event) {
//   // Remove styling from the previously selected color
//   const current = event.target.parentElement.querySelector(
//     `.${selectedClassName}`
//   );
//   if (current && current !== event.target) {
//     current.classList.remove(selectedClassName);
//   }

//   // Mark the button as selected
//   const color = event.target.dataset.color;
//   event.target.classList.add(selectedClassName);
//   chrome.storage.sync.set({ color });
// }

// // Add a button to the page for each supplied color
// function constructOptions(buttonColors) {
//   chrome.storage.sync.get('color', (data) => {
//     const currentColor = data.color;

//     // For each color we were provided…
//     for (const buttonColor of buttonColors) {
//       // …create a button with that color…
//       const button = document.createElement('button');
//       button.dataset.color = buttonColor;
//       button.style.backgroundColor = buttonColor;

//       // …mark the currently selected color…
//       if (buttonColor === currentColor) {
//         button.classList.add(selectedClassName);
//       }

//       // …and register a listener for when that button is clicked
//       button.addEventListener('click', handleButtonClick);
//       page.appendChild(button);
//     }
//   });
// }

// Initialize the page by constructing the color options
// constructOptions(presetButtonColors);