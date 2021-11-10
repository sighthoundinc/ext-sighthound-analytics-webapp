// This file handles the header part of the UI.
// The header consists of: 1) the logo, 2) the "Use Watchlist" checkbox,
// 3) the "Choose file" button (and filename after a watchlist is picked).
// It reports back to its parent (App.jsx) the value of any watchlist file chosen.
// Note: All the watchlist UI controls can be hidden by passing showWLUI = false.

import '../App.css';
import React from 'react';
import {
    getLSWatchlistFilename,
    setLSWatchlistFilename,
} from "../watchlistHandler";

function Header({
    toggleUseWatchlist,
    toggleUseServer,
    setWatchListInParent,
    setServerAddress,
    serverAddress,
    clearWLData,
    watchlistChecked,
    showIpUI,
    showWLUI,
    ipServerChecked,
    showResultsNow,
    connected,
}){

    return(
        <div>
            <nav>
                <img src="/Sighthound_Logo_Horizontal_Dark.png" alt="Sighthound Logo" />
                { showIpUI &&
                    <div style={{width: 140}}>
                        <div style={{display: "flex", flexDirection: "column", alignItems: "left"}}>
                            <div>
                            <label htmlFor="server" style={{height: 18, width: 89}}>
                                Specify Server
                            </label>
                            <input
                                id="server"
                                checked={ipServerChecked}
                                type="checkbox"
                                style={{marginRight: 7}}
                                onChange={() => toggleUseServer()}
                            />
                            { ipServerChecked &&
                                <div>
                                    <input
                                        placeholder="Server Address"
                                        id="server"
                                        type="text"
                                        value={serverAddress}
                                        onChange={(val) => setServerAddress(val)}/>
                                </div>
                            }
                            </div>
                            <div>
                                <button className="resultsButton" onClick={showResultsNow}>
                                    Show Results
                                </button>
                            </div>
                            <div>
                                <p style={{margin: "5px 0 0 0", fontSize: "0.8rem"}}>
                                    Connected:
                                    {connected ? 
                                        <span className="greenDot"></span>
                                    :
                                        <span className="redDot"></span>
                                    }
                                    
                                </p>
                            </div>
                        </div>
                    </div>
                }

                { showWLUI &&
                    <div style={{width: 260}}>
                        <div style={{display: "flex", alignItems: "center"}}>
                            {/* Need to disable this checkbox if no watchlist is uploaded */}
                            <label htmlFor="watchlist" style={{height: 18}}>
                                Use Watchlist
                            </label>
                            <input
                                id="watchlist"
                                checked={watchlistChecked}
                                type="checkbox"
                                onChange={() => toggleUseWatchlist()}
                            />
                            { watchlistChecked && renderWatchlistUI(setWatchListInParent, clearWLData) }
                        </div>
                    </div>
                }

            </nav>
        </div>
    )
}

function renderWatchlistUI(
    setWatchListInParent,
    clearWLData
) {
    const fileInput = React.createRef();
    const buttonInput = React.createRef();
    const storedWatchfileName = getLSWatchlistFilename();
    const buttonText = storedWatchfileName || "Select File...";

    const handleWatchList = async (fileObj, filepath) => {
        const filename = filepath.substring(filepath.lastIndexOf("\\") + 1);
        setWatchListInParent(fileObj, filename);
    }

    return (
        <div style={{flex: 1}}>
            {/* We will need to store this file somewhere, then access in App scratchpad: value={watchlistFile} */}
            <button
                id="getFileButton"
                style={{marginBottom: 4}}
                ref={buttonInput}
                onClick={(e) => { e.preventDefault(); fileInput.current.click(); }}
            >
                {buttonText}
            </button>
            <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                    if (e.target.files) {
                        const fileObj = e.target.files[0]; // just get first
                        if (e.target.value) {
                            // Get rid of path component to name, just take letters past the last slash.
                            buttonInput.current.innerText = e.target.value.substring(e.target.value.lastIndexOf("\\") + 1); 
                            handleWatchList(fileObj, e.target.value);
                            setLSWatchlistFilename(buttonInput.current.innerText);
                        }
                    }
                }}
                style={{display: "none", marginBottom: 1}}
                ref={fileInput} 
            />
            <button
                style={{marginRight: 5}}
                id="getFileButton"
                onClick={(e) => {
                    e.preventDefault();
                    clearWLData();
                    buttonInput.current.innerText = "Select File...";
                    fileInput.current.value = "";
                }}
            >
                Clear Watchlist Data
            </button>
        </div>
    );
}

export default Header;
