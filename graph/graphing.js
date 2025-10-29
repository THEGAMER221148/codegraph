const canvas = document.getElementById("viewport-canvas");
const ctx = canvas.getContext("2d");

function windowResize(){
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    console.log(canvas.width, canvas.height);
}

windowResize()
window.addEventListener("resize", windowResize);
document.getElementById("viewport").addEventListener("resize", windowResize)

let scale = {x: canvas.width/(canvas.width/10)/1000, y: canvas.width/(canvas.width/10)/1000};
let camPos = {x: 0, y: 0};

function toViewportPosition(position){
    return {x: (position.x - camPos.x) / scale.x + canvas.width/2, y: (camPos.y - position.y) / scale.y  + canvas.height/2}
}

function drawGrid(showNumbers){
    ctx.strokeStyle = "rgb(128, 128, 128)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, toViewportPosition({x: 0, y: 0}).y);
    ctx.lineTo(canvas.width, toViewportPosition({x: 0, y: 0}).y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toViewportPosition({x: 0, y: 0}).x, 0);
    ctx.lineTo(toViewportPosition({x: 0, y: 0}).x, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = "rgba(64, 64, 64, 1)";
}

function plotPoint(position, size, color){
    const pos = toViewportPosition({x: position.x, y: position.y});
    ctx.fillStyle = color;
    ctx.fillRect(pos.x-size, pos.y-size, size, size);
}

function simplifyMath(availableVariables){
    
}

function drawGraphs(){
    cells = document.getElementById("cells").childNodes;
    variables = {};
    cells.forEach(box => {
        //put code to simplify math expressions here
        if(box.value != undefined){
            boxValue = box.value.replaceAll(" ", "");
            if (boxValue.slice(0, 3) == "let") {
                variables[boxValue[3]] = boxValue.slice(5);
            } else if (boxValue.slice(0, 4) == "plot") {

            }
        }
    })
}

function renderLoop(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(false);
    drawGraphs();
    setTimeout(() => {
        renderLoop();
    }, 16);
}

renderLoop();

let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

window.addEventListener("mousedown", (event) => {
    isDragging = true;
    lastMousePos.x = event.clientX;
    lastMousePos.y = event.clientY;
});
canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    camPos.x -= dx * scale.x;
    camPos.y += dy * scale.y;

    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;

    drawGrid();
  }
});
canvas.addEventListener("wheel", (event) => {
    if(!event.shiftKey){
        scale.y *= event.deltaY > 0? 1.5 : 2/3;
    }
    if(!event.altKey){
        scale.x *= event.deltaY > 0? 1.5 : 2/3;
    }
});
window.addEventListener("keypress", event => {
    drawGraphs();
})