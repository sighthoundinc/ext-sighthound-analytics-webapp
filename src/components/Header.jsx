// This file handles the header part of the UI.
// The header consists of: 1) the logo, 2) the "Use Watchlist" checkbox,
// 3) the "Choose file" button (and filename after a watchlist is picked).
// It reports back to its parent (App.jsx) the value of any watchlist file chosen.
// Note: All the watchlist UI controls can be hidden by passing showWLUI = false.

import '../App.css';
import React from 'react';
import {getWatchlistFilename} from "../watchlistHandler";

function Header({watchlistAvailable, toggleUseWatchlist, setWatchListInParent, clearWLData, showWLUI}){

    const fileInput = React.createRef();
    const buttonInput = React.createRef();
    const storedWatchfileName = getWatchlistFilename();
    const buttonText = storedWatchfileName || "Select File...";

    const handleWatchList = async (fileObj, filepath) => {
        const filename = filepath.substring(filepath.lastIndexOf("\\") + 1);
        setWatchListInParent(fileObj, filename);
    }

    return(
        <div>
            <nav>
                <img src="/Sighthound_Logo_Horizontal_Dark.png" alt="Sighthound Logo" />
                { showWLUI &&
                    <div>
                    <div>
                        <div>
                            {/* Need to disable this checkbox if no watchlist is uploaded */}
                            <label 
                                style={!watchlistAvailable ? {color: "rgba(38, 41, 66, .4)"} : null}
                                htmlFor="watchlist"
                            >
                                Use watchlist
                            </label>
                            <input disabled={!watchlistAvailable} id="watchlist" type="checkbox" onChange={() => toggleUseWatchlist()}/>

                        </div>
                    </div>
                    {/* We will need to store this file somewhere, then access in App scratchpad: value={watchlistFile} */}
                    <button
                        id="getFileButton"
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
                                console.log("header - got files from user input=", e.target.files);
                                const fileObj = e.target.files[0]; // just get first
                                if (e.target.value) {
                                    // Get rid of path component to name, just take letters past the last slash.
                                    buttonInput.current.innerText = e.target.value.substring(e.target.value.lastIndexOf("\\") + 1); 
                                    handleWatchList(fileObj, e.target.value)
                                }
                            }
                        }}
                        style={{display: "none"}}
                        ref={fileInput} 
                    />
                    <button
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
            }
            </nav>
        </div>
    )
}

export default Header;
