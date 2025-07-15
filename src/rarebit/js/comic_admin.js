if (inProduction()) {
    console.log(location.hostname);
    generateRSSFile(".rssGeneration", ".rssFileDownload");
} else {
    alert("upload the site to your host first! this relies on ");
}

function inProduction() {
    return location.hostname && !(
        location.hostname == "localhost"
        || location.hostname == "127.0.0.1"
        || location.hostname.slice(0,8) == "192.168."
    );
}

function generateRSSFile(outputElem, buttonElem) {
    let output = document.querySelector(outputElem);
    let download = document.querySelector(buttonElem);
    
    // if the RSS generator download button isn't even on the page,
    // then just don't generate anything!..
    if (!download) return;
    
    let doc = document.implementation.createDocument("", "", null);
    
    let rss = doc.createElement("rss");
    rss.setAttribute("version", "2.0");
    rss.setAttribute("xmlns:atom", "http://www.w3.org/2005/Atom");
    
    function element(tag, content = "", children = []) {
        let elem = doc.createElement(tag);
        elem.textContent = content;
        for (let i = 0; i < children.length; i++)
            elem.appendChild(children[i]);
        return elem;
    }
    
    let baseUrl = new Image();
    baseUrl.src = indexPage;
    baseUrl = baseUrl.src;
    
    let channel = element("channel", "", [
        element("link", baseUrl)
    ]);
    
    function item(link, pubDate, title = null, description = null) {
        let children = [
            element("link", link),
            element("pubDate", pubDate.toUTCString()),
            element("guid", link),
        ];
        
        if (title) children.push(element("title", title));
        if (description) children.push(element("description", description));
        
        return element("item", "", children);
    }
    
    let now = new Date();
    for (let i = maxpg; i > (maxpg - 5); i--) {
        if (i < 0) break;
        let data = pgData[i - 1];
        let link = baseUrl + "?pg=" + i;
        let date = now;
        if (data && data.date) date = new Date(pgData[i - 1]);
        let title = "Page " + i;
        if (data && data.title) title = pgData[i - 1].title;
        channel.appendChild(item(link, date, title));
    }
    
    rss.appendChild(channel);
    doc.appendChild(rss);
    
    let serializer = new XMLSerializer();
    let result = `<?xml version="1.0" encoding="UTF-8"?>` + serializer.serializeToString(doc);
    if (output) {
        output.value = result;
    }
    
    let blob = new Blob([result], { type: "application/rss+xml" });
    if (download) {
        download.href = URL.createObjectURL(blob);
        download.textContent = "Download Copy (don't forget to replace the old file!)";
    }
}
