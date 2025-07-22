const downscale = 10

let width = Math.floor(window.innerWidth / downscale)
let height = Math.floor(window.innerHeight / downscale)

const dt = 1
const diffusion = .00001
const viscosity = 0

const canvas = document.getElementById("canvas")
canvas.width = width
canvas.height = height
const ctx = canvas.getContext("2d")

const arrSize = (width + 2) * (height + 2)
const dens = new Float32Array(arrSize).fill(0)
const densPrev = new Float32Array(arrSize).fill(0)
const u = new Float32Array(arrSize).fill(0)
const uPrev = new Float32Array(arrSize).fill(0)
const v = new Float32Array(arrSize).fill(0)
const vPrev = new Float32Array(arrSize).fill(0)

// Define index equation
const index = (x, y) => x + y * (width + 2)

function addSource(arrSize, x, s, dt) {
    for (let i = 0; i < arrSize; i++) {
        // Add source to pixel
        x[i] += s[i] * dt
    }
}

function diffuse(w, h, b, x, x0, diff, dt) {
    const a = dt * diff * w * w
    
    for (let k = 0; k < 10; k++) {
        for (let i = 1; i <= w; i++) {
            for (let j = 1; j <= h; j++) {
                x[index(i, j)] = (x0[index(i, j)] + a * (
                    x[index(i-1, j)] +
                    x[index(i+1, j)] +
                    x[index(i, j-1)] +
                    x[index(i, j+1)]
                )) / (1 + 4 * a)
            }
        }
        setWall(w, h, b, x)
    }
}

function advect(w, h, b, d, d0, u, v, dt) {
    const dt0x = dt * w
    const dt0y = dt * h
    
    for (let i = 1; i <= w; i++) {
        for (let j = 1; j <= h; j++) {
            let x = i - dt0x * u[index(i, j)]
            let y = j - dt0y * v[index(i, j)]
            
            if (x < .5) x = .5
            if (x > w + .5) x = w + .5
            let i0 = parseInt(x)
            let i1 = i0 + 1
            if (y < .5) y = .5
            if (y > h + .5) y = h + .5
            let j0 = parseInt(y)
            let j1 = j0 + 1
            
            const s1 = x - i0
            const s0 = 1 - s1
            const t1 = y - j0
            const t0 = 1 - t1
            
            d[index(i, j)] = s0 * (t0 * d0[index(i0, j0)] + t1 * d0[index(i0, j1)])
            + s1 * (t0 * d0[index(i1, j0)] + t1 * d0[index(i1, j1)])  
        }
    }
    setWall(w, h, b, d)
}

function densStep(w, h, x, x0, u, v, diff, dt) {
    addSource(arrSize, x, x0, dt)
    let swap = x0; x0 = x; x = swap

    diffuse(w, h, 0, x, x0, diff, dt)
    swap = x0; x0 = x; x = swap

    advect(w, h, 0, x, x0, u, v, dt)
}

function velStep(w, h, u, v, u0, v0, visc, dt) {
    addSource(arrSize, u, u0, dt)
    addSource(arrSize, v, v0, dt)

    let swap = u0; u0 = u; u = swap
    diffuse(w, h, 1, u, u0, visc, dt)

    swap = v0; v0 = v; v = swap
    diffuse(w, h, 2, v, v0, visc, dt)

    project(w, h, u, v, u0, v0)
    swap = u0; u0 = u; u = swap
    swap = v0; v0 = v; v = swap
    
    advect(w, h, 1, u, u0, u0, v0, dt)
    advect(w, h, 2, v, v0, u0, v0, dt)
    project(w, h, u, v, u0, v0)
}

function project(w, h, u, v, p, div) {
    const spacing = 1 / w
    for (let i = 1; i <= w; i++) {
        for (let j = 1; j <= h; j++) {
            div[index(i, j)] = -0.5 * spacing * (u[index(i+1, j)] - u[index(i-1, j)] +
                                           v[index(i, j+1)] - v[index(i, j-1)])
            p[index(i, j)] = 0
        }
    }
    setWall(w, h, 0, div)
    setWall(w, h, 0, p)
    for (let k=0; k < 10; k++) {
        for (let i = 1; i <= w; i++) {
            for (let j = 1 ; j <= h; j++ ) {
                p[index(i, j)] = (div[index(i, j)] + p[index(i-1, j)] + p[index(i+1, j)] +
                                                     p[index(i, j-1)] + p[index(i, j+1)]) / 4
            }
        }
        setWall(w, h, 0, p)
    }
    for (let i = 1; i <= w; i++) {
        for (let j = 1; j <= h; j++) {
            u[index(i, j)] -= 0.5 * (p[index(i+1, j)] - p[index(i-1, j)]) / spacing
            v[index(i, j)] -= 0.5 * (p[index(i, j+1)] - p[index(i, j-1)]) / spacing
        }
    }
    setWall(w, h, 1, u)
    setWall(w, h, 2, v)
}

