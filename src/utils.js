function nowSeconds() {
    return Date.now() / 1000;
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
        const entries = new URLSearchParams(urlParamstring).entries();
        for (const [key, value] of entries) {
            json[key] = value;
        }
    } catch (e) {}
    return json;
}

module.exports = {
    nowSeconds,
    parseJSON,
    urlFileExt,
    urlParametersToJson
};