
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

function urlParametersToJson(urlParamstring) {
    const json = {};
    try {
        const entries = new URLSearchParams(urlParamstring.slice(Math.max(0, urlParamstring.indexOf("?")))).entries();
        for (const [key, value] of entries) {
            json[key] = value;
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
    urlParametersToJson,
    parseCookies
};
