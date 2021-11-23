import './App.css';
import "@fontsource/lexend"
import React from 'react';
import Modal from "react-modal";
import * as moment from "moment";

import ImageGrid from "./components/ImageGrid";
import Header from "./components/Header";
import CroppedImage from './components/CroppedImage';
import {handleWebSocket} from "./websocketUtils";
import {Queue} from "./Queue";
import {
    removeWatchlistFromLS,
    getLSWatchlist,
    getLSWatchlistFilename,
    getLSServerAddress,
    setLSServerAddress,
    getLSServerToggle,
    setLSServerToggle,
    getLSWatchlistToggle,
    setLSWatchlistToggle,
    removeWatchlistFilenameFromLS,
} from "./watchlistHandler";
import {
    getImageFromNodeServer,
    getWatchlistFromNodeServer,
} from "./nodeServer";

// Styles for the modal dialog.
const customModalStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      width: '800px',
    },
};
Modal.setAppElement('#root'); // set app root element for modal

/*
Format of car and LP data we get:
https://github.com/sighthoundinc/cloud-platform-schemas/blob/master/anypipe/examples/sighthoundAnalytics.json

Format of car and LP data we will keep (from all json data rcvd);
this will be combined car/lp/person data for those cars, license plates and people
that are linked together:
    'detections' format:
        carId: string     // fill in when process links
        lpId: string
        personId: string
        imageData: string // url of image data
        bestTS: number    // in ms; will be bestTS of object found
        firstTS: number   // in ms; will be firstTS of object found
        boxCar: { height: number, width: number, x: number, y: number }
        boxLp: { height: number, width: number, x: number, y: number }
        boxPerson: { height: number, width: number, x: number, y: number }
        carValue1: string // make/model
        carValue2: string // color
        lpValue1: string  // string
        lpValue2: string  // region
        type: string      // 'car' or 'lp' or 'person'
        links: array      // array of objects to correlate car <--> lp
        srcId: string     // id of the camera source
        timeIn: number    // in ms; time since epoch of when this detection arrived via websocket
        frameId: string   // id of the frame; points to the image
        lpValueConf: number  // confidence of the license plate string
        lpRegionConf: number // confidence of the license plate region
        mmConf: number       // confidence of the make/model values
        colorConf: number    // confidence of the car color
*/
let emptying = false;        // flag indicating we're emptying the que, so don't re-enter que emptying fn
let userControl = false;     // flag indicating the user controls which car is displayed on top part
let showWatchlistUI = false; // flag indicating if we want to show the watchlist controls
let showIpUI = true;         // flag indicating if we want to show the IP controls
let stompClient = null;
let csvText = "";
let csvFilename = "";

