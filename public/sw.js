// @ts-check
/// <reference lib="webworker" />

const cache = caches.open("app");
/** @type {Client | null}*/
let loggingClient = null;
/** @type {{message: string, error: any}[]}*/
let errorsToSend = [];

addEventListener("install", _ => {
    skipWaiting();
    console.log("%c[sw]", "color: gold", "service worker updated");
});

addEventListener("message", e => exp("nelze odpovědět na zprávu", async () => {
    if(e.data != "x-log") {
        console.error("%c[sw]", "color: yellow", "unknown message:", e.data);
        return;
    }
    const matched = await clients.matchAll();
    if(matched.length == 0) {
        console.log("%c[sw]", "color: red", "no clients");
        return;
    }
    for(const error of errorsToSend) {
        matched[0].postMessage(error);
    }
    errorsToSend.length = 0;
}));

addEventListener("fetch", e => exp("chyba při řešení požadavku", async () => {
    if(new URL(e.request.url).origin != location.origin) {
        // console.log("ignoring ", e);
        return;
    }
//     /** @type {string} */
//     const pathname = e.request.pathname;

// const hash = pathname.match(/()/)
    e.respondWith(intercept(e));
}));

/**
 * @param e {FetchEvent}
 * @returns {Promise<Response>}
 * */
async function intercept(e) {
    const cached = await (await cache).match(e.request);
    if(cached == undefined) {
        console.log("%c[sw]", "color: gold", "caching: ", e.request);
        const res = await fetch(e.request);
        await (await cache).put(e.request, res);
        const newCached = (await (await cache).match(e.request));
        if(newCached == null) {
            console.error("%c[sw]", "color: yellow", "could not cache a request", e.request);
            return await fetch(e.request);
        }
        return newCached;
    }
    if(!navigator.onLine) return cached;
    const res = await exp("cannot check for updates", () => fetch(e.request));
    if(!res) return cached;
    if(!res.ok) {
        console.log("%c[sw]", "color: red", "cannot check for updates", res);
        return cached;
    };
    // TODO: debug on firebase hosting
    // if(checkUpdate(res, cached)) {
    await (await cache).put(e.request, res);
    // }
    return cached;
}

/**
 * @param {Response} res
 * @param {Response} cached
 * @returns {boolean}
 */
function checkUpdate(res, cached) {
    const resTag = res.headers.get("Etag")
    if(resTag == null) {
        console.log("%c[sw]", "color: gold", "response isn't etagged, updating:", res);
        return true;
    }
    const cacheTag = cached.headers.get("Etag")
    if(cacheTag == null) {
        console.log("%c[sw]", "color: gold", "cache isn't etagged, updating:", res);
        return true;
    }
    if(cacheTag != resTag) {
        console.log("%c[sw]", "color: gold", "new etag, updating:", res);
        return true;
    }
    console.log("%c[sw]", "color: gold", "cache up to date:", res);
    return false;
}

/**
 * @template T
 * @param {any} message
 * @param {() => Promise<T>} callback
 * @returns {Promise<T | null>}
 */
async function exp(message, callback) {
    try {
        return await callback();
    } catch (error) {
        const errorMessage = {
            message,
            error: JSON.stringify(error),
        };
        if (loggingClient == null) {
            console.error("%c[sw] %c(not sent yet)", "color: yellow", "color: gray", `${message}: `, error, JSON.stringify(error));
            errorsToSend.push(errorMessage);
        } else {
            console.error("%c[sw]", "color: yellow", message, error);
            loggingClient.postMessage(errorMessage);
        }
        return null;
    }
}