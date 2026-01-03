
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

function secondsToDateTimeString(seconds) {
    let date = new Date(seconds*1000);

    // https://stackoverflow.com/a/8888498/19194333
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;

    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    let timezone = date.toTimeString();
    timezone = timezone.slice(timezone.indexOf("("), timezone.indexOf(")")+1) 
    
    return `${formattedDate} @ ${hours}:${minutes} ${ampm} ${timezone}`;
}

module.exports = {
    nowSeconds,
    secondsFromToken,
    parseJSON,
    urlFileExt,
    extMimeType,
    urlParametersToJson,
    parseCookies,
    secondsToDateTimeString
};
