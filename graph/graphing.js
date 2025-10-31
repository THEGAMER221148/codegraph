const canvas = document.getElementById("viewport-canvas");
const ctx = canvas.getContext("2d");
let graphQuality = 128;
let maxOperations = 512;

function windowResize(){
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

windowResize()
window.addEventListener("resize", windowResize);
document.getElementById("viewport").addEventListener("resize", windowResize)

let scale = {x: canvas.width/(canvas.width/10)/1000, y: canvas.width/(canvas.width/10)/1000};
let camPos = {x: 0, y: 0};

function toViewportPosition(position){
    return {
        x: (position.x - camPos.x) / scale.x + canvas.width/2,
        y: (camPos.y - position.y) / scale.y  + canvas.height/2
    }
}

function fromViewportPosition(position) {
    return {
        x: (position.x - canvas.width / 2) * scale.x + camPos.x,
        y: camPos.y - (position.y - canvas.height / 2) * scale.y
    };
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

function simplifyMath(expression, availableVariables){
    expression = "(" + expression.replaceAll(" ", "") + ")";
    // simplify the parentheses in order
    let tries = 0;
    while (expression.includes(")") && tries < maxOperations) {
        let currentSplit = expression.split(")")[0].split("(").at(-1);
        const oldSplit = currentSplit;
        // sub in the variables and multiply by coefficients
        for (const key in availableVariables) {
            const value = availableVariables[key];
            currentSplit = currentSplit.replaceAll(
                new RegExp(`(\\d*)${key}`, "g"),
                (_, coeff) => (coeff ? Number(coeff) * value : value)
            );
        }
        // do the actual simplifying

        // exponentiation
        while (currentSplit.includes("^") && tries < maxOperations){

            const number1 = currentSplit.split("^")[0].match(/-?\d+(\.\d+)?(?=[^0-9]*$)/)[0];
            const number2 = currentSplit.split("^")[1].match(/-?\d+(\.\d+)?/)[0];

            currentSplit = currentSplit.replace(number1 + "^" + number2, String(Number(number1) ** Number(number2)));
            tries ++;
        }

        // multiplication and division
        while ((currentSplit.includes("*") || currentSplit.includes("/")) && tries < maxOperations) {

            const multIndex = currentSplit.indexOf("*");
            const divIndex = currentSplit.indexOf("/");

            if (multIndex !== -1 && (divIndex === -1 || multIndex < divIndex) ) {
                const number1 = currentSplit.split("*")[0].match(/-?\d+(\.\d+)?(?=[^0-9]*$)/)[0];
                const number2 = currentSplit.split("*")[1].match(/-?\d+(\.\d+)?/)[0];

                currentSplit = currentSplit.replace(number1 + "*" + number2, String(Number(number1) * Number(number2)));

            } else if (divIndex !== -1) {
                const number1 = currentSplit.split("/")[0].match(/-?\d+(\.\d+)?(?=[^0-9]*$)/)[0];
                const number2 = currentSplit.split("/")[1].match(/-?\d+(\.\d+)?/)[0];

                currentSplit = currentSplit.replace(number1 + "/" + number2, String(Number(number1) / Number(number2)));
            }
            tries ++;
        }

        //addition and subtraction
        while ((currentSplit.includes("+") || currentSplit.includes("-")) && tries < maxOperations) {

            const addIndex = currentSplit.indexOf("+");
            const subtIndex = currentSplit.indexOf("-");

            if (addIndex !== -1 && (subtIndex === -1 || addIndex < subtIndex) ) {
                const number1 = currentSplit.split("+")[0].match(/-?\d+(\.\d+)?(?=[^0-9]*$)/)[0];
                const number2 = currentSplit.split("+")[1].match(/-?\d+(\.\d+)?/)[0];

                currentSplit = currentSplit.replace(number1 + "+" + number2, String(Number(number1) + Number(number2)));

            } else if (subtIndex !== -1) {
                const number1 = currentSplit.split("-")[0].match(/-?\d+(\.\d+)?(?=[^0-9]*$)/)[0];
                const number2 = currentSplit.split("-")[1].match(/-?\d+(\.\d+)?/)[0];

                currentSplit = currentSplit.replace(number1 + "-" + number2, String(Number(number1) - Number(number2)));
            }
            tries ++;
        }

        //at the end:
        const i = expression.indexOf(oldSplit);
        const prev = i > 1 ? expression[i - 2] : '';
        if (/[0-9)]/.test(prev)) {
        expression = expression.replace("(" + oldSplit + ")", "*" + currentSplit);
        } else {
        expression = expression.replace("(" + oldSplit + ")", currentSplit);
        }
        tries ++;
    }
    if (tries >= 128) {
        throw Error;
    }

    return parseFloat(expression);
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
                try {
                    box.style.color = "white";
                    const slices = boxValue.slice(5, boxValue.length - 1).split(",");
                    ctx.fillStyle = "rgb(255, 0, 0)";
                    const pos = toViewportPosition({x: simplifyMath(slices[0], { ...variables, x: simplifyMath(slices[0], variables) }), y: simplifyMath(slices[1], { ...variables, x: simplifyMath(slices[0], variables) })});
                    ctx.fillRect(pos.x-5, pos.y-5, 10, 10);
                } catch {
                    box.style.color = "red";
                    console.log("error");
                }
            } else if (boxValue.slice(0, 5) == "graph") {
                try {
                    box.style.color = "white";
                    const expression = boxValue.slice(6, boxValue.length - 1);
                    ctx.strokeStyle = "rgb(255, 0, 0)";

                    let actualPosition = fromViewportPosition({x: 0, y: 0}).x;
                    ctx.beginPath();
                    ctx.moveTo(0, toViewportPosition({x: actualPosition, y: simplifyMath(expression, {x: actualPosition})}).y);
                    for (let i = 0; i < canvas.width; i += canvas.width / graphQuality) {
                        actualPosition = fromViewportPosition({x: i, y: 0}).x;
                        ctx.lineTo(i, toViewportPosition({x: actualPosition, y: simplifyMath(expression, {x: actualPosition})}).y);
                    }
                    ctx.stroke();
                } catch {
                    box.style.color = "red";
                    console.log("error");
                }
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