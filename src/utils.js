
function nowSeconds() {
    return Math.round(Date.now() / 1000);
}

function secondsFromToken(token) {
    return Number(token.split("-")[0]);
}

function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        return null;
    }
}

function urlFileExt(url) {
    let idx = url.lastIndexOf(".");
    if (idx == -1) {
        return "";
    }
    return url.slice(idx + 1);
}

function extMimeType(fileExt) {
    let fileType = "text";
    let fileSubType = "plain";

    const fileTypes = {
        "image": ["png", "ico", "svg", "jpg"],
    };

    for (const superType in fileTypes) {
        if (fileTypes[superType].includes(fileExt)) {
            fileType = superType;
        }
    }

    const subTypeMappings = {
        "js": "javascript",
        "svg": "svg+xml",
    };

    if (subTypeMappings[fileExt]) {
        fileSubType = subTypeMappings[fileExt];
    } else {
        fileSubType = fileExt;
    }

    return `${fileType}/${fileSubType}`;
}

function urlParametersToJson(urlParamstring) {
    const json = {};
    try {
        const entries = new URLSearchParams(urlParamstring.slice(Math.max(0, urlParamstring.indexOf("?")))).entries();
        for (const [key, value] of entries) {
            if (!key.startsWith("http:") && !key.startsWith("https:") && !key.includes("/")) {
                json[key] = value;
            }
        }
    } catch (e) {}
    return json;
}

function parseCookies(cookies) {
    return Object.fromEntries(cookies.split("; ").map(s => {
        var e = s.indexOf("=");
        return [s.slice(0, e), s.slice(e + 1, s.length)];
    }));
}

module.exports = {
    nowSeconds,
    secondsFromToken,
    parseJSON,
    urlFileExt,
    extMimeType,
    urlParametersToJson,
    parseCookies
};
