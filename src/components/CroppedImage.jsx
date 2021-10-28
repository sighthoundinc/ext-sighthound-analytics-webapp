import React from 'react';
import '../App.css';

/**
 * Class to load a image bounded by a rectangular region.
 * Input: region     - { x: number, y: number, width: number, height: number }
 *                   - piece of the image to show
 *                   - if either width or height is zero, use the image dimension value
 *        src        - image url
 *        alt        - alt text for image
 *        canvasDims - { width: number, height: number }
 *                   - use to specify the size of the destination canvas
 */
export default class CroppedImage  extends React.Component {

    constructor(props) {
        super(props);
        this.state = {imageObj: null};
        this.canvasRef = React.createRef();
        this.initialized = false;
    }

    componentDidMount() {
        this.updateImage();
    }

    componentDidUpdate(prevProps) {
        if (this.props.src !== prevProps.src) {
            this.updateImage();
        }
        if (JSON.stringify(this.props.region) !== JSON.stringify(prevProps.region) && (this.props.type === "lp")) {
            this.drawLicensePlate();
        }
    }

    updateImage = () => {
        const imageObj = new Image();
        imageObj.src = this.props.src;
        imageObj.alt = this.props.alt;
        this.setState({imageObj: imageObj});

        imageObj.onload = () => {
            const canvas = this.canvasRef.current;
            if (!canvas) {
                return; // we don't have enough html built up to draw things
            }
            // Type definition is in App.jsx, see handleLpObject().
            if (this.props.type !== "lp") {
                this.fitImageOn(canvas, imageObj);
            } else {
                this.drawLicensePlate();
            }
            this.initialized = true;
        }
    }

    drawLicensePlate = () => {
        const canvas = this.canvasRef.current;
        if (!this.initialized || !canvas || !this.state.imageObj) {
            console.log("croppedImage - DLP - things are not initialized yet");
            return;
        }
        const context = canvas.getContext('2d');

        // Clear canvas before drawing new image.
        context.clearRect(0, 0, canvas.width, canvas.height);

        const sourceX = this.props.region.x;
        const sourceY = this.props.region.y;
        const sourceWidth = this.props.region.width;
        const sourceHeight = this.props.region.height;

        const destX = 0;
        const destY = 0;
        const destWidth = this.props.canvasDims.width;
        const destHeight = this.props.canvasDims.height;

        // console.log("image load of: ", this.props.src, " srcX=", this.props.region.x,
        //     " srcY=", this.props.region.y, " srcW=", this.props.region.width,
        //     " srcH=", this.props.region.height, " destW=", destWidth,
        //     " destH=", destHeight);

        // draw cropped image
        context.drawImage(this.state.imageObj, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
    }

    // Fit a large image onto a smaller canvas.
    fitImageOn = (canvas, imageObj) => {
        const context = canvas.getContext('2d');
        const destWidth = this.props.canvasDims.width;
        const destHeight = this.props.canvasDims.height;
        const imageAspectRatio = imageObj.width / imageObj.height;
        const canvasAspectRatio = destWidth / destHeight;
        let renderableHeight, renderableWidth, xStart, yStart;

        // Clear canvas before drawing new image.
        context.clearRect(0, 0, canvas.width, canvas.height);
    
        // console.log("image load of: ", this.props.src, " srcX=", this.props.region.x,
        //     " srcY=", this.props.region.y, " srcW=", this.props.region.width,
        //     " srcH=", this.props.region.height, " destW=", destWidth,
        //     " destH=", destHeight, " imgObjW=", imageObj.width, " imgObjH=", imageObj.height);

        // If image's aspect ratio is less than canvas's we fit on height
        // and place the image centrally along width
        if(imageAspectRatio < canvasAspectRatio) {
            renderableHeight = destHeight;
            renderableWidth = imageObj.width * (renderableHeight / imageObj.height);
            xStart = (destWidth - renderableWidth) / 2;
            yStart = 0;
        }
    
        // If image's aspect ratio is greater than canvas's we fit on width
        // and place the image centrally along height
        else if(imageAspectRatio > canvasAspectRatio) {
            renderableWidth = destWidth;
            renderableHeight = imageObj.height * (renderableWidth / imageObj.width);
            xStart = 0;
            yStart = (destHeight - renderableHeight) / 2;
        }
    
        // Happy path - keep aspect ratio
        else {
            renderableHeight = destHeight;
            renderableWidth = destWidth;
            xStart = 0;
            yStart = 0;
        }
        context.drawImage(imageObj, xStart, yStart, renderableWidth, renderableHeight);
    }
    
    render() {
        const canvasW = this.props.canvasDims.width;
        const canvasH = this.props.canvasDims.height;
 
        return (
            <div style={{
                maxWidth: canvasW,
                maxHeight: canvasH,
                width: canvasW,
                height: canvasH,
            }}>
                <canvas
                    ref={this.canvasRef}
                    width={this.props.region.width}
                    height={Math.min(this.props.region.height, canvasH)}
                />
            </div>
        );
    }
}
