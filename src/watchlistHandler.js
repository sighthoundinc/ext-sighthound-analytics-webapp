// Handle all watchlist activity. Export functions for others to use.
// Also handle local storage of watchlist and server address data.
// Watchlist data is stored in browser local storage under the key 'wl'.
// The value of the key will be a JSON blob, like this:
//   { wldata: ["TEST01", "LPR123", "NOTFOUND", "ANOTHER", "MOUSE", "ANS"] }
// The object will always start with 'wldata' and be an array of strings.


// WATCHLIST FUNCTIONS

// Returns the watchlist data as a string.
export function getLSWatchlist() {
    const jsonData = localStorage.getItem("wl");
    if (jsonData) {
        const obj = JSON.parse(jsonData);
        if (obj ?? obj["wldata"]) {
            return obj["wldata"];
        }
    }
    return [];
}

// Store watchlist as name 'wl'.
export function setLSWatchlist(data) {
    localStorage.setItem("wl", JSON.stringify({wldata: data}));
}

// Delete watchlist from local storage.
export function removeWatchlistFromLS(which) {
    localStorage.removeItem(which); // eg: "wl"
}

export function getLSWatchlistToggle() {
    return JSON.parse(localStorage.getItem("wlEnabled")) || false;
}

export function setLSWatchlistToggle(value) {
    localStorage.setItem("wlEnabled", JSON.stringify(value));
}

// Returns the watchlist filename as a string.
export function getLSWatchlistFilename() {
    return JSON.parse(localStorage.getItem("wlFile")) || "";
}

export function setLSWatchlistFilename(value) {
    localStorage.setItem("wlFile", JSON.stringify(value));
}

// Delete watchlist filename from local storage.
export function removeWatchlistFilenameFromLS() {
    localStorage.removeItem("wlFile");
}


// SERVER ADDRESS FUNCTIONS

export function getLSServerToggle() {
    return JSON.parse(localStorage.getItem("serverEnabled")) || false;
}

export function setLSServerToggle(value) {
    localStorage.setItem("serverEnabled", JSON.stringify(value));
}

export function getLSServerAddress() {
    return JSON.parse(localStorage.getItem("serverAddress")) || "";
}    

export function setLSServerAddress(value) {
    localStorage.setItem("serverAddress", JSON.stringify(value));
}


// MISC FUNCTIONS

// On exit of the app, clear all local storage.
export function clearLocalStorage() {
    localStorage.clear();
}
