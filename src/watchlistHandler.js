// Handle all watchlist activity. Export functions for others to use.
// Watchlist data is stored in browser local storage under the key 'wl'.
// The value of the key will be a JSON blob, like this:
//   { wldata: ["TEST01", "LPR123", "NOTFOUND", "ANOTHER", "MOUSE", "ANS"] }
// The object will always start with 'wldata' and be an array of strings.

// Store watchlist as name 'wl'.
export function storeWatchlistToLocalStorage(data, filename) {
    localStorage.setItem("wl", JSON.stringify({wldata: data, wlfile: filename}));
}

// Returns the watchlist data as a string.
export function getWatchlist() {
    const jsonData = localStorage.getItem("wl");
    if (jsonData) {
        const obj = JSON.parse(jsonData);
        if (obj ?? obj["wldata"]) {
            return obj["wldata"];
        }
    }
    return [];
}

// Returns the watchlist filename as a string.
export function getWatchlistFilename() {
    const jsonData = localStorage.getItem("wl");
    if (jsonData) {
        const obj = JSON.parse(jsonData);
        if (obj ?? obj["wlfile"]) {
            return obj["wlfile"];
        }
    }
    return "";
}

// Delete watchlist from local storage.
export function removeWatchlist(which) {
    localStorage.removeItem(which); // eg: "wl"
}

// On exit of the app, clear all local storage.
export function clearLocalStorage() {
    localStorage.clear();
}