function App() {
    const [selectedDetection, setSelectedDetection] = React.useState({});
    const [useWatchlist, setUseWatchlist] = React.useState(false); // state of checkbox
    const [useServer, setUseServer] = React.useState(true);
    const [, setShowResults] = React.useState(false);
    const [watchlist, setWatchlist] = React.useState(""); // actual watchlist string
    const [serverHostAddress, setServerHostAddress] = React.useState("");
    const [carDetections, setCarDetections] = React.useState([]);
    const [lpDetections, setLpDetections] = React.useState([]);
    const [personDetections, setPersonDetections] = React.useState([]);
    const [filteredDetections, setFilteredDetections] = React.useState([]);
    const [modalResultIsOpen, setModalResultsIsOpen] = React.useState(false);
    const [modalSavedIsOpen, setModalSavedIsOpen] = React.useState(false);
    const [connected, setConnected] = React.useState(false);
    const textAreaRef = React.useRef(null);
    const buttonRef = React.useRef(null);
    const [que,] = React.useState(new Queue());

    // Trick to get state into the callback function 'dataIsArriving'.
    // Use for ex carStateRef.current when you want to read from 'carDetections'.
    const carStateRef = React.useRef();
    const lpStateRef = React.useRef();
    const personStateRef = React.useRef();
    carStateRef.current = carDetections;
    lpStateRef.current = lpDetections;
    personStateRef.current = personDetections;
    const parsedWatchlist = watchlist;

    // Set up for data arriving.
    React.useEffect(() => {
        const wlFromLocalStorage = getLSWatchlist();
        const showWatchlistUI = getLSWatchlistToggle();
        setUseWatchlist(showWatchlistUI);
        const showServerUI = getLSServerToggle();
        setUseServer(showServerUI);
        const serverAddr = getLSServerAddress();
        setServerHostAddress(serverAddr);

        if (wlFromLocalStorage.length) {
            setWatchlist(wlFromLocalStorage);
        }
        initializeStomp(window.location.hostname);

        const handle = window.setInterval(() => { void checkQueue() }, 100); // check queue periodically
        return () => { window.clearInterval(handle); }                       // this runs on unmount and clears the timer
    }, []);

    React.useEffect(() => {
        if (useWatchlist){
            setSelectedDetection(filteredDetections[0]);
        } else if (carDetections.length === 1) {
            setSelectedDetection(carDetections[0]);
        }
    }, [useWatchlist, carDetections, selectedDetection, filteredDetections]);

    React.useEffect(() => {
        // If the user hasn't picked a watchlist file yet,
        // that is the same as not turning on 'Use Watchlist'.
        const wlFilename = getLSWatchlistFilename();
        if (!wlFilename) {
            setFilteredDetections(carDetections);
        } else {
            const finalDetections = [];
            for (const det of carDetections) {
                let useDetection = false;
                for (const wl of parsedWatchlist) {
                    if (det.lpValue1 && det.lpValue1.includes(wl)){
                        useDetection = true;
                        break;
                    }
                }
                useDetection && finalDetections.push(det);
            }
            setFilteredDetections(finalDetections);
        }
    }, [carDetections, parsedWatchlist]);

    async function initializeStomp(address) {
        stompClient = await handleWebSocket(dataIsArriving, address, stompClient, connectedStatus); // initialize websocket code
    }

    const connectedStatus = (status) => {
        setConnected(status);
    }

    // Input: all detection objects.
    // Correlate one car to any license plate object. If found, take the
    // license plate data and put it into the final combined object.
    // For person objects, just add them to the final array.
    function correlateCarsToPlates(oldCarDets, oldLpDets, newItems) { // finalDets, localDets) {
        const outputArray = [];
        const newCars = newItems.filter(obj => obj.type === "car");
        const newLps = newItems.filter(obj => obj.type === "lp");
        const allCarItems = [...oldCarDets, ...newCars];
        const allLpItems = [...oldLpDets, ...newLps];

        for (const car of allCarItems) {
            for (const lp of allLpItems) {
                if (car.lpId === lp.lpId) {
                    car.lpValue1 = lp.lpValue1;
                    car.lpValue2 = lp.lpValue2;
                    car.boxLp = lp.boxLp;
                    car.lpValueConf = lp.lpValueConf;
                    car.lpRegionConf = lp.lpRegionConf;
                    break;
                }
            }
            outputArray.push(car);
        }

        return outputArray;
    }

    // Compare timestamps; used by sort function.
    function compareFn(a, b) {
        return b.bestTS - a.bestTS;
    }

    // Sometimes the detections give us 3 cars in a row that are the same car, but have
    // different ids. Once the license plate is resolved, we can then collapse these 3
    // cars into one with one license plate. "Unknown" license plates are not included.
    function collapseIdenticals(allDets) {
        const uniques = [];
        const setOfLps = new Set();

        // Loop through all detections, keeping unique license plate ids.
        for (const det of allDets) {
            let sizeOfSetBefore = setOfLps.size;
            setOfLps.add(det.lpId);
            if (setOfLps.size > sizeOfSetBefore) {
                uniques.push(det);
                // console.log(" +++ collapse - pushed unique plate=", det.lpValue1, " car=", det.carId);
            }
        }

        // Due to async processing, some items will appear out of order, plus we want the most recent
        // first, so reverse the array and then sort it. The sort is faster if the array is almost
        // in the right order to start with.
        uniques.reverse();
        uniques.sort(compareFn);
        return uniques;
    }

    // Given links array like these:
    //   [ {"metaClass": "licensePlates", "id": "guid here"} ],
    //   [ {"metaClass": "vehicles", "id": "guid here"} ],
    // get the guid for the first array entry with metaClass = 'type'.
    function findLink(linkArray, type) {
        for (const item of linkArray) {
            if (item.metaClass === type) {
                return item.id;
            }
        }
        return "";
    }

    // Create our own data structure with this car object info.
    function handleCarObject(car, carId, localDetections, imageData, srcId, timeIn, frameId) {
        const lpId = findLink(car.links, "licensePlates");
        const entry = {
            type: "car",
            carId,
            lpId,
            imageData,                                   // jpg image
            bestTS: car.bestDetectionTimestamp,          // in ms
            firstTS: car.firstFrameTimestamp,            // in ms
            boxCar: car.box,
            carValue1: car.attributes.vehicleType?.value,// for vehicles: type
            carValue2: car.attributes.color?.value,      // for vehicles: color
            lpValue1: "unknown",                         // for lps: string
            lpValue2: "unknown",                         // for lps: region
            links: car.links,
            srcId,
            timeIn,
            frameId,
            mmConf: car.attributes.vehicleType?.detectionScore,
            colorConf: car.attributes.color?.detectionScore,
        }
        // console.log("----- Got car, id=", carId, " mm=", car.attributes.vehicleType?.value);
        localDetections.push(entry);
    }

    // Create our own data structure with this lp object info.
    function handleLpObject(lp, lpId, localDetections, imageData, srcId, timeIn, frameId) {
        const carId = findLink(lp.links, "vehicles");
        const entry = {
            type: "lp",
            carId,
            lpId,
            imageData,                              // jpg image
            bestTS: lp.bestDetectionTimestamp,      // in ms
            firstTS: lp.firstFrameTimestamp,        // in ms
            boxLp: lp.box,
            lpValue1: lp.attributes.lpString?.value,// for lps: string
            lpValue2: lp.attributes.lpRegion?.value,// for lps: region
            links: lp.links,
            srcId,
            timeIn,
            frameId,
            lpValueConf: lp.attributes.lpString?.detectionScore,
            lpRegionConf: lp.attributes.lpRegion?.detectionScore,
        }
        // console.log("----- Got license plate, id=", lpId, " value=", lp.attributes.lpString?.value);
        localDetections.push(entry);
    }

    function handlePersonObject(person, personId, localDetections, imageData, srcId, timeIn, frameId) {
        const entry = {
            type: "person",
            personId,
            lpId: "",
            imageData,
            bestTS: person.bestDetectionTimestamp,
            firstTS: person.firstFrameTimestamp,
            boxPerson: person.box,
            srcId,
            timeIn,
            frameId
        }
        // console.log("----- Got person, id=", personId);
        localDetections.push(entry);
    }

    const checkQueue = async () => {
        if (emptying) {
            return;
        }
        while (que && !que.isEmpty()) {
            emptying = true;
            const item = que.dequeue();
            await processItem(item);
        }
        if (que.isEmpty()) {
            emptying = false;
        }
    }

    // Callback function that websocket code will call when data arrives.
    async function dataIsArriving(data) {
        if (que && data && data.body && typeof data.body == 'string') {
            console.log("  -- Got websocket data=", data.body);

            // Add the time this packet arrived into the json data.
            const rawData = JSON.parse(data.body);
            rawData.timeIn = Date.now();
            que.enqueue(rawData);
        }
    }

    const processItem = async (rawData) => {
        const filename = rawData["frameId"] ? rawData["frameId"] + ".jpg" : rawData["imageFilename"];
        const metaClasses = rawData["metaClasses"] || {};
        const srcId = rawData["sourceId"] || "";
        const cars = metaClasses.hasOwnProperty("vehicles") ? metaClasses.vehicles : [];
        const lps = metaClasses.hasOwnProperty("licensePlates") ? metaClasses.licensePlates : [];
        const people = metaClasses.hasOwnProperty("people") ? metaClasses.people : [];
        const carObjects = Object.entries(cars);
        const lpObjects = Object.entries(lps);
        const peopleObjects = Object.entries(people);
        const timeDataArrived = rawData.timeIn;

        const localDetections = [];
        const carDetections = [...carStateRef.current]; // get local copy of arrays
        const lpDetections = [...lpStateRef.current];
        const personDetections = [...personStateRef.current];

        // First get the image.
        const imageData = await getImageFromNodeServer(filename);

        // Loop through incoming data. Make detections entries for each item (car or lp).
        for (const outerObj of carObjects) {
            const guid = outerObj[0];
            const obj = outerObj[1];
            handleCarObject(obj, guid, localDetections, imageData, srcId, timeDataArrived, rawData["frameId"]);
        }

        // Process all incoming plates in the json data, add to local array.
        for (const outerObj of lpObjects) {
            const guid = outerObj[0];
            const obj = outerObj[1];
            handleLpObject(obj, guid, localDetections, imageData, srcId, timeDataArrived, rawData["frameId"]);
        }

        // Process all incoming people in the json data, add to local array.
        for (const outerObj of peopleObjects) {
            const guid = outerObj[0];
            const obj = outerObj[1];
            handlePersonObject(obj, guid, localDetections, imageData, srcId, timeDataArrived, rawData["frameId"]);
        }

        // If any incoming local entries are *already* in finalDetections,
        // then this entry should just update the one in finalDetections,
        // otherwise create a brand new entry in finalDetections.
        const newItems = [];
        for (const oneDetection of localDetections) {
            // Find any 'car' detections that match this oneDetection.
            if (oneDetection.type === "car") {
                const results = carDetections.filter(det =>
                    det.carId === oneDetection.carId && oneDetection.srcId === det.srcId);
                if (results.length) { // found matching car
                    // console.log("----- Updating car - results=", results.length);
                    for (const det of results) {
                        det.bestTS = oneDetection.bestTS;
                        det.boxCar = oneDetection.boxCar;
                        det.carValue1 = oneDetection.carValue1;
                        det.carValue2 = oneDetection.carValue2;
                        det.imageData = imageData;
                        det.mmConf = oneDetection.mmConf;
                        det.colorConf = oneDetection.colorConf;
                        det.lpId = findLink(oneDetection.links, "licensePlates");
                        // console.log("----- Updated car=", det.carId, " mm=", det.carValue1, " for LP=", det.lpId, " cbox=", det.boxCar);
                    }
                } else {
                    setCarDetections([oneDetection, ...carDetections]); // add this new car detection to array
                    newItems.push(oneDetection); // not found above, make new entry
                }
            } else if (oneDetection.type === "lp" ) {
                // Find any 'lp' detections that match this oneDetection.
                const results = lpDetections.filter(det =>
                    det.lpId === oneDetection.lpId && oneDetection.srcId === det.srcId);
                if (results.length) { // found matching lp
                    // console.log("----- Updating LP - results=", results.length);
                    for (const det of results) {
                        det.bestTS = oneDetection.bestTS;
                        det.boxLp = oneDetection.boxLp;
                        det.lpValue1 = oneDetection.lpValue1;
                        det.lpValue2 = oneDetection.lpValue2;
                        det.imageData = imageData;
                        det.lpValueConf = oneDetection.lpValueConf;
                        det.lpRegionConf = oneDetection.lpRegionConf;
                        det.carId = findLink(oneDetection.links, "vehicles");
                        // console.log("----- Updated LP=", det.lpId, " value=", det.lpValue1, " for carId=", det.carId, " lpbox=", det.boxLp);
                    }
                } else {
                    setLpDetections([oneDetection, ...lpDetections]); // add this new lp detection to array
                    // console.log("----- Pushing new detection");
                    newItems.push(oneDetection); // not found above, make new entry
                }
            } else if (oneDetection.type === "person" ) {
                // Find any 'person' detections that match this oneDetection.
                const results = personDetections.filter(det =>
                    det.personId === oneDetection.personId && oneDetection.srcId === det.srcId);
                if (results.length) { // found matching person
                    for (const det of results) {
                        det.bestTS = oneDetection.bestTS;
                        det.boxPerson = oneDetection.boxPerson;
                        det.imageData = imageData;
                        // console.log("----- Updated person=", det.personId);
                    }
                } else {
                    setPersonDetections([oneDetection, ...personDetections]); // add this new person detection to array
                    // console.log("----- Pushing new detection");
                    newItems.push(oneDetection); // not found above, make new entry
                }
            }
        }

        // Now correlate any cars to license plates using the "Links" array.
        const finalCarDetections = correlateCarsToPlates(carDetections, lpDetections, newItems);
        const uniqueCarDetections = collapseIdenticals(finalCarDetections);

        if (!userControl) {
            setSelectedDetection(uniqueCarDetections[0]);
        }

        setCarDetections(uniqueCarDetections);
    }

    // Note - for this to work, we need to have a Node server with a
    // REST endpoint 'getWatchlist'. This work is TBD.
    const handleNewWatchlist = async (fileObj, filename) => {
        getWatchlistFromNodeServer(fileObj, filename)
        .then((data) => {
            console.log("app - data from watchlist file=", data);
            setWatchlist(data);
        })
        .catch((reason) => console.log("Error getting watchlist from server=", reason))
    }

    const handleNewServerAddress = (address) => {
        setLSServerAddress(address);   // set new address into local storage
        setServerHostAddress(address); // set display of address in edit box
        initializeStomp(address);      // re-init websocket with new address
    }

    const handleUseServerToggle = (val) => {
        setUseServer(val);
        setLSServerToggle(val);
        if (!val) {
            initializeStomp(window.location.hostname);
        } else {
            initializeStomp(getLSServerAddress());
        }
    }

    const createCsvResults = () => {
        console.log("gathering csv results");
        let text = "";
        const addr = getLSServerToggle() ? getLSServerAddress() : "localhost";

        for (const item of carDetections) {
            // console.log("detection=", item);
            let make = "";
            let model = "";
            if (item.carValue1) {
                const parts = item.carValue1.split(" ");
                if (parts.length > 0) {
                    make = parts[0];
                }
                if (parts.length > 1) {
                    model = parts[1];
                }
            }
            text += moment(item.bestTS).format("YYYY-MM-DD HH:mm:ss.SSS") + ",";
            text += item.carId + ",";
            text += item.lpValue1 + ",";
            text += item.lpValue2 + ",";
            text += make + ",";
            text += model + ",";
            text += `http://${addr}:4000/frame/${item.frameId},`
            text += String.fromCharCode(13, 10); // add with proper newlines to end
        }
        csvText = text;
    }

    const showResultsNow = () => {
        setShowResults(true);

        createCsvResults();
        setModalResultsIsOpen(true);
    }

    const saveCsvFile = () => {
        const data = new Blob([csvText], {type: 'text/plain'});
        const url = window.URL.createObjectURL(data);
        if (buttonRef?.current) {
            buttonRef.current.href = url;
        }
        csvFilename = `datafile-${Date.now()}.csv`;
        setModalSavedIsOpen(true);
    }

    // Save as an example.
    // const copyToClipboard = () => {
    //     textAreaRef.current.select();
    //     navigator.clipboard.writeText(textAreaRef.current.value);
    // }

    const closeModal = () => {
        setModalResultsIsOpen(false);
        setModalSavedIsOpen(false);
        setShowResults(false);
    }

    const sd = selectedDetection; // for brevity below
    const canvasH = 275;
    let lag = 0;
    const boxLpH = 40;
    let boxLpW = 40;
    let showAttributes = false;
    let showRegion = false;
    let attributeString = "";
    let regionString = "";
    let lpConfString = "";

    // Set box dimensions in case we don't have any.
    if (sd) {
        if (!(sd.boxCar)) {
            sd.boxCar = { height: 226, width: 400, x: 0, y: 0 };
        }

        if (!sd.boxLp) {
            sd.boxLp = { height: 1, width: 1.77, x: 0, y: 0 };
        } else {
            boxLpW = (sd.boxLp.width / sd.boxLp.height) * boxLpH;
        }
    }


    if (sd?.firstTS && sd?.timeIn) {
        lag = sd.timeIn - sd.firstTS;
    }

    if (sd?.type === "car" && sd?.carValue1) {
        showAttributes = true;
        attributeString = `${sd.carValue1} (confidence: ${sd.mmConf})`;
        if (sd?.carValue2) {
            attributeString += `, color: ${sd.carValue2} (confidence: ${sd.colorConf})`;
        }
        if (sd?.lpValue1 && sd?.lpValueConf) {
            lpConfString = `(Plate confidence: ${sd.lpValueConf}`
        }
        if (sd?.lpValue2) {
            showRegion = true;
            regionString = `${sd.lpValue2}`;
            if (sd.lpRegionConf) {
                lpConfString += `, region confidence: ${sd.lpRegionConf})`
            }
        } else {
            lpConfString += `)`
        }
    }

    return (
        <div>
            <Header
                toggleUseWatchlist={() => { setUseWatchlist(!useWatchlist); setLSWatchlistToggle(!useWatchlist); }}
                toggleUseServer={() => handleUseServerToggle(!useServer) }
                setWatchListInParent={(filename) => handleNewWatchlist(filename)}
                setServerAddress={(evt) => handleNewServerAddress(evt.target.value) }
                serverAddress={serverHostAddress}
                clearWLData={() => { removeWatchlistFromLS("wl"); removeWatchlistFilenameFromLS(); setWatchlist([]); }}
                showWLUI={showWatchlistUI}
                showIpUI={showIpUI}
                watchlistChecked={useWatchlist}
                ipServerChecked={useServer}
                showResultsNow={showResultsNow}
                connected={connected}
            />
            <Modal
                isOpen={modalResultIsOpen}
                onRequestClose={closeModal}
                style={customModalStyles}
            >
                <h2 style={{marginTop: 0}}>Results
                    <a ref={buttonRef} id="download_link" download={csvFilename} href="">
                        <button
                            onClick={saveCsvFile}
                            style={{position: "absolute", top: 25, right: 100, cursor: "pointer"}}
                            className="resultsButton" 
                        >
                            Save
                        </button>
                    </a>
                    <button
                        onClick={closeModal}
                        style={{position: "absolute", top: 25, right: 10, cursor: "pointer"}}
                        className="resultsButton" 
                    >
                        Close
                    </button>
                </h2>
                <textarea
                    ref={textAreaRef}
                    style={{width: 800, height: 369}}
                    value={csvText}
                />
            </Modal>
            <Modal
                isOpen={modalSavedIsOpen}
                onRequestClose={closeModal}
                style={customModalStyles}
            >
                <h3 style={{margin: 0}}>File downloaded to {csvFilename}
                    <button                        
                        onClick={closeModal}
                        style={{position: "absolute", top: 20, right: 10, cursor: "pointer", margin: 0, height: 23}}
                        className="resultsButton" 
                    >
                        Close
                    </button>
                </h3>
            </Modal>
            <div style={{
                backgroundColor: "rgba(38, 41, 66, .03)",
                width: "100%",
                height: 2
            }}/>
            {sd ?
                <div>
                    <div className="selectedContainer">
                        <div style={{
                                marginLeft: "auto",
                                marginRight: "auto",
                                marginBottom: 20,
                                maxHeight: {canvasH},
                            }}>
                            <div style={{
                                height: "100%",
                                flex: 1,
                                marginLeft: "auto",
                                marginRight: "auto",
                            }}>
                                { sd.type !== "lp" &&
                                    <div style={{maxHeight: canvasH}}>
                                        <img
                                            src={sd.imageData}
                                            alt={sd.lpValue1}
                                            height={canvasH}
                                        />
                                    </div>
                                }
                            </div>
                        </div>
                        { carDetections.length > 0 &&
                            <div style={{
                                width: 520,
                                marginLeft: "auto",
                                marginRight: "auto",
                                backgroundColor: "aliceblue",
                                display: "flex",
                                flexDirection: "column",
                            }}>
                                <div style={{
                                    marginLeft: "auto",
                                    marginRight: "auto",
                                }}>
                                    <CroppedImage
                                        type={"lp"}
                                        src={sd.imageData}
                                        alt={sd.lpValue1}
                                        region={{
                                            x: sd.boxLp.x,
                                            y: sd.boxLp.y,
                                            width: sd.boxLp.width,
                                            height: sd.boxLp.height
                                        }}
                                        canvasDims={{
                                            width: boxLpW,
                                            height: Math.min(sd.boxLp.height, 55),
                                        }}
                                    />
                                </div>
                                <div className="selectedText">
                                    <h1 style={{textAlign: "center", marginTop: 2}}>{sd.lpValue1}</h1>
                                    { showRegion &&
                                        <p style={{marginBottom: 15, marginTop: -15}}>{regionString}</p>
                                    }
                                    <p>{`${moment(sd.bestTS).format("YYYY-MM-DD HH:mm:ss")}`}</p>
                                    { showRegion &&
                                        <p style={{marginBottom: 15}}>{lpConfString}</p>
                                    }
                                    { showAttributes && 
                                        <p>{attributeString}</p>
                                    }
                                    <p>{`(Time Captured: ${moment(sd.firstTS).format("YYYY-MM-DD HH:mm:ss.SSS")})`}</p>
                                    <p>{`(Time Displayed: ${moment(sd.timeIn).format("YYYY-MM-DD HH:mm:ss.SSS")}, lag: ${lag} ms)`}</p>
                                </div>
                            </div>
                        }
                    </div>
                
                    <ImageGrid 
                        detections={useWatchlist ? filteredDetections : carDetections}
                        selectDetection={(detection) => { userControl = true; setSelectedDetection(detection); }}
                    />
                </div>
            :
                <h1 style={{textAlign: "center", paddingTop: 50}}
                >
                    {"No detections found"}
                </h1>
            }
        </div>
    );
}

export default App;
