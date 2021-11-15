// ********************************************************************
// Wikiclick Version 1.1
// Lucas Nunn <luc.nunn@gmail.com>
//
// A simple Firefox & Chrome extension to quickly look up Wikipedia
// summaries for words and terms while you read
//
// Open source, free use, whatever as long as you drop me some credit!!
// ********************************************************************

// ------------------------
// Track most recent styles
// ------------------------
var prevX;
var prevY;
var prevWidth;
var prevType;

/* Try to guess theme based on previous usage on site, or time of day */
let prevTheme = localStorage.getItem("wikiclick-theme");
if (prevTheme === null) {
    const time = new Date().getHours();
    if (7 <= time && time <= 20) {
        prevTheme = "light";
    } else {
        prevTheme = "dark";
    }
}

// -------------------------------------------------
// Get the wikipedia summary for a search term
// @param searchTerm -> term to find wiki article for
// @return           -> wikipedia summary object
// -------------------------------------------------
const getSummary = async (searchTerm) => {
    const formattedText = searchTerm.replaceAll(" ", "_");
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedText}`;

    /* Call the api and return the data */
    try {
        console.log(Date.now());
        const response = await fetch(endpoint);
        console.log(Date.now());
        const data = await response.json();
        console.log(Date.now());

        /* Throw away crappy results */
        if (
            !(
                data.extract.includes("may refer to") ||
                data.extract.includes("most often refers to") ||
                data.extract.includes("most commonly refers to")
            )
        ) {
            return {
                type: "wikipedia",
                title: data.title,
                description: data.extract,
                url: data.content_urls.desktop.page,
                image: data.thumbnail.source,
            };
        }
    } catch (error) {
        console.log("Wikiclick -- Wikipedia API call failed");
    }

    /* Return google search link */
    const formatGoogle = formattedText.replaceAll("_", "+");
    if (searchTerm.length > 50) {
        searchTerm = `${searchTerm.substring(0, 47)}...`;
    }
    return {
        type: "google",
        search: searchTerm,
        url: `https://www.google.com/search?q=${formatGoogle}`,
    };
};

// -------------------------------------------------------
// Add the wikipedia summary popup at the highlighted term
// @param xPosition -> x coordinate to place on screen
// @param yPosition -> y coordinate to place on screen
// @param wikiData  -> data from wikipedia search
// -------------------------------------------------------
const addPopup = (xPosition, yPosition, wikiData) => {
    wikiclick.href = wikiData.url;
    let width = 300;

    /* Wikipedia result */
    if (wikiData.type === "wikipedia") {
        title.innerHTML = wikiData.title;
        image.src = wikiData.image;
        summary.innerHTML = wikiData.description;

        /* Rough calculation of good width */
        if (wikiData.description.length > 900) {
            width = 400;
        }
    } else {
        /* No wiki result, link to google search */
        title.innerHTML = "No result";
        summary.innerHTML = `Click to search Google for: <span>${wikiData.search}</span>`;
    }

    /* Keep the popup on the screen */
    if (xPosition + width + 15 > window.screen.width) {
        xPosition = window.screen.width - width - 15;
    }

    setPopupStyle(xPosition, yPosition, width, prevTheme, wikiData.type);
    shadowHost.style.display = "block";
};

// -------------------------------------------------------
// Add the wikipedia summary popup at the highlighted term
// @param xPosition -> x coordinate to place on screen
// @param yPosition -> y coordinate to place on screen
// @param wikiData  -> data from wikipedia search
// -------------------------------------------------------
const addLoader = (xPosition, yPosition) => {
    /* Keep the popup on the screen */
    if (xPosition + 315 > window.screen.width) {
        xPosition = window.screen.width - 315;
    }

    setLoaderStyle(xPosition, yPosition);
    shadowHost.style.display = "block";
};

// -----------------------------------------------------------------------
// Detect a term has been highlighted, trigger popup creation and addition
// @param e -> event object
// -----------------------------------------------------------------------
const handleHighlight = async (e) => {
    let selectedText = ""; /* Highlighted text */
    let xPosition = e.pageX; /* X position of highlight */
    let yPosition = e.pageY; /* Y position of highlight */
    let element = e.target; /* HTML element we are clicking on */

    if (e.altKey && element.className !== "wikiclick") {
        /* Get selected text */
        selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            addLoader(xPosition, yPosition + 10);
            getSummary(selectedText).then((wikidata) => {
                addPopup(xPosition, yPosition + 10, wikidata);
            });
            return;
        }
    }

    /* Unless we are clicking on the popup itself, remove it */
    if (element.className !== "wikiclick") {
        shadowHost.style.display = "none";
    }
};

// ---------------------------
// A beautiful popup component
// ---------------------------

/*
 * Use shadow dom to avoid any styles from website
 */
const shadowHost = document.createElement("div");
shadowHost.className = "wikiclick";
shadowHost.style.display = "none";
document.body.insertBefore(shadowHost, document.body.firstChild);
const shadow = shadowHost.attachShadow({ mode: "open" });

/*
 * Main container
 */
