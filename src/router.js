const ejs = require('ejs');

const fs = require("./hardened-fs");

function urlFileExt(url) {
    let idx = url.lastIndexOf(".");
    if (idx == -1) {
        return "";
    }
    return url.slice(idx + 1);
}

function renderEJS(template, data) {
    return ejs.renderFile(`./src/templates/${template}.ejs`, data);
}

const routeTree = {
    "/": async (path, out, data) => {    
        // main path
        const rendered = await renderEJS("base", {
            ...data,
            title: "Raven Drives - Home",
            content: await renderEJS("index", {
                ...data
            })
        });
        
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write(rendered);
    },
    "/ping": async (path, out, data) => {
        // main path
        out.writeHead(200, { 'Content-Type': 'text/html' });
        out.write("Pong!");
    },
    "/static/": async (path, out, data) => {
        // stop browsers from complaining about CORS issues
        out.setHeader("Access-Control-Allow-Origin", "*");

        // figure out the type of file
        let fileExt = urlFileExt(path);
        let fileType = "text";
        let fileSubType = "plain";

        if (["png", "ico", "svg", "jpg"].includes(fileExt)) fileType = "image";
        if (fileExt === "js") {
            fileSubType = "javascript";
        } else if (fileExt === "svg") {
            fileSubType = "svg+xml";
        } else {
            fileSubType = fileExt;
        }

        // tell client to cache stuff for 1 week in production
        if (!SECRETS.DEV) {
            out.setHeader("Cache-Control", "public, max-age=" + (60 * 60 * 24 * 7));
        }

        let fetchPath = "./src/static/" + path;
        let dataOut = null;

        try {
            dataOut = fs.readFileSync(fetchPath);
        } catch (e) {
            dataOut = null;
        }

        if (dataOut !== null) {
            // send file
            out.writeHead(200, { "Content-Type": `${fileType}/${fileSubType}` });
            out.write(dataOut);
        } else {
            out.writeHead(404);
            out.write("404 Not Found");
        }
    }
};

module.exports = {
    routeTree
};