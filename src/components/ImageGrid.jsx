import React from 'react';

function ImageGrid({detections, selectDetection}){
    const [selectedDetection, setSelectedDetection] = React.useState();

    return(
        <div className="imageGrid">
            {detections.map((detection, index) => {

                // if (detection.type !== "car") {
                //     return null;
                // }
                return(
                    detection.type !== "person" ?
                        <div key={`DETECTION_${index}`}>
                            <p key={`PLATE_${index}`} style={{marginTop: 0}}>{detection.lpValue1}</p>
                            <img 
                                className={
                                    !selectedDetection && index === 0 
                                    ? "gridImage selectedGridImage"
                                    : `gridImage ${detection === selectedDetection && "selectedGridImage"}`
                                } 
                                src={detection.imageData} 
                                alt={detection.lpValue1} 
                                key={`IMG_${index}`} 
                                onClick={() => handleClick(detection)} 
                            />
                        </div>
                    :
                        <div key={`DETECTION_${index}`}>
                            <img 
                                className={
                                    !selectedDetection && index === 0 
                                    ? "personImage selectedGridImage"
                                    : `personImage ${detection === selectedDetection && "selectedGridImage"}`
                                } 
                                src={detection.imageData} 
                                alt={"Person"} 
                                key={`IMG_${index}`} 
                                onClick={() => handleClick(detection)} 
                            />
                        </div>
                )
            })}
        </div>
    )
    function handleClick(detection){
        setSelectedDetection(detection);
        selectDetection(detection);
    }
}

export default ImageGrid;
