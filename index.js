// const canvas = document.getElementById("canvas");
let canvas;
const canvasContainer = document.getElementById("canvasContainer");
let ctx;

let cursorEnabled = false;
let offsetX = 0;
let offsetY = 0;
let changeStack = [];
let redoStack = [];
let oldCoords = { x: 0, y: 0 }
let newCoords = { x: 0, y: 0 }
let changedArea = { x: 0, y: 0, width: 0, height: 0 };
let prevImageData;

let modes = {
    // TODO: fn should be a function that gets called based on currentMode
    Drawing: { mode: "drawing", fn: draw },
    Erasing: { mode: "erasing", fn: erase }
};

let currentMode = modes.Drawing;

function main() {
    createCanvas();
    calculateOffsets();
    setupCanvasEvents();
}

function setupCanvasEvents() {
    canvas.addEventListener("mousedown", (event) => {
        // left click to draw
        if (event.buttons == 1) {
            redoStack = [];
            ctx.beginPath();
            changedArea.x = event.x - offsetX;
            changedArea.y = event.y - offsetY;
            changedArea.width = 0;
            changedArea.height = 0;
            cursorEnabled = true;
        }
    });

    ["mouseup"].forEach((eventType) => {
        canvas.addEventListener(eventType, () => {
            cursorEnabled = false;
            console.log(changedArea);
            changeStack.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
            // ctx.rect(changedArea.x, changedArea.y, changedArea.width, changedArea.height);
            // ctx.stroke();
        });
    });

    canvas.addEventListener("mousemove", (event) => {
        newCoords = { x: event.x - offsetX, y: event.y - offsetY };
        currentMode.fn();
        oldCoords = newCoords;
    });

    addEventListener("keydown", (event) => {
        // undo
        if (event.ctrlKey && event.key == 'z') {
            if (changeStack.length > 1) {
                redoStack.push(changeStack.pop());
                ctx.putImageData(changeStack[changeStack.length - 1], 0, 0);
            } else if (changeStack.length == 1) {
                ctx.putImageData(changeStack[0], 0, 0);
                redoStack.push(changeStack.pop());
            }
        }
        if (event.ctrlKey && event.shiftKey && event.key == 'Z') {
            if (redoStack.length > 0) {
                ctx.putImageData(redoStack.pop(), 0, 0);
            }
        }

    });


}

function draw() {

    if (cursorEnabled) {
        ctx.lineTo(newCoords.x, newCoords.y);
        if (newCoords.x > changedArea.x) {
            changedArea.width = Math.max(changedArea.width, newCoords.x - changedArea.x);
        } else if (newCoords.x < changedArea.x) {
            changedArea.width += changedArea.x - newCoords.x;
            changedArea.x = newCoords.x;
        }
        if (newCoords.y > changedArea.y) {
            changedArea.height = Math.max(changedArea.height, newCoords.y - changedArea.y);
        } else if (newCoords.y < changedArea.y) {
            changedArea.height += changedArea.y - newCoords.y;
            changedArea.y = newCoords.y;
        }
        ctx.stroke();
    }
}

function erase() {
    if (cursorEnabled) {
        ctx.clearRect(Math.max(newCoords.x - 10, 0), Math.max(newCoords.y - 10, 0), 10, 10);
    }
}

function setMethod(method) {
    currentMode = modes[method];
}

function calculateOffsets() {
    offsetX = canvas.getBoundingClientRect().x;
    offsetY = canvas.getBoundingClientRect().y;
}

function createCanvas() {
    let canvasContainerRect = canvasContainer.getBoundingClientRect();
    canvas = document.createElement("canvas");
    canvas.setAttribute("id", "canvas");
    canvas.setAttribute("width", `${canvasContainerRect.width}`);
    canvas.setAttribute("height", `${canvasContainerRect.height}`);
    canvasContainer.replaceWith(canvas);
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.lineWidth = 50;
    ctx.lineJoin = "round";
    changeStack.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
}

window.onload = function() { main(); }
