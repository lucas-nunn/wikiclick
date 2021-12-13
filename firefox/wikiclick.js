// ********************************************************************
// Wikiclick Version 1.2
// Lucas Nunn <luc.nunn@gmail.com>
//
// A simple Firefox & Chrome extension to quickly look up Wikipedia
// summaries for words and terms while you read
//
// Open source, free use, whatever as long as you drop me some credit!!
// ********************************************************************

// ------- preserve previous styles -------
var prevX;
var prevY;
var prevWidth;
var prevType;

let prevTheme = localStorage.getItem("wikiclick-theme");
if (prevTheme === null) {
    const time = new Date().getHours();
    if (7 <= time && time <= 20) {
        prevTheme = "light";
    }
    else {
        prevTheme = "dark";
    }
}

// -------------------------------------------
// Get the wikipedia summary for a search term
// searchTerm - term to find wiki article for
// return     - wikipedia summary object
// -------------------------------------------
const getData = async (searchTerm) => {
    /* format the text */
    const formatAPI = searchTerm.replaceAll(" ", "_");
    const endpoint  = `https://en.wikipedia.org/api/rest_v1/page/summary/${formatAPI}`;
    const formatGoogle = formatAPI.replaceAll("_", "+");
    if (searchTerm.length > 50) {
        searchTerm = `${searchTerm.substring(0, 47)}...`;
    }

    /* default return if no result */
    const fail = {
        type  : "google",
        search: searchTerm,
        url   : `https://www.google.com/search?q=${formatGoogle}`,
    };

    /* call the api and return the data */
    try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (
            data.extract.includes("may refer to") ||
            data.extract.includes("most often refers to") ||
            data.extract.includes("most commonly refers to")
        ) {
            return fail;
        } else {
            return {
                type       : "wikipedia",
                title      : data.title,
                description: data.extract,
                url        : data.content_urls.desktop.page,
                image      : data.thumbnail.source,
            };
        }
    }
    catch {
        console.log("Wikiclick -- No result from Wikipedia API");
        return fail;
    }
};

// -------------------------------------------------------
// Add the wikipedia summary popup at the highlighted term
// xPosition - x coordinate to place on screen
// yPosition - y coordinate to place on screen
// wikiData  - data from wikipedia search
// -------------------------------------------------------
const addPopup = async (xPosition, yPosition, searchTerm) => {
    /* Keep the popup on the screen */
    if (xPosition + 315 > window.screen.width) {
        xPosition = window.screen.width - 315;
    }

    /* add loading indicator */
    shadow.appendChild(wikiclick);
    setLoaderStyle(xPosition, yPosition);

    /* get data from Wikipedia api */
    const wikiData = await getData(searchTerm)

    /* add final popup */
    wikiclick.href = wikiData.url;
    if (wikiData.type === "wikipedia") {
        title.innerHTML   = wikiData.title;
        image.src         = wikiData.image;
        summary.innerHTML = wikiData.description;
    }
    else {
        title.innerHTML   = "No result";
        summary.innerHTML = `Click to search Google for: <span>${wikiData.search}</span>`;
    }

    setPopupStyle(xPosition, yPosition, 300, prevTheme, wikiData.type);
};

// -----------------------------------------------------------------------
// Detect a term has been highlighted, trigger popup creation and addition
// e - event object
// -----------------------------------------------------------------------
const onHighlight = (e) => {
    let selectedText = ""; /* Highlighted text */
    let xPosition = e.pageX; /* X position of highlight */
    let yPosition = e.pageY; /* Y position of highlight */
    let element = e.target; /* HTML element we are clicking on */

    if (e.altKey && element.className !== "wikiclick") {
        selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            addPopup(xPosition, yPosition + 10, selectedText);
        }
    } else if (element.className !== "wikiclick") {
        wikiclick.remove();
    }
};

// ---------------------------
// A beautiful popup component
// ---------------------------

// ------- use shadow dom to avoid any styles from website -------
const shadowHost = document.createElement("div");
shadowHost.className = "wikiclick";
document.body.insertBefore(shadowHost, document.body.firstChild);
const shadow = shadowHost.attachShadow({ mode: "open" });

// ------- main container -------
const wikiclick = document.createElement("a");
wikiclick.id = "wikiclick-container";
wikiclick.target = "_blank";
wikiclick.rel = "noopener noreferrer";
wikiclick.onclick = () => {
    wikiclick.remove();
};

// ------- hold the title and the theme switcher --------
const titlebar = document.createElement("div");
titlebar.id = "wikiclick-titlebar";
titlebar.className = "wikiclick";

// ------- title -------
const title = document.createElement("h1");
title.id = "wikiclick-title";
title.className = "wikiclick";

// ------- Dark/light mode switcher --------
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

// ------- Wikipedia thumbnail --------
const image = document.createElement("img");
image.className = "wikiclick";
image.id = "wikiclick-image";
image.alt = "no wiki image but have a good day :)";

// ------- Wikipedia summary -------
const summary = document.createElement("p");
summary.className = "wikiclick";
summary.id = "wikiclick-summary";

// ------- Loading animation -------
const loader = document.createElement("div");
loader.id = "wikiclick-loader";

// ------- Style all the elements -------
const style = document.createElement("style");

// ------- Merge all the elements together -------
shadow.appendChild(style);
wikiclick.appendChild(loader);
wikiclick.appendChild(titlebar);
titlebar.appendChild(title);
titlebar.appendChild(switcher);
wikiclick.appendChild(image);
wikiclick.appendChild(summary);

// ---------------------------------
// Set style for loading indicator
// x - x coordinate of the popup
// y - y coordinate of the popup
// ---------------------------------
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
            width: 300px;
            height: 375px; 
            cursor: progress; 
            background-color: ${dark ? "#202124" : "white"};
            background: 
                linear-gradient(0.25turn, transparent, ${dark ? "black" : "white"}, transparent),
                linear-gradient(${dark ? "#303030" : "#eee"}, ${dark ? "#303030" : "#eee"}),
                linear-gradient(${dark ? "#303030" : "#eee"}, ${dark ? "#303030" : "#eee"}),
                linear-gradient(${dark ? "#303030" : "#eee"}, ${dark ? "#303030" : "#eee"}),
                linear-gradient(${dark ? "#303030" : "#eee"}, ${dark ? "#303030" : "#eee"});
            background-repeat: no-repeat;
            background-size: 300px 600px, 240px 35px, 280px 200px, 260px 30px, 270px 30px, 240px 30px; 
            background-position: -300px 0px, 10px 10px, 10px 55px, 10px 265px, 10px 300px, 10px 335px; 
            animation: loading 1s infinite;
        }

        @keyframes loading {  
            to {
                background-position: 300px 0px, 10px 10px, 10px 55px, 10px 265px, 10px 300px, 10px 335px; 
            }
        }
   `;
};

// ---------------------------------
// Set style for results popup
// x - x coordinate of the popup
// y - y coordinate of the popup
// width - width of popup
// theme - dark or light mode
// type - wikipedia or google search
// ---------------------------------
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
document.onmouseup = onHighlight;
