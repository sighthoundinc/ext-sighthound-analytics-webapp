import './App.css';
import "@fontsource/lexend"
import React from 'react';
import * as moment from "moment";

import ImageGrid from "./components/ImageGrid";
import Header from "./components/Header";
import CroppedImage from './components/CroppedImage';
import {handleWebSocket} from "./websocketUtils";
import {Queue} from "./Queue";
import {clearLocalStorage, getWatchlist} from "./watchlistHandler";
import {getImageDataFromNodeServer, getWatchlistDataFromNodeServer} from "./nodeServer";
import {showWatchlistUI} from "./config.json";

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
*/
let emptying = false;     // flag indicating we're emptying the que, so don't re-enter que emptying fn
let userControl = false;  // flag indicating the user controls which car is displayed on top part

function App() {
    const [selectedDetection, setSelectedDetection] = React.useState({});
    const [useWatchlist, setUseWatchlist] = React.useState(false);
    const [watchlist, setWatchlist] = React.useState("");
    const [detections, setDetections] = React.useState([]);
    const [filteredDetections, setFilteredDetections] = React.useState([]);
    const [que,] = React.useState(new Queue());

    // Trick to get state into the callback function 'dataIsArriving'.
    // Use stateRef.current when you want to read from 'detections'.
    const stateRef = React.useRef();
    stateRef.current = detections;
    const parsedWatchlist = watchlist;

    // Set up for data arriving.
    React.useEffect(() => {
        const wlFromLocalStorage = getWatchlist();
        console.log("watchlist from loc store=", wlFromLocalStorage, " showing WL UI=", showWatchlistUI);
        if (wlFromLocalStorage) {
            setWatchlist(wlFromLocalStorage);
        }
        handleWebSocket(dataIsArriving); // initialize websocket code
        const handle = window.setInterval(() => { void checkQueue() }, 200); // check queue periodically
        return () => { window.clearInterval(handle); }                       // this runs on unmount and clears the timer
    }, []);

    React.useEffect(() => {
        if (useWatchlist){
            setSelectedDetection(filteredDetections[0]);
        } else if (detections.length === 1) {
            setSelectedDetection(detections[0]);
        }
    }, [useWatchlist, detections, selectedDetection, filteredDetections]);

    React.useEffect(() => {
        const finalDetections = [];
        for (const det of detections) {
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
    }, [detections, parsedWatchlist]);

    // Input: all detection objects.
    // Correlate one car to any license plate object. If found, take the
    // license plate data and put it into the final combined object.
    // For person objects, just add them to the final array.
    function correlateCarsToPlates(finalDets, localDets) {
        const outputArray = [];
        for (const item of finalDets) {
            if (item.type === "car") {
                if (item.carId !== "") {
                    const lpLinkedObj = localDets.filter(obj =>
                        obj.carId === item.carId && obj.srcId === item.srcId && obj.type === "lp"
                    );
                    if (lpLinkedObj?.length) {
                        item.boxLp = lpLinkedObj[0].boxLp;
                        item.lpValue1 = lpLinkedObj[0].lpValue1;
                        item.lpValue2 = lpLinkedObj[0].lpValue2;
                    }
                }
                outputArray.push(item);
            } else if (item.type === "person") {
                outputArray.push(item);
            }
        }
        return outputArray;
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
    function handleCarObject(car, carId, localDetections, imageData, srcId, timeIn) {
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
            timeIn
        }
        localDetections.push(entry);
    }

    // Create our own data structure with this lp object info.
    function handleLpObject(lp, lpId, localDetections, imageData, srcId, timeIn) {
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
            timeIn
        }
        localDetections.push(entry);
    }

    function handlePersonObject(person, personId, localDetections, imageData, srcId, timeIn) {
        const entry = {
            type: "person",
            personId,
            lpId: "",
            imageData,
            bestTS: person.bestDetectionTimestamp,
            firstTS: person.firstFrameTimestamp,
            boxPerson: person.box,
            srcId,
            timeIn
        }
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
            console.log("Got websocket data=", data.body);

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
        const finalDetections = [...stateRef.current]; // get local copy of *detections* array

        // First get the image.
        const imageData = await getImageDataFromNodeServer(filename);

        // Loop through incoming data. Make detections entries for each item (car or lp).
        for (const outerObj of carObjects) {
            const guid = outerObj[0];
            const obj = outerObj[1];
            handleCarObject(obj, guid, localDetections, imageData, srcId, timeDataArrived);
        }

        // Process all incoming plates in the json data, add to local array.
        for (const outerObj of lpObjects) {
            const guid = outerObj[0];
            const obj = outerObj[1];
            handleLpObject(obj, guid, localDetections, imageData, srcId, timeDataArrived);
        }

        // Process all incoming people in the json data, add to local array.
        for (const outerObj of peopleObjects) {
            const guid = outerObj[0];
            const obj = outerObj[1];
            handlePersonObject(obj, guid, localDetections, imageData, srcId, timeDataArrived);
        }

        // If any incoming local entries are *already* in finalDetections,
        // then this entry should just update the one in finalDetections,
        // otherwise create a brand new entry in finalDetections.
        const newItems = [];
        for (const oneDetection of localDetections) {
            // Find any 'car' finalDetections that match this oneDetection.
            const results = finalDetections.filter(det =>
                oneDetection.type === "car" && det.carId === oneDetection.carId && oneDetection.srcId === det.srcId);
            if (results.length) {
                for (const det of results) {
                    det.bestTS = oneDetection.bestTS;
                    det.boxCar = oneDetection.boxCar;
                    det.carValue1 = oneDetection.carValue1;
                    det.carValue2 = oneDetection.carValue2;
                    det.imageData = imageData;
                    det.lpId = findLink(oneDetection.links, "licensePlates");
                }
            } else {
                // Find any 'lp' finalDetections that match this oneDetection.
                const results = finalDetections.filter(det =>
                    oneDetection.type === "lp" && det.lpId === oneDetection.lpId && oneDetection.srcId === det.srcId);
                if (results.length) {
                    for (const det of results) {
                        det.bestTS = oneDetection.bestTS;
                        det.boxLp = oneDetection.boxLp;
                        det.lpValue1 = oneDetection.lpValue1;
                        det.lpValue2 = oneDetection.lpValue2;
                        det.imageData = imageData;
                        det.carId = findLink(oneDetection.links, "vehicles");
                    }
                } else {
                    // Find any 'people' finalDetections that match this oneDetection.
                    const results = finalDetections.filter(det =>
                        oneDetection.type === "person" && det.personId === oneDetection.personId && oneDetection.srcId === det.srcId);
                    if (results.length) {
                        for (const det of results) {
                            det.bestTS = oneDetection.bestTS;
                            det.boxPerson = oneDetection.boxPerson;
                            det.imageData = imageData;
                        }
                    } else {
                        newItems.push(oneDetection); // not found above, make new entry
                    }
                }
            }
        }
        finalDetections.unshift(...newItems);
        if (!userControl) {
            setSelectedDetection(finalDetections[0]);
        }

        // Now correlate any cars to license plates using the "Links" array.
        // Do this in the finalDetections array.
        const carDetections = correlateCarsToPlates(finalDetections, localDetections);

        setDetections(carDetections);
    }

    // Note - for this to work, we need to have a Node server with a
    // REST endpoint 'getWatchlist'. This work is TBD.
    const handleNewWatchlist = async (fileObj, filename) => {
        getWatchlistDataFromNodeServer(fileObj, filename)
        .then((data) => {
            console.log("app - data from watchlist file=", data);
            setWatchlist(data);
        })
        .catch((reason) => console.log("Error getting watchlist from server=", reason))
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

    // Set box dimensions in case we don't have any.
    if (!(sd?.boxCar)) {
        sd.boxCar = { height: 226, width: 400, x: 0, y: 0 };
    }

    if (!sd?.boxLp) {
        sd.boxLp = { height: 1, width: 1.77, x: 0, y: 0 };
    } else {
        boxLpW = (sd.boxLp.width / sd.boxLp.height) * boxLpH;
    }

    if (sd?.firstTS && sd?.timeIn) {
        lag = sd.timeIn - sd.firstTS;
    }

    if (sd?.type === "car" && sd?.carValue1) {
        showAttributes = true;
        attributeString = `${sd.carValue1}`;
        if (sd?.carValue2) {
            attributeString += `, color: ${sd.carValue2}`;
        }
        if (sd?.lpValue2) {
            showRegion = true;
            regionString = `${sd.lpValue2}`;
        }
    }

    return (
        <div>
            <Header
                watchlistAvailable={!!watchlist}
                toggleUseWatchlist={() => setUseWatchlist(!useWatchlist)}
                setWatchListInParent={(filename) => handleNewWatchlist(filename)}
                clearWLData={() => clearLocalStorage()}
                showWLUI={showWatchlistUI}
            />
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
                        { detections.length > 0 &&
                            <div style={{
                                width: 480,
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
                                    <h1 style={{textAlign: "center", marginTop: 5}}>{sd.lpValue1}</h1>
                                    { showRegion &&
                                        <p style={{marginBottom: 15, marginTop: -15}}>{regionString}</p>
                                    }
                                    <p>{`${moment(sd.bestTS).format("YYYY-MM-DD HH:mm:ss")}`}</p>
                                    { showAttributes && 
                                        <p>{attributeString}</p>
                                    }
                                    <p>{`(lag: ${lag} ms)`}</p>
                                </div>
                            </div>
                        }
                    </div>
                
                    <ImageGrid 
                        detections={useWatchlist ? filteredDetections : detections}
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
