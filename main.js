const gridWidth = 100
const gridHeight = 100
const gravity = .001
const maxVel = 100

const canvas = document.getElementById("canvas")
canvas.width = gridWidth
canvas.height = gridHeight
const ctx = canvas.getContext("2d")

// To get the index of a cell do: arr[x + y * gridWidth]
const density = new Float32Array(gridWidth * gridHeight)
const pressure = new Float32Array(gridWidth * gridHeight)
const u = new Float32Array(gridWidth * gridHeight)
const v = new Float32Array(gridWidth * gridHeight)

function applyForces() {
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            // Dampen velocity
            u[x + y * gridWidth] *= 0.95
            v[x + y * gridWidth] *= 0.95

            // Gravity
            // v[x + y * gridWidth] += gravity
        }
    }
}

const timestep = .01
function moveDensity() {
    const newDensity = []
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            let previous_x = x - u[x + y * gridWidth] * timestep
            let previous_y = y - v[x + y * gridWidth] * timestep

            previous_x = Math.min(Math.max(previous_x, 0), gridWidth - 1)
            previous_y = Math.min(Math.max(previous_y, 0), gridHeight - 1)

            let i0 = Math.floor(previous_x)
            let i1 = Math.min(i0 + 1, gridWidth - 1)
            let j0 = Math.floor(previous_y)
            let j1 = Math.min(j0 + 1, gridHeight - 1)

            let s1 = previous_x - i0
            let s0 = 1 - s1
            let t1 = previous_y - j0
            let t0 = 1 - t1

            newDensity[x + y * gridWidth] =
                s0 * (t0 * density[i0 + j0 * gridWidth] + t1 * density[i0 + j1 * gridWidth]) +
                s1 * (t0 * density[i1 + j0 * gridWidth] + t1 * density[i1 + j1 * gridWidth])
        }
    }
    // Assign new densities
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            density[x + y * gridWidth] = newDensity[x + y * gridWidth]
        }
    }
}

function getDivergence() {
    const divergence = []
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const left = Math.max(x - 1, 0)
            const right = Math.min(x + 1, gridWidth - 1)
            const down = Math.max(y - 1, 0)
            const up = Math.min(y + 1, gridHeight - 1)

            const sumVel = (u[right + y * gridWidth] - u[left + y * gridWidth]) / 2
                         + (v[x + up * gridWidth] - v[x + down * gridWidth]) / 2
            divergence.push(sumVel)
        }
    }
    return divergence
}

function getPressure() {
    const divergence = getDivergence()
    const newPressure = []
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
                const left = Math.max(x - 1, 0)
                const right = Math.min(x + 1, gridWidth - 1)
                const down = Math.max(y - 1, 0)
                const up = Math.min(y + 1, gridHeight - 1)

                newPressure[x + y * gridWidth] = (pressure[right + y * gridWidth] + pressure[left + y * gridWidth]
                                               + pressure[x + up * gridWidth] + pressure[x + down * gridWidth]
                                               - divergence[x + y * gridWidth]) / 4
        }
    }
    // Assign new pressures
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            pressure[x + y * gridWidth] = newPressure[x + y * gridWidth]
        }
    }
}

function velocityCorrection() {
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const left = Math.max(x - 1, 0)
            const right = Math.min(x + 1, gridWidth - 1)
            const down = Math.max(y - 1, 0)
            const up = Math.min(y + 1, gridHeight - 1)

            u[x + y * gridWidth] -= (pressure[right + y * gridWidth] - pressure[left + y * gridWidth]) / 2
            v[x + y * gridWidth] -= (pressure[x + up * gridWidth] - pressure[x + down * gridWidth]) / 2

            u[x + y * gridWidth] = Math.max(Math.min(u[x + y * gridWidth], maxVel), -maxVel)
            v[x + y * gridWidth] = Math.max(Math.min(v[x + y * gridWidth], maxVel), -maxVel)
        }
    }
}

function diffuseDensity() {
    const newDensity = []
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const left = Math.max(x - 1, 0)
            const right = Math.min(x + 1, gridWidth - 1)
            const down = Math.max(y - 1, 0)
            const up = Math.min(y + 1, gridHeight - 1)
            
            // Diffuse density
            newDensity[x + y * gridWidth] = density[x + y * gridWidth] + .001 * (((density[right + y * gridWidth] + density[left + y * gridWidth] + density[x + up * gridWidth] + density[x + down * gridWidth]) / 4) - density[x + y * gridWidth])
        }
    }
    // Assign new densities
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            density[x + y * gridWidth] = newDensity[x + y * gridWidth]
        }
    }
}

function diffuseVelocity() {
    const newU = []
    const newV = []
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const left = Math.max(x - 1, 0)
            const right = Math.min(x + 1, gridWidth - 1)
            const down = Math.max(y - 1, 0)
            const up = Math.min(y + 1, gridHeight - 1)
            
            // Diffuse density
            newU[x + y * gridWidth] = u[x + y * gridWidth] + .001 * (((u[right + y * gridWidth] + u[left + y * gridWidth] + u[x + up * gridWidth] + u[x + down * gridWidth]) / 4) - u[x + y * gridWidth])
            newV[x + y * gridWidth] = v[x + y * gridWidth] + .001 * (((v[right + y * gridWidth] + v[left + y * gridWidth] + v[x + up * gridWidth] + v[x + down * gridWidth]) / 4) - v[x + y * gridWidth])

            u[x + y * gridWidth] = Math.max(Math.min(u[x + y * gridWidth], maxVel), -maxVel)
            v[x + y * gridWidth] = Math.max(Math.min(v[x + y * gridWidth], maxVel), -maxVel)
        }
    }
    // Assign new densities
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            u[x + y * gridWidth] = newU[x + y * gridWidth]
            v[x + y * gridWidth] = newV[x + y * gridWidth]
        }
    }
}

function setBoundaries() {
    // Left and right edges
    for (let y = 0; y < gridHeight; y++) {
        u[0 + y * gridWidth] = 0 // Left edge
        u[(gridWidth - 1) + y * gridWidth] = 0 // Right edge
    }

    // Top and bottom edges
    for (let x = 0; x < gridWidth; x++) {
        v[x + 0 * gridWidth] = 0 // Top edge
        v[x + (gridHeight - 1) * gridWidth] = 0 // Bottom edge
    }
}

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(e.clientX - rect.left)
    const y = Math.floor(e.clientY - rect.top)

    density[x + y * gridWidth] += 1
    v[x + y * gridWidth] = -.05

    console.log("inject", x, y)

})

function render() {
    applyForces()
    moveDensity()
    for (let i = 0; i < 30; i ++) getPressure()
    velocityCorrection()
    diffuseDensity()
    diffuseVelocity()
    setBoundaries()

    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            // Get density of grid cell and display color
            const d = density[x + y * gridWidth]
            ctx.fillStyle = `rgb(${d * 255}, ${d * 255}, ${d * 255})`
            ctx.fillRect(x, y, 1, 1)
        }
    }
    setTimeout(() => {
        requestAnimationFrame(render)
    }, 0)
}
render()
