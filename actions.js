const excludedTags = [
  "STYLE",
  "SCRIPT",
  "LINK",
  "LINK",
  "META",
  "NOSCRIPT",
  "IMG",
  "HEAD",
  "SVG",
  "IFRAME",
];

// Function to get the HTML content of the current tab
function getCurrentTabHtml() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // Get the tab object
    const currentTab = tabs[0];
    // Execute script in the tab to get the HTML content
    chrome.scripting.executeScript(
      {
        target: { tabId: currentTab.id },
        function: function () {
          return document.documentElement.outerHTML;
        },
      },
      function (result) {
        // Check if the script was executed successfully
        if (
          !chrome.runtime.lastError &&
          result &&
          result[0] &&
          result[0].result
        ) {
          // Display the HTML content in the div below
          const parsedHTML = parseAndDisplayHTML(result[0].result);
          document.querySelector("#htmlContent").innerHTML = parsedHTML[0];
          document.querySelector("#htmlContentExport").innerHTML =
            parsedHTML[1];
        } else {
          // Handle errors
          console.error(
            "Error retrieving HTML content:",
            chrome.runtime.lastError
          );
        }
      }
    );
  });
}

function getTextContent(node) {
  let textContent = "";
  if (node.nodeType === Node.TEXT_NODE) {
    textContent += node.textContent.trim();
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Ignore certain elements like script and style
    if (node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
      // Recursively process child nodes
      node.childNodes.forEach((childNode) => {
        textContent += getTextContent(childNode);
      });
    }
  }
  return textContent;
}

// Function to parse HTML and display tags in a table
function parseAndDisplayHTML(htmlContent) {
  // Parse HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Initialize the table HTML
  let htmlTable =
    '<button class="export-button-full">Export to Excel</button><table class="Web2TextTable"><tr><th>Tag</th><th>Text</th><th>Copy</th></tr>';
  let htmlTableExport =
    '<button class="export-button-full">Export to Excel</button><table class="Web2TextTable"><tr><th>Tag</th><th>Text</th></tr>';

  // Recursive function to traverse the DOM tree
  function traverse(node, temphtmlTable) {
    if (excludedTags.includes(node.tagName)) {
      return;
    }
    // If the node is a text node, add it to the table
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      htmlTable +=
        temphtmlTable +
        `<td>${node.textContent.trim()}</td><td><button class="copy-button" data-text-content="${node.textContent.trim()}">Copy</button></td></tr>`;

      htmlTableExport +=
        temphtmlTable + `<td>${node.textContent.trim()}</td></tr>`;
    }
    // If the node is an element node, recursively traverse its children
    else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "") {
      temphtmlTable = `<tr><td>${node.tagName}</td>`;
      node.childNodes.forEach((child) => {
        traverse(child, temphtmlTable);
      });
    }
  }

  // Start traversing the DOM tree from the root element
  doc.documentElement.childNodes.forEach((node) => {
    traverse(node);
  });

  // Close the table
  htmlTable += "</table>";
  htmlTableExport += "</table>";
  return [htmlTable, htmlTableExport];
}

// Call the function to get current tab HTML when the extension button is clicked
document.addEventListener("DOMContentLoaded", function () {
  getCurrentTabHtml();
});

document.addEventListener("click", function (event) {
  // Check if the clicked element is a button with the class 'copy-button'
  if (event.target.classList.contains("copy-button")) {
    // Get the text content associated with the button
    let elm = event.target;
    elm.innerHTML = "Copied";
    var textContent = elm.dataset.textContent;
    elm.classList.add("disabled");
    // Call the copyContent function with the text content
    copyContent(textContent);
    setTimeout(
      () => {
        elm.classList.remove("disabled");
        elm.innerHTML = "Copy";
      },
      500,
      elm
    );
  }
  if (event.target.classList.contains("export-button-full")) {
    let elm = event.target;
    elm.innerHTML = "Generating File";
    elm.classList.add("disabled");

    ExportToExcel("xlsx");

    setTimeout(
      () => {
        elm.classList.remove("disabled");
        elm.innerHTML = "Export to Excel";
      },
      800,
      elm
    );
  }
});

function ExportToExcel(type, fn, dl) {
  var elt = document.querySelector("#htmlContentExport");
  var wb = XLSX.utils.table_to_book(elt, { sheet: "sheet1" });

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // Get URL of the active tab
    const url = tabs[0].url;
    // Parse the URL to get the hostname
    var fileName = new URL(url).hostname;

    if (fileName == "") {
      fileName = "File";
    }
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const formattedDateTime = `${year}-${month}-${day}_${hours}_${minutes}`;

    return dl
      ? XLSX.write(wb, { bookType: type, bookSST: true, type: "base64" })
      : XLSX.writeFile(
          wb,
          fileName + "-" + formattedDateTime + "." + (type || "xlsx")
        );
  });
}

function copyContent(text) {
  var copyText = document.querySelector("#copyText");
  copyText.value = text;

  copyText.select();
  copyText.setSelectionRange(0, 99999); // For mobile devices

  navigator.clipboard.writeText(copyText.value);
}