function setWall(w, h, b, x) {
    // Left and right walls
    for (let j = 1; j <= h; j++) {
        x[index(0,     j)] = (b === 1) ? -x[index(1, j)] : x[index(1, j)]
        x[index(w + 1, j)] = (b === 1) ? -x[index(w, j)] : x[index(w, j)]
    }

    // Top and bottom walls
    for (let i = 1; i <= w; i++) {
        x[index(i,     0)] = (b === 2) ? -x[index(i, 1)] : x[index(i, 1)]
        x[index(i, h + 1)] = (b === 2) ? -x[index(i, h)] : x[index(i, h)]
    }

    // Corners
    x[index(0,         0)] = 0.5 * (x[index(1,     0)] + x[index(0,     1)])
    x[index(0,     h + 1)] = 0.5 * (x[index(1, h + 1)] + x[index(0,     h)])
    x[index(w + 1,     0)] = 0.5 * (x[index(w,     0)] + x[index(w + 1, 1)])
    x[index(w + 1, h + 1)] = 0.5 * (x[index(w, h + 1)] + x[index(w + 1, h)])
}

function injectCircle(cx, cy, radius, amount, horVel, vertVel) {
    const r2 = radius * radius;
    for (let i = cx - radius; i <= cx + radius; i++) {
        for (let j = cy - radius; j <= cy + radius; j++) {
            const dx = i - cx;
            const dy = j - cy;
            if (dx * dx + dy * dy <= r2) {
                if (i >= 1 && i <= width && j >= 1 && j <= height) { // stay inside grid
                    densPrev[index(i, j)] += amount;
                    u[index(i, j)] += horVel;
                    v[index(i, j)] += vertVel;
                }
            }
        }
    }
}

let lastTouchX = null;
let lastTouchY = null;
let lastTouchTime = null;

document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const currentTime = performance.now();
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    let horVel = 0;
    let vertVel = 0;

    if (lastTouchX !== null && lastTouchY !== null && lastTouchTime !== null) {
        const deltaX = currentX - lastTouchX;
        const deltaY = currentY - lastTouchY;
        const deltaTime = currentTime - lastTouchTime;

        if (deltaTime > 0) {
            horVel = deltaX / deltaTime; // px/ms
            vertVel = deltaY / deltaTime; // px/ms
        }
    }

    lastTouchX = currentX;
    lastTouchY = currentY;
    lastTouchTime = currentTime;

    // Convert to your grid space if needed
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor((currentX - rect.left + 1) / downscale);
    const gridY = Math.floor((currentY - rect.top + 1) / downscale);

    injectCircle(gridX, gridY, 2, 1, horVel * 0.5, vertVel * 0.5);
}, { passive: true });

    
function render() {
    velStep(width, height, u, v, uPrev, vPrev, viscosity, dt)
    densStep(width, height, dens, densPrev, u, v, diffusion, dt)
    
    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    for (let x = 1; x <= width; x++) {
        for (let y = 1; y <= height; y++) {
            const idx = index(x, y)
            const i = ((y - 1) * width + (x - 1)) * 4

            const r = Math.min(255, dens[idx] * 255)
            const g = Math.min(255, 255 - Math.abs(u[idx] * 25500))
            const b = Math.min(255, 255 - Math.abs(v[idx] * 25500))
            const a = Math.min(255, dens[idx] * 255)

            data[i] = r     // R
            data[i + 1] = g // G
            data[i + 2] = b // B
            data[i + 3] = a // A
        }
    }

    ctx.putImageData(imageData, 0, 0)

    for (let i = 0; i < dens.length; i++) dens[i] -= .001 // Fades the smoke
    densPrev.fill(0)
    uPrev.fill(0)
    vPrev.fill(0)

    setTimeout(() => {
        requestAnimationFrame(render)
    }, 0)
}
render()
