//
// Helper functions to talk to the node server to get images and watchlists.
//
import {storeWatchlistToLocalStorage} from "./watchlistHandler";

// Given an image filename, tell the node server to return it.
export async function getImageDataFromNodeServer(filename) {
    try {
        const nodeDemoServerUrl = process.env.REACT_APP_API_HOST ?? "/api";

        const rsp = await fetch(`${nodeDemoServerUrl}/image/${filename}`);
        if (rsp.status === 200) {
            const buffData = await rsp.blob();
            const buffUrl = URL.createObjectURL(buffData);
            return buffUrl;
        }
        console.log("ns - ERROR getting image data! rsp.status=", rsp.status);
    } catch (err) {
        console.log("getImage - EXCEPTION - err=", err);
    }
    return null;
}

// Given a path to a local watchlist, tell the node server
// to open it and serve us back the json.
// Note - for this to work, we need to have a Node server with a
// REST endpoint 'getWatchlist'. This work is TBD.
export async function getWatchlistDataFromNodeServer(fileObj, filepath) {
    try {
        const formdata = new FormData();
        formdata.append("imagefile", fileObj, filepath);

        const req = {
            body: formdata,
            // headers: {"Content-Type": "multipart/form-data"}, // don't include this!
            method: "POST",
        };
        const nodeDemoServerUrl = process.env.REACT_APP_API_HOST ?? "/api";

        const rsp = await fetch(`${nodeDemoServerUrl}/getWatchlist`, req);
        if (rsp.status === 200) {
            const jsonResults = await rsp.json();
            console.log("ns - got data from node server on watchlist=", jsonResults);
            storeWatchlistToLocalStorage(jsonResults, filepath);
            return jsonResults;
        }
        console.log("ns - ERROR getting watchlist! rsp.status=", rsp.status);
    } catch (err) {
        console.log("getImage - EXCEPTION - err=", err);
    }
    return {};
}
