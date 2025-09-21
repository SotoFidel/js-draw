let canvas;
let toolCanvas;
const canvasContainer = document.getElementById("canvasContainer");
let canvasContext;
let toolContext;

let isClicking = false;
let canvasOffsetX = 0;
let canvasOffsetY = 0;
let changeStack = [];
let redoStack = [];
let oldCoords = { x: 0, y: 0 }
let currentCoords = { x: 0, y: 0 }
let prevImageData;
let color = "#000000";
let alphaColor = "#00000000";

let modes = {
    Drawing: { mode: "Drawing", fn: draw, strokeWidth: 5, buttonId: "draw-btn", mouseUpdate: true },
    Erasing: { mode: "Erasing", fn: erase, strokeWidth: 5, buttonId: "erase-btn", mouseUpdate: true },
    Filling: { mode: "Filling", fn: bucketFill, buttonId: "fill-btn", mouseUpdate: false, fnParams: null }
};

let currentMode = modes.Drawing;

function clearCanvas() {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {

    toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
    toolContext.beginPath();
    // tctx.rect(newCoords.x, newCoords.y, currentMode.strokeWidth, currentMode.strokeWidth);
    toolContext.arc(Math.max(currentCoords.x, 0),
        Math.max(currentCoords.y, 0), currentMode.strokeWidth, 0, 2 * Math.PI);
    toolContext.stroke();

    if (isClicking) {
        for (let i = 0; i <= 1; i += .01) {
            nc = interpolate(oldCoords, currentCoords, i);
            canvasContext.beginPath();
            canvasContext.arc(Math.max(nc.x, 0),
                Math.max(nc.y, 0), currentMode.strokeWidth, 0, 2 * Math.PI);
            canvasContext.strokeStyle = color;
            canvasContext.fillStyle = color;
            canvasContext.fill();
            canvasContext.stroke();
        }
    }
}

function erase() {
    toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
    toolContext.beginPath();
    toolContext.rect(
        Math.max(currentCoords.x - (currentMode.strokeWidth / 2), 0),
        Math.max(currentCoords.y - (currentMode.strokeWidth / 2), 0),
        currentMode.strokeWidth,
        currentMode.strokeWidth);
    toolContext.stroke();
    if (isClicking) {
        let nc;
        // console.log("erase ", oldCoords, newCoords);
        for (let i = 0; i <= 1; i += .05) {
            nc = interpolate(oldCoords, currentCoords, i);
            canvasContext.clearRect(
                Math.max(nc.x - (currentMode.strokeWidth / 2), 0),
                Math.max(nc.y - (currentMode.strokeWidth / 2), 0),
                currentMode.strokeWidth,
                currentMode.strokeWidth
            );
        }
        // ctx.clearRect(Math.max(newCoords.x - 5, 0), Math.max(newCoords.y - 5, 0), 10, 10);
    }
}

function exportImage() {
    let tempAnchor = document.createElement('a');
    let imageUrl = canvas.toDataURL("image/png");
    tempAnchor.href = imageUrl;
    tempAnchor.download = "exportedImage";
    document.querySelector('#ribbon').appendChild(tempAnchor);
    tempAnchor.click();
    document.querySelector('#ribbon').removeChild(tempAnchor);
}

function bucketFill() {
    const sourceColor = getPixelColor(currentMode.fnParams.x, currentMode.fnParams.y);
    // const sourceColor = '#00000000';
    canvasContext.strokeStyle = alphaColor;
    canvasContext.fillStyle = alphaColor;

    let pixelStack = [];
    let currentPixel;
    pixelStack.push({
        // x: 350,
        // y: 350
        // x: currentCoords.x,
        // y: currentCoords.y
        x: currentMode.fnParams.x,
        y: currentMode.fnParams.y
    });

    console.log("started pixelStack with ", pixelStack);
    let mew = [];
    mew.push({ x: Math.round(currentCoords.x), y: Math.round(currentCoords.y) });
    console.log("as opposed to ", mew);

    while (pixelStack.length != 0) {
        currentPixel = pixelStack.pop();
        console.log("continuing");
        // console.log(currentPixel);
        // console.log("evaluating ", currentPixel);
        let leftMostX = currentPixel.x;

        // while (getPixelColor(leftMostX - 1, currentPixel.y) == sourceColor) {
        while (isInside(leftMostX - 1, currentPixel.y, sourceColor)) {
            setPixelColor(leftMostX - 1, currentPixel.y, alphaColor);
            leftMostX--;
        }

        // while (getPixelColor(currentPixel.x, currentPixel.y) == sourceColor) {
        while (isInside(currentPixel.x, currentPixel.y, sourceColor)) {
            setPixelColor(currentPixel.x, currentPixel.y, alphaColor);
            currentPixel.x++;
        }

        scan(leftMostX, currentPixel.x - 1, currentPixel.y + 1);
        scan(leftMostX, currentPixel.x - 1, currentPixel.y - 1);

    }

    function isInside(x, y, color) {
        return (x > 0 && x < canvas.width)
            && (y > 0 && y < canvas.height)
            && getPixelColor(x, y) == color;
    }

    function scan(leftMostX, rightMostX, y) {
        // let spanAdded = false;
        for (let i = leftMostX; i <= rightMostX; i++) {
            // if (getPixelColor(i, y) == sourceColor) {
            if (isInside(i, y, sourceColor)) {
                pixelStack.push({ x: i, y: y });
            }
            // if (getPixelColor(i, y) != sourceColor) {
            //     spanAdded = false;
            // } else if (!spanAdded) {
            //     pixelStack.push({ x: i, y: y });
            //     spanAdded = true;
            // }
        }
    }

    function getPixelColor(x, y) {
        let pixel = canvasContext.getImageData(x, y, 1, 1);
        let hexRgb = `#${pixel.data[0].toString(16).padStart(2, '0')}`
            + `${pixel.data[1].toString(16).padStart(2, '0')}`
            + `${pixel.data[2].toString(16).padStart(2, '0')}`
            + `${pixel.data[3].toString(16).padStart(2, '0')}`;
        // console.log(hexRgb);
        return hexRgb;
    }

    function setPixelColor(x, y) {
        canvasContext.fillRect(x, y, 1, 1);
        // canvasContext.fill();
    }
}

// points A and B, frac between 0 and 1
function interpolate(a, b, t) {
    var nx = a.x + (b.x - a.x) * t;
    var ny = a.y + (b.y - a.y) * t;
    return { x: nx, y: ny };
}

function redoAction() {
    if (redoStack.length > 0) {
        canvasContext.putImageData(redoStack.pop(), 0, 0);
    }
}

function undoAction() {
    if (changeStack.length > 1) {
        redoStack.push(changeStack.pop());
        canvasContext.putImageData(changeStack[changeStack.length - 1], 0, 0);
    } else if (changeStack.length == 1) {
        canvasContext.putImageData(changeStack[0], 0, 0);
        redoStack.push(changeStack.pop());
    }
}

function setMethod(method) {
    toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
    modes[currentMode.mode].strokeWidth = currentMode.strokeWidth || 0;
    currentMode = modes[method];
    document.querySelector("#size").value = currentMode.strokeWidth || 0;
    document.querySelector("#sizeVal").value = currentMode.strokeWidth || 0;
    if (method == modes.Filling.mode) {
        document.querySelector("#size").disabled = true;
        document.querySelector("#sizeVal").disabled = true;
    } else {
        document.querySelector("#size").disabled = false;
        document.querySelector("#sizeVal").disabled = false;
    }

    document.querySelectorAll('.tool:has(button)').forEach((btn) => {
        btn.classList.remove('chosen');
    });
    document.querySelector(`.tool:has(#${currentMode.buttonId})`).classList.add('chosen');

}


function calculateOffsets() {
    canvasOffsetX = canvas.getBoundingClientRect().x;
    canvasOffsetY = canvas.getBoundingClientRect().y;
}

function createCanvas() {
    let canvasContainerRect = canvasContainer.getBoundingClientRect();

    canvas = document.createElement("canvas");
    canvas.setAttribute("id", "canvas");
    canvas.setAttribute("width", `${canvasContainerRect.width}`);
    canvas.setAttribute("height", `${canvasContainerRect.height}`);

    toolCanvas = document.createElement("canvas");
    toolCanvas.setAttribute("id", "toolLayer");
    toolCanvas.setAttribute("width", `${canvasContainerRect.width}`);
    toolCanvas.setAttribute("height", `${canvasContainerRect.height}`);

    canvasContainer.replaceWith(canvas);
    canvas.after(toolCanvas);
    canvasContext = canvas.getContext("2d", { willReadFrequently: true });
    canvasContext.lineWidth = 0;
    canvasContext.fillStyle = "black";

    toolContext = toolCanvas.getContext("2d", { willReadFrequently: true });
    toolContext.lineWidth = 0;
    toolContext.fillStyle = "black";

    changeStack.push(canvasContext.getImageData(0, 0, canvasContext.canvas.width, canvasContext.canvas.height));
}

function setupCanvasEvents() {
    canvas.addEventListener("mousedown", (event) => {
        // left click to draw
        if (event.buttons == 1) {
            redoStack = [];
            isClicking = true;
            if (currentMode.mode == "Filling") {
                // TODO: for some reason, making the bucketfill method use currentCoords for its starting coordinates causes
                // the fill algorithm to bug out, which forces me to use this edge case check. Find a way to not make this 
                // soo clunky. We can try higher order functions or removing the mousemove event listener.
                currentMode.fnParams = { x: event.x, y: event.y };
            }
            currentMode.fn();
        }
    });


    ["mouseup", "mouseleave"].forEach((eventType) => {
        canvas.addEventListener(eventType, () => {
            isClicking = false;
            changeStack.push(canvasContext.getImageData(0, 0, canvasContext.canvas.width, canvasContext.canvas.height));
            if (eventType == "mouseleave") {
                toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
            }
        });
    });


    canvas.addEventListener("mousemove", (event) => {
        oldCoords = currentCoords;
        currentCoords = {
            x: Math.max(event.x - canvasOffsetX, 0),
            y: Math.max(event.y - canvasOffsetY, 0)
        };
        console.log(currentCoords);

        if (currentMode.mouseUpdate) {
            currentMode.fn();
        }
    });

    addEventListener("keydown", (event) => {
        // undo
        if (event.ctrlKey && event.key == 'z') {
            undoAction();
        }
        if (event.ctrlKey && event.shiftKey && event.key == 'Z') {
            redoAction();
        }

    });
}

function setupUiEvents() {
    document.querySelector('.tool:has(#draw-btn)').classList.add('chosen');
    let brushSizeInput = document.querySelector("#ribbon > input#size");
    let brushSizeOutput = document.querySelector("#sizeVal");
    brushSizeOutput.value = brushSizeInput.value;

    brushSizeInput.addEventListener("input", (event) => {
        brushSizeOutput.value = event.target.value;
        modes[currentMode.mode].strokeWidth = event.target.value;
    });

    brushSizeInput.addEventListener("wheel", (event) => {
        if (event.deltaY < 0) {
            brushSizeInput.stepUp(2);
        }
        else {
            brushSizeInput.stepDown(2);
        }
        brushSizeOutput.value = brushSizeInput.value;
        modes[currentMode.mode].strokeWidth = brushSizeInput.value;
    });

    brushSizeOutput.addEventListener("change", (event) => {
        if (event.target.value > 500) {
            event.target.value = 500;
        }
        brushSizeInput.value = event.target.value;
        modes[currentMode.mode].strokeWidth = event.target.value;
    });


    brushSizeOutput.addEventListener("wheel", (event) => {
        if (event.deltaY < 0) {
            brushSizeOutput.stepUp(2);
        }
        else {
            brushSizeOutput.stepDown(2);
        }
        brushSizeInput.value = brushSizeOutput.value;
        modes[currentMode.mode].strokeWidth = brushSizeOutput.value;
    });

    document.querySelector("#colorPicker").addEventListener("change", (event) => {
        color = event.target.value;
        alphaColor = `${color}ff`;
        console.log("new color ", color);
        console.log("new color ", alphaColor);
    });

}

window.onload = function() {
    createCanvas();
    calculateOffsets();
    setupCanvasEvents();
    setupUiEvents();
}

