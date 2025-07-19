const N = 100

const dt = 1
const diffusion = .00001
const viscosity = .0001
const maxVel = 100

const canvas = document.getElementById("canvas")
canvas.width = N
canvas.height = N
const ctx = canvas.getContext("2d")

const dens = new Float32Array((N + 2) * (N + 2)).fill(0)
const densPrev = new Float32Array((N + 2) * (N + 2)).fill(0)
const u = new Float32Array((N + 2) * (N + 2)).fill(0)
const uPrev = new Float32Array((N + 2) * (N + 2)).fill(0)
const v = new Float32Array((N + 2) * (N + 2)).fill(0)
const vPrev = new Float32Array((N + 2) * (N + 2)).fill(0)

// Define index equation
const index = (x, y) => x + y * (N + 2)

function addSource(N, x, s, dt) {
    for (let i = 0; i < (N + 2) * (N + 2); i++) {
        // Add source to pixel
        x[i] += s[i] * dt
    }
}

function diffuse(N, b, x, x0, diff, dt) {
    const a = dt * diff * N * N
    
    for (let k = 0; k < 20; k++) {
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                x[index(i, j)] = (x0[index(i, j)] + a * (
                    x[index(i-1, j)] +
                    x[index(i+1, j)] +
                    x[index(i, j-1)] +
                    x[index(i, j+1)]
                )) / (1 + 4 * a)
            }
        }
        setWall(N, b, x)
    }
}

function advect(N, b, d, d0, u, v, dt) {
    const dt0 = dt * N
    
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= N; j++) {
            let x = i - dt0 * u[index(i, j)]
            let y = j - dt0 * v[index(i, j)]
            
            if (x < .5) x = .5
            if (x > N + .5) x = N + .5
            let i0 = parseInt(x)
            let i1 = i0 + 1
            if (y < .5) y = .5
            if (y > N + .5) y = N + .5
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
    setWall(N, b, d)
}

function densStep(N, x, x0, u, v, diff, dt) {
    addSource(N, x, x0, dt)
    let swap = x0; x0 = x; x = swap

    diffuse(N, 0, x, x0, diff, dt)
    swap = x0; x0 = x; x = swap

    advect(N, 0, x, x0, u, v, dt)
}

function velStep(N, u, v, u0, v0, visc, dt) {
    addSource(N, u, u0, dt)
    addSource(N, v, v0, dt)

    let swap = u0; u0 = u; u = swap
    diffuse(N, 1, u, u0, visc, dt)

    swap = v0; v0 = v; v = swap
    diffuse(N, 2, v, v0, visc, dt)

    project(N, u, v, u0, v0)
    swap = u0; u0 = u; u = swap
    swap = v0; v0 = v; v = swap
    
    advect(N, 1, u, u0, u0, v0, dt)
    advect(N, 2, v, v0, u0, v0, dt)
    project(N, u, v, u0, v0)
}

function project(N, u, v, p, div) {
    const h = 1 / N
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j<=N; j++) {
            div[index(i, j)] = -0.5 * h * (u[index(i+1, j)] - u[index(i-1, j)] +
                                           v[index(i, j+1)] - v[index(i, j-1)])
            p[index(i, j)] = 0
        }
    }
    setWall(N, 0, div)
    setWall(N, 0, p)
    for (let k=0; k < 20; k++) {
        for (let i = 1; i <= N; i++) {
            for (let j = 1 ; j <= N ; j++ ) {
                p[index(i, j)] = (div[index(i, j)] + p[index(i-1, j)] + p[index(i+1, j)] +
                                                     p[index(i, j-1)] + p[index(i, j+1)]) / 4
            }
        }
        setWall(N, 0, p)
    }
    for (let i = 1; i <= N; i++) {
        for (let j=1; j<=N; j++) {
            u[index(i, j)] -= 0.5 * (p[index(i+1, j)] - p[index(i-1, j)]) / h
            v[index(i, j)] -= 0.5 * (p[index(i, j+1)] - p[index(i, j-1)]) / h
        }
    }
    setWall(N, 1, u)
    setWall(N, 2, v)
}

function setWall(N, b, x) {
    for (let i = 1; i <= N; i++) {
        x[index(0,     i)] = (b === 1) ? -x[index(1, i)] : x[index(1, i)]
        x[index(N + 1, i)] = (b === 1) ? -x[index(N, i)] : x[index(N, i)]
        x[index(i,     0)] = (b === 2) ? -x[index(i, 1)] : x[index(i, 1)]
        x[index(i, N + 1)] = (b === 2) ? -x[index(i, N)] : x[index(i, N)]
    }
    x[index(0,         0)] = 0.5 * (x[index(1,     0)] + x[index(0,     1)])
    x[index(0,     N + 1)] = 0.5 * (x[index(1, N + 1)] + x[index(0,     N)])
    x[index(N + 1,     0)] = 0.5 * (x[index(N,     0)] + x[index(N + 1, 1)])
    x[index(N + 1, N + 1)] = 0.5 * (x[index(N, N + 1)] + x[index(N + 1, N)])
}

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(e.clientX - rect.left + 1)
    const y = Math.floor(e.clientY - rect.top + 1)

    densPrev[index(x, y)] += 100
    uPrev[index(x, y)] += 10
    
    console.log("inject", x, y)

})
    
function render() {
    velStep(N, u, v, uPrev, vPrev, viscosity, dt)
    densStep(N, dens, densPrev, u, v, diffusion, dt)
    
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            // Debugging
            if (isNaN(dens[index(x, y)])) {
                dens[index(x, y)] = 0
                console.log("NaN")
            }
            
            // Get density of grid cell and display color
            const d = dens[index(x, y)]
            ctx.fillStyle = `rgb(${d * 255}, ${d * 255}, ${d * 255})`
            ctx.fillRect(x, y, 1, 1)
        }
    }

    densPrev.fill(0)
    uPrev.fill(0)
    vPrev.fill(0)

    console.log("frame")
    setTimeout(() => {
        requestAnimationFrame(render)
    }, 10)
}
render()
