// const canvas = document.getElementById("canvas");
let canvas;
const canvasContainer = document.getElementById("canvasContainer");
let ctx;

let isDrawing = false;
let offsetX = 0;
let offsetY = 0;
let changeStack = [];
let oldCoords = { x: 0, y: 0 }
let newCoords = { x: 0, y: 0 }

function main() {
    createCanvas();
    calculateOffsets();
    setupCanvasEvents();
}

function setupCanvasEvents() {
    canvas.addEventListener("mousedown", (event) => {
        // left click to draw
        if (event.buttons == 1) {
            ctx.beginPath();
            isDrawing = true;
            changeStack.push([]);
        }
    });

    ["mouseup"].forEach((eventType) => {
        canvas.addEventListener(eventType, () => { isDrawing = false; });
    });

    canvas.addEventListener("mousemove", (event) => {
        newCoords = { x: event.x - offsetX, y: event.y - offsetY };
        if (isDrawing) {
            ctx.lineTo(event.x - offsetX, event.y - offsetY);
            ctx.stroke();
            changeStack[changeStack.length - 1].push({
                from: {
                    x: oldCoords.x,
                    y: oldCoords.y
                },
                to: {
                    x: newCoords.x,
                    y: newCoords.y
                }
            })
        }
        oldCoords = newCoords;
    });

    // undo
    addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key == 'z') {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            if (changeStack.length > 0) { changeStack.pop(); }

            for (let changeBatch = 0; changeBatch < changeStack.length; changeBatch++) {
                ctx.beginPath();
                if (changeStack[changeBatch].length > 0) {
                    ctx.moveTo(changeStack[changeBatch][0].from.x, changeStack[changeBatch][0].from.y);
                    for (let change = 0; change < changeStack[changeBatch].length; change++) {
                        ctx.lineTo(changeStack[changeBatch][change].to.x, changeStack[changeBatch][change].to.y);
                        ctx.stroke();
                    }
                }
            }
        }
    });

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
    ctx = canvas.getContext("2d");
}

window.onload = function() { main(); }
