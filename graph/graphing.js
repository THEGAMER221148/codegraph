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

function simplifyMath(expr, vars = {}) {
    // --- 1) tokenize
    expr = String(expr).replace(/\s+/g, "");
    const tokens = [];
    for (let i = 0; i < expr.length;) {
        const c = expr[i];

        // number
        if (/[0-9.]/.test(c)) {
        let j = i, dot = 0;
        while (j < expr.length && (/[0-9]/.test(expr[j]) || (expr[j] === '.' && !dot++))) j++;
        tokens.push({ t: 'num', v: parseFloat(expr.slice(i, j)) });
        i = j; continue;
        }

        // identifier (variable, allow multi-letter)
        if (/[A-Za-z_]/.test(c)) {
        let j = i + 1;
        while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
        tokens.push({ t: 'var', v: expr.slice(i, j) });
        i = j; continue;
        }

        // operators / parens
        if ("+-*/^()".includes(c)) {
        tokens.push({ t: 'op', v: c });
        i++; continue;
        }

        throw new Error("Bad char: " + c);
    }

    // --- 2) insert implicit * (core fix)
    // Insert '*' between: ... ) ( ... | ... ) var/num ... | ... num/var ( ...
    const withImp = [];
    for (let k = 0; k < tokens.length; k++) {
        const a = tokens[k];
        const b = tokens[k + 1];
        withImp.push(a);
        if (!b) continue;

        const aIsVal = (a.t === 'num') || (a.t === 'var') || (a.t === 'op' && a.v === ')');
        const bIsVal = (b.t === 'num') || (b.t === 'var') || (b.t === 'op' && b.v === '(');

        if (aIsVal && bIsVal) {
        // e.g. ( ... )( ... ),   )(x,   x(x+1),   2x,   (x)2,   x(y), (x)y
        withImp.push({ t: 'op', v: '*' });
        }
    }

    // --- 3) shunting-yard with unary minus (u-)
    const out = [], ops = [];
    const prec = { 'u-':5, '^':4, '*':3, '/':3, '+':2, '-':2 };
    const rightAssoc = new Set(['^','u-']);

    const isUnaryMinusAt = (idx) => {
        const tok = withImp[idx];
        if (!(tok.t === 'op' && tok.v === '-')) return false;
        if (idx === 0) return true;
        const prev = withImp[idx - 1];
        // unary if previous is an operator other than ')', or it's '('
        return (prev.t === 'op' && prev.v !== ')');
    };

    for (let i = 0; i < withImp.length; i++) {
        const t = withImp[i];
        if (t.t === 'num' || t.t === 'var') { out.push(t); continue; }
        if (t.t === 'op' && t.v === '(') { ops.push(t); continue; }
        if (t.t === 'op' && t.v === ')') {
        while (ops.length && ops[ops.length-1].v !== '(') out.push(ops.pop());
        if (!ops.length) throw new Error("Mismatched )");
        ops.pop(); continue;
        }
        if (t.t === 'op') {
        const op = isUnaryMinusAt(i) ? 'u-' : t.v;
        while (ops.length) {
            const top = ops[ops.length-1].v;
            if (top === '(') break;
            if ((prec[top] > prec[op]) || (prec[top] === prec[op] && !rightAssoc.has(op))) {
            out.push(ops.pop());
            } else break;
        }
        ops.push({ t:'op', v: op });
        }
    }
    while (ops.length) {
        const o = ops.pop();
        if (o.v === '(' || o.v === ')') throw new Error("Mismatched (");
        out.push(o);
    }

    // --- 4) evaluate RPN
    const stk = [];
    for (const t of out) {
        if (t.t === 'num') { stk.push(t.v); continue; }
        if (t.t === 'var') {
        const val = vars.hasOwnProperty(t.v) ? Number(vars[t.v]) : NaN;
        stk.push(val);
        continue;
        }
        if (t.v === 'u-') { const a = stk.pop(); stk.push(-a); continue; }
        const b = stk.pop(), a = stk.pop();
        switch (t.v) {
        case '+': stk.push(a + b); break;
        case '-': stk.push(a - b); break;
        case '*': stk.push(a * b); break;
        case '/': stk.push(a / b); break;
        case '^': stk.push(a ** b); break;
        default: throw new Error("Bad op: " + t.v);
        }
    }
    if (stk.length !== 1) throw new Error("Eval error");
    return stk[0];
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

canvas.addEventListener("mousedown", (event) => {
    isDragging = true;
    lastMousePos.x = event.clientX;
    lastMousePos.y = event.clientY;
});
canvas.addEventListener("mouseup", () => {
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