const wikiclick = document.createElement("a");
wikiclick.id = "wikiclick-container";
wikiclick.target = "_blank";
wikiclick.rel = "noopener noreferrer";
wikiclick.onclick = () => {
    shadowHost.style.display = "none";
};

/* Hold the title and the theme switcher */
const titlebar = document.createElement("div");
titlebar.id = "wikiclick-titlebar";
titlebar.className = "wikiclick";

/*
 * Title
 */
const title = document.createElement("h1");
title.id = "wikiclick-title";
title.className = "wikiclick";

/*
 * Dark/light mode switcher
 */
const switcher = document.createElement("button");
switcher.id = "wikiclick-switcher";
switcher.className = "wikiclick";
switcher.innerHTML = prevTheme === "dark" ? "&#9788;" : "&#8857;";
switcher.onclick = (e) => {
    /* Stop card click link from triggering */
    e.preventDefault();
    e.stopPropagation();

    /* Switch theme and save preference in local storage */
    const dark = prevTheme === "dark";
    setPopupStyle(prevX, prevY, prevWidth, dark ? "light" : "dark", prevType);
    switcher.innerHTML = dark ? "&#8857;" : "&#9788;";
    localStorage.setItem("wikiclick-theme", dark ? "light" : "dark");
};

/*
 * Wikipedia thumbnail
 */
const image = document.createElement("img");
image.className = "wikiclick";
image.id = "wikiclick-image";
image.alt = "no wiki image but have a good day :)";

/*
 * Wikipedia summary
 */
const summary = document.createElement("p");
summary.className = "wikiclick";
summary.id = "wikiclick-summary";

/*
 * Loading animation
 */
const loader = document.createElement("div");
loader.id = "wikiclick-loader";

/*
 * Style all the elements
 */
const style = document.createElement("style");

/*
 * Merge all the elements together
 */
shadow.appendChild(style);
shadow.appendChild(wikiclick);
wikiclick.appendChild(loader);
wikiclick.appendChild(titlebar);
titlebar.appendChild(title);
titlebar.appendChild(switcher);
wikiclick.appendChild(image);
wikiclick.appendChild(summary);

const setLoaderStyle = (x, y) => {
    const dark = prevTheme === "dark";

    style.innerHTML = `
        #wikiclick-container {
            background-color: ${dark ? "#202124" : "white"};
            ${
                dark
                    ? "box-shadow: 0 14px 28px rgba(1,1,1,0.25), 0 10px 10px rgba(1,1,1,0.22);"
                    : "box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);"
            }
            font-family: "Roboto", sans-serif;
            line-height: 1.3;
            color: ${dark ? "white" : "black"};
            border-radius: 8px;
            text-decoration: none;
            
            display: flex;
            justify-content: center;
            align-items: center;

            width: 300px;
            position: absolute;
            z-index: 2147483647;
            top: ${y}px;
            left: ${x}px;
        }

        .wikiclick {
            display: none;
        }

        #wikiclick-loader {
            border: 3px solid lightgrey;
            border-top: 3px solid grey;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }        
   `;
};

// -----------------------------------------
// Set the style position of the popup
// @param x -> x coordinate of the popup
// @param y -> y coordinate of the popup
// @param width -> width of popup
// @param theme -> dark or light mode
// @param type -> wikipedia or google search
// -----------------------------------------
const setPopupStyle = (x, y, width, theme, type) => {
    const dark = theme === "dark";

    style.innerHTML = `
        #wikiclick-container {
            background-color: ${dark ? "#202124" : "white"};
            ${
                dark
                    ? "box-shadow: 0 14px 28px rgba(1,1,1,0.25), 0 10px 10px rgba(1,1,1,0.22);"
                    : "box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);"
            }
            font-family: "Roboto", sans-serif;
            line-height: 1.3;
            color: ${dark ? "white" : "black"};
            border-radius: 8px;
            text-decoration: none;

            width: ${width}px;
            position: absolute;
            z-index: 2147483647;
            top: ${y}px;
            left: ${x}px;
        }

        #wikiclick-titlebar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            padding-bottom: 0px;
        }

        #wikiclick-title {
            font-size: 18px;
            font-weight: semi-bold;
            margin: 0px;
        }

        #wikiclick-switcher {
            background: transparent;
            border: none;
            font-size: 22px;
            color: ${dark ? "white" : "black"};
            border-radius: 2px;
        }

        #wikiclick-switcher:hover {
            cursor: pointer;
        }

        #wikiclick-image {
            width: 100%;
            margin-top: 10px;
            background-color: white;
            display: ${type === "google" ? "none" : "block"};
        }

        #wikiclick-summary {
            font-size: 14px;
            margin: 0px;
            padding: 10px;
        }
         
        span {
            color: grey;
            font-style: italic;
        }

        #wikiclick-loader {
            display: none;
        }
    `;

    /* Update global state variables */
    prevX = x;
    prevY = y;
    prevWidth = width;
    prevTheme = theme;
    prevType = type;
};

// --------------------------------------------------
// Look for highlighted text after mouse click lifted
// --------------------------------------------------
document.onmouseup = handleHighlight;
