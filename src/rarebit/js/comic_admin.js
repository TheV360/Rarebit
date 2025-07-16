const runLocation = document.querySelector('.runLocation');
if (inProduction()) {
    runLocation.value = calculateIndexPage();
    generateRSSFile(".rssGeneration", ".rssFileDownload", ".rssFileValidator");
} else {
    runLocation.value = "your own computer";
    generateRSSFile(".rssGeneration", null, null);
}

function calculateIndexPage() {
    const path = location.href.slice(0, location.href.lastIndexOf('/') + 1);
    return path + "index.html";
}

function inProduction() {
    return location.hostname && !(
        location.hostname == "localhost"
        || location.hostname == "127.0.0.1"
        || location.hostname.slice(0,8) == "192.168."
    );
}

function makeRSSDocument(lastXPages = 10) {
    const doc = document.implementation.createDocument("", "", null);
    
    // where and when comics are
    const now = new Date();
    const baseUrl = new URL(calculateIndexPage());
    
    // finding yourself
    const findFeedDiscover = `head > link[rel="alternate"][type="application/rss+xml"]`;
    const feedDiscover = document.querySelector(findFeedDiscover);
    const feedLocation = new URL(feedDiscover.href, baseUrl);
    
    // building <items>s
    const folderPrefix = folder ? `${folder}/` : "";
    
    // shortcut for elements that don't have anything fancy going on with them.
    // the exact same as creating an element, and either (1) setting its textContent as a string or (2) giving it some specified children as an array. relatively easy to chain with -- just for the sake of being less wordy and having the structure be a bit more visually obvious.
    function element(tag, content = "") {
        /**
         * @type {Element}
         */
        let elem = doc.createElement(tag);
        if (typeof content === 'string') {
            elem.textContent = content;
        } else for (let i = 0; i < content.length; i++) {
            elem.appendChild(content[i]);
        }
        return elem;
    }
    
    // special version of the above that lets you set attributes too.
    function elementAttrs(tag, attrs = {}, content = "") {
        let elem = element(tag, content);
        for (let key in attrs) {
            elem.setAttribute(key, attrs[key]);
        }
        return elem;
    }
    
    // we're going to be making a lot of comic page <item>s in the <channel> we make, so this is a helper function to make an <item> from a page number.
    function comicPageItem(page) {
        const data = pgData[page - 1];
        
        let title = "Page " + page;
        let description = "";
        let link = baseUrl + "?pg=" + page;
        let pubDate = now;
        
        if (data) { // for this page, do we have any page data?
            if (data.date) { // ...was a date given?
                // RSS expects a specific type of date, so we gotta turn the string back into a javascript date object for further processing.
                const dataDate = new Date(data.date);
                if (isNaN(dataDate)) { // is the date invalid?
                    console.warn(`Date "${data.date}" provided for Page #${page} is not valid!`);
                } else {
                    pubDate = dataDate;
                }
            }
            if (data.title) // ...was a title given?
                title = data.title;
            
            if (rssPutComicInDescription) {
                const isSegmented = (data.imageFiles > 1);
                const segments = isSegmented ? data.imageFiles : 1;
                for (let seg = 1; seg <= segments; seg++) {
                    const segmentSuffix = isSegmented ? `${imgPart}${seg}` : "";
                    const src = `${folderPrefix}${image}${page}${segmentSuffix}.${ext}`;
                    if (seg > 1) description += `<br />`;
                    if (data.altText) {
                        description += `<img alt="` + data.altText + `" title="` + data.altText + `" src="` + src + `" />`;
                    } else {
                        description += `<img src="` + src + `" />`;
                    }
                }
            }
            if (rssPutAuthorNotesInDescription) {
                description += data.authorNotes;
            }
        }
        
        // RSS expects dates to be in the format that toUTCString gives us.
        pubDate = pubDate.toUTCString();
        
        // all good to go, let's make this comic page into an RSS item, and put that item into the channel that represents our comic!
        return element("item", [
            // https://www.rssboard.org/rss-specification#hrelementsOfLtitemgt
            
            element("title", title),
            element("description", description),
            
            element("link", link),
            element("pubDate", pubDate),
            
            element("guid", link),
        ]);
    }
    
    let channel;
    const rss = elementAttrs("rss", {
        "version": "2.0",
        "xmlns:atom": "http://www.w3.org/2005/Atom",
    }, [
        channel = element("channel", [
            // https://www.rssboard.org/rss-specification#requiredChannelElements
            
            element("link", baseUrl),
            element("title", rssTitle),
            element("description", rssDescription),
            
            element("generator", "Rarebit RSS"),
            element("lastBuildDate", now.toUTCString()),
            
            // https://www.rssboard.org/rss-validator/docs/warning/MissingAtomSelfLink.html
            atomLink = elementAttrs("atom:link", {
                "href": feedLocation,
                "rel": "self",
                "type": "application/rss+xml",
            }),
        ])
    ]);
    
    const firstPage = Math.max(1, maxpg - lastXPages);
    for (let pg = firstPage; pg <= maxpg; pg++) {
        channel.appendChild(comicPageItem(pg));
    }
    
    doc.appendChild(rss);
    return doc;
}

function generateRSSFile(outputElem, buttonElem, rssValidatorElem) {
    let output = document.querySelector(outputElem);
    let download = document.querySelector(buttonElem);
    let rssValidator = document.querySelector(rssValidatorElem);
    
    const doc = makeRSSDocument();
    const serializer = new XMLSerializer();
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    const result = xmlHeader + serializer.serializeToString(doc);
    if (output) {
        output.value = result;
    }
    
    let blob = new Blob([result], { type: "application/rss+xml" });
    if (download) {
        download.href = URL.createObjectURL(blob);
        download.textContent = "Download Copy (don't forget to replace the old file!)";
    }
    
    if (rssValidator) {
        rssValidator.href = `https://www.rssboard.org/rss-validator/check.cgi?url=${encodeURIComponent(feedLocation)}`;
    }
}
