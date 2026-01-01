function escape(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

function jsonToUrlParameters(json) {
    let out = "?";
    for (const key in json) {
        const value = ""+json[key];
        if (value.length > 0) {
            if (out.length > 1) {
                out += "&";
            }
            out += `${key}=${json[key]}`;   
        }
    }
    return out;
}

function parseCookies(cookies) {
    return Object.fromEntries(cookies.split("; ").map(s => {
        var e = s.indexOf("=");
        return [s.slice(0, e), s.slice(e + 1, s.length)];
    }));
}

function deleteAuthToken() {
    document.cookie = 'token=; max-age=-1000; Secure; path=/';
}

function logout() {
    fetch("/API/logout", {
        method: "POST",
        body: ""
    }).then(async (res) => {
        if (res.status !== 200) {
            return Promise.resolve(`Error: ${await res.text()}`);
        }
        return res.text();
    }).then(res => {
        if (res.startsWith("Error: ")) {
            alert(res);
        } else {
            // delete auth cookie
            deleteAuthToken();
            window.location.reload();
        }
    })
}

if (!loggedIn && parseCookies(document.cookie ?? "")) {
    // the user auth token is invalid so delete it
    deleteAuthToken();
}

function renderError(errorMessage) {
    let errorEl = document.getElementById("form-error-message");
    if (errorEl) {
        errorEl.style.display = "block";
        errorEl.innerText = errorMessage;
        try {
            if (errorMessage.startsWith("[")) {
                // is a validator error
                const parsed = JSON.parse(errorMessage)[0];
                
                // for Ajv
                // errorEl.innerText = parsed.instancePath.slice(1) + " " + parsed.message;

                // for custom validator
                errorEl.innerText = parsed;
            }
        } catch (e) { console.error(e) }
    }
}

async function fetchMiddleware(res) {
    let out;
    if (res.status !== 200) {
        const errorMessage = await res.text();
        if (errorMessage.startsWith("Error: ")) {
            out = errorMessage;
        } else {
            out = `Error: ${errorMessage}`;
        }
        renderError(errorMessage);
        return Promise.resolve(out);
    }

    let contentType = res.headers.get("content-type");
    if (contentType === "application/json") {
        out = await res.json();
    } else {
        out = await res.text();
        if (out.startsWith("Error: ")) {
            renderError(out.replace("Error: ", ""));
        }
    }
    return Promise.resolve(out);
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

function timeStringToSeconds(timeStr) {
    if (timeStr.length === 0) return "";
    return Math.round(new Date(timeStr).valueOf() / 1000);
}