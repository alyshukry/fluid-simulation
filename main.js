
class Fluid {
    constructor(canvas, diffusion = 0, viscosity = 0, dt = 1) {
        this.dt = dt
        this.diffusion = diffusion
        this.viscosity = viscosity

        this.CANVAS = canvas
        this.WIDTH = this.CANVAS.width
        this.HEIGHT = this.CANVAS.height
        this.CTX = this.CANVAS.getContext("2d")

        this.arrSize = (this.WIDTH + 2) * (this.HEIGHT + 2)
        this.c = new Array(this.arrSize).fill(0)
        this.c0 = new Array(this.arrSize).fill(0)
        this.m = new Array(this.arrSize).fill(0)
        this.m0 = new Array(this.arrSize).fill(0)
        this.y = new Array(this.arrSize).fill(0)
        this.y0 = new Array(this.arrSize).fill(0)
        this.k = new Array(this.arrSize).fill(0)
        this.k0 = new Array(this.arrSize).fill(0)
        this.u = new Array(this.arrSize).fill(0)
        this.u0 = new Array(this.arrSize).fill(0)
        this.v = new Array(this.arrSize).fill(0)
        this.v0 = new Array(this.arrSize).fill(0)

        this.index = (x, y) => x + y * (this.WIDTH + 2)

        this.render = this.render.bind(this)
        this.render()
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    addSource(arrSize, x, s, dt) {
        for (let i = 0; i < arrSize; i++) x[i] += s[i] * dt
    }

    diffuse(w, h, b, x, x0, diff, dt) {
        const a = dt * diff * w * w
        for (let k = 0; k < 10; k++) {
            for (let i = 1; i <= w; i++) {
                for (let j = 1; j <= h; j++) {
                    x[this.index(i, j)] = (x0[this.index(i, j)] + a * (
                        x[this.index(i - 1, j)] +
                        x[this.index(i + 1, j)] +
                        x[this.index(i, j - 1)] +
                        x[this.index(i, j + 1)]
                    )) / (1 + 4 * a)
                }
            }
            this.setWall(w, h, b, x)
        }
    }

    advect(w, h, b, d, d0, u, v, dt) {
        const dt0x = dt * w
        const dt0y = dt * h

        for (let i = 1; i <= w; i++) {
            for (let j = 1; j <= h; j++) {
                let x = i - dt0x * u[this.index(i, j)]
                let y = j - dt0y * v[this.index(i, j)]

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

                d[this.index(i, j)] = s0 * (t0 * d0[this.index(i0, j0)] + t1 * d0[this.index(i0, j1)])
                    + s1 * (t0 * d0[this.index(i1, j0)] + t1 * d0[this.index(i1, j1)])
            }
        }
        this.setWall(w, h, b, d)
    }

    densStep(w, h, fields, fields0, u, v, diff, dt) {
        for (let n = 0; n < fields.length; n++) {
            const x = fields[n]
            const x0 = fields0[n]

            this.addSource(this.arrSize, x, x0, dt)

            // diffuse
            let tmp = x0.slice()
            fields0[n] = x
            fields[n] = tmp
            this.diffuse(w, h, 0, fields[n], fields0[n], diff, dt)

            // advect
            tmp = fields0[n]
            fields0[n] = fields[n]
            fields[n] = tmp
            this.advect(w, h, 0, fields[n], fields0[n], u, v, dt)
        }
    }


    velStep(w, h, u, v, u0, v0, visc, dt) {
        this.addSource(this.arrSize, u, u0, dt)
        this.addSource(this.arrSize, v, v0, dt)

        let swap = u0; u0 = u; u = swap
        this.diffuse(w, h, 1, u, u0, visc, dt)

        swap = v0; v0 = v; v = swap
        this.diffuse(w, h, 2, v, v0, visc, dt)

        this.project(w, h, u, v, u0, v0)
        swap = u0; u0 = u; u = swap
        swap = v0; v0 = v; v = swap

        this.advect(w, h, 1, u, u0, u0, v0, dt)
        this.advect(w, h, 2, v, v0, u0, v0, dt)
        this.project(w, h, u, v, u0, v0)
    }

    project(w, h, u, v, p, div) {
        const spacing = 1 / w
        for (let i = 1; i <= w; i++) {
            for (let j = 1; j <= h; j++) {
                div[this.index(i, j)] = -0.5 * spacing * (u[this.index(i + 1, j)] - u[this.index(i - 1, j)] +
                    v[this.index(i, j + 1)] - v[this.index(i, j - 1)])
                p[this.index(i, j)] = 0
            }
        }
        this.setWall(w, h, 0, div)
        this.setWall(w, h, 0, p)
        for (let k = 0; k < 10; k++) {
            for (let i = 1; i <= w; i++) {
                for (let j = 1; j <= h; j++) {
                    p[this.index(i, j)] = (div[this.index(i, j)] + p[this.index(i - 1, j)] + p[this.index(i + 1, j)] +
                        p[this.index(i, j - 1)] + p[this.index(i, j + 1)]) / 4
                }
            }
            this.setWall(w, h, 0, p)
        }
        for (let i = 1; i <= w; i++) {
            for (let j = 1; j <= h; j++) {
                u[this.index(i, j)] -= 0.5 * (p[this.index(i + 1, j)] - p[this.index(i - 1, j)]) / spacing
                v[this.index(i, j)] -= 0.5 * (p[this.index(i, j + 1)] - p[this.index(i, j - 1)]) / spacing
            }
        }
        this.setWall(w, h, 1, u)
        this.setWall(w, h, 2, v)
    }

    setWall(w, h, b, x) {
        for (let j = 1; j <= h; j++) {
            x[this.index(0, j)] = (b === 1) ? -x[this.index(1, j)] : x[this.index(1, j)]
            x[this.index(w + 1, j)] = (b === 1) ? -x[this.index(w, j)] : x[this.index(w, j)]
        }
        for (let i = 1; i <= w; i++) {
            x[this.index(i, 0)] = (b === 2) ? -x[this.index(i, 1)] : x[this.index(i, 1)]
            x[this.index(i, h + 1)] = (b === 2) ? -x[this.index(i, h)] : x[this.index(i, h)]
        }
        x[this.index(0, 0)] = 0.5 * (x[this.index(1, 0)] + x[this.index(0, 1)])
        x[this.index(0, h + 1)] = 0.5 * (x[this.index(1, h + 1)] + x[this.index(0, h)])
        x[this.index(w + 1, 0)] = 0.5 * (x[this.index(w, 0)] + x[this.index(w + 1, 1)])
        x[this.index(w + 1, h + 1)] = 0.5 * (x[this.index(w, h + 1)] + x[this.index(w + 1, h)])
    }

    spawnInk(px, py, diameter = Math.ceil((this.WIDTH * this.HEIGHT) / 1500), C = 0, M = 0, Y = 0, K = 0) {
        const cx = Math.floor(px)
        const cy = Math.floor(py)
        const rad = diameter * 0.5

        const minX = Math.max(1, Math.floor(cx - rad))
        const maxX = Math.min(this.WIDTH, Math.floor(cx + rad))
        const minY = Math.max(1, Math.floor(cy - rad))
        const maxY = Math.min(this.HEIGHT, Math.floor(cy + rad))

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const dx = x - cx
                const dy = y - cy
                if (dx * dx + dy * dy <= rad * rad) {
                    const i = this.index(x, y)
                    this.c0[i] = C
                    this.m0[i] = M
                    this.y0[i] = Y
                    this.k0[i] = K
                }
            }
        }
    }

    injectVelocity(px, py, vx, vy, diameter = (this.WIDTH * this.HEIGHT) / 2500) {
        const cx = Math.floor(px)
        const cy = Math.floor(py)
        const rad = diameter * 0.5

        const minX = Math.max(1, Math.floor(cx - rad))
        const maxX = Math.min(this.WIDTH, Math.floor(cx + rad))
        const minY = Math.max(1, Math.floor(cy - rad))
        const maxY = Math.min(this.HEIGHT, Math.floor(cy + rad))

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const dx = x - cx
                const dy = y - cy
                if (dx * dx + dy * dy <= rad * rad) {
                    const i = this.index(x, y)
                    this.u0[i] = vx
                    this.v0[i] = vy
                }
            }
        }
    }

    render() {
        this.velStep(this.WIDTH, this.HEIGHT, this.u, this.v, this.u0, this.v0, this.viscosity, this.dt)
        this.densStep(this.WIDTH, this.HEIGHT, [this.c, this.m, this.y, this.k], [this.c0, this.m0, this.y0, this.k0], this.u, this.v, this.diffusion, this.dt)

        function cmykToRgb(C, M, Y, K) {
            const r = 255 * (1 - C) * (1 - K)
            const g = 255 * (1 - M) * (1 - K)
            const b = 255 * (1 - Y) * (1 - K)
            return { r, g, b }
        }


        const imageData = this.CTX.createImageData(this.WIDTH, this.HEIGHT)

        for (let x = 1; x <= this.WIDTH; x++) {
            for (let y = 1; y <= this.HEIGHT; y++) {
                const i = ((y - 1) * this.WIDTH + (x - 1)) * 4
                const C = this.c[this.index(x, y)] / 255
                const M = this.m[this.index(x, y)] / 255
                const Y = this.y[this.index(x, y)] / 255
                const K = this.k[this.index(x, y)] / 255

                const { r, g, b } = cmykToRgb(C, M, Y, K)

                imageData.data[i] = r
                imageData.data[i + 1] = g
                imageData.data[i + 2] = b
                imageData.data[i + 3] = (C + M + Y + K) * 255

            }
        }

        this.CTX.putImageData(imageData, 0, 0)

        for (let i = 0; i < this.c.length; i++) {
            this.c[i] -= .05
            this.m[i] -= .05
            this.y[i] -= .05
            this.k[i] -= .05
            this.c[i] = Math.max(0, this.c[i])
            this.m[i] = Math.max(0, this.m[i])
            this.y[i] = Math.max(0, this.y[i])
            this.k[i] = Math.max(0, this.k[i])
        }

        this.c0.fill(0)
        this.m0.fill(0)
        this.y0.fill(0)
        this.k0.fill(0)

        this.u0.fill(0)
        this.v0.fill(0)

        this.timeoutId = setTimeout(() => {
            this.animationId = requestAnimationFrame(this.render)
        }, 0)
    }
}

// Example palette (can be any length)
const palette = [
    // Cyan ink
    [255, 0, 0, 0],

    // Magenta ink
    [0, 255, 0, 0],

    // Yellow ink
    [0, 0, 255, 0],

    // Black ink
    [0, 0, 0, 255]

]

// t loops through palette smoothly
function getPaletteColor(t) {
    const p = palette
    const N = p.length
    const idx = Math.floor(t) % N
    const next = (idx + 1) % N
    const f = t - Math.floor(t) // fractional part for lerp

    const r = Math.round(p[idx][0] + (p[next][0] - p[idx][0]) * f)
    const g = Math.round(p[idx][1] + (p[next][1] - p[idx][1]) * f)
    const b = Math.round(p[idx][2] + (p[next][2] - p[idx][2]) * f)
    return { r, g, b }
}

function enableInteraction(fluid) {
    let prevX = null
    let prevY = null
    let t = 0
    const speed = 0.005

    const canvas = fluid.CANVAS

    const getPos = e => {
        const rect = canvas.getBoundingClientRect()
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
        return {
            x: x * (fluid.WIDTH / canvas.clientWidth),
            y: y * (fluid.HEIGHT / canvas.clientHeight)
        }
    }

    const move = e => {
        const { x, y } = getPos(e)

        if (prevX !== null) {
            const vx = (x - prevX) * 2 / 50
            const vy = (y - prevY) * 2 / 50
            fluid.injectVelocity(x, y, vx, vy)
        }

        t += speed
        const { r, g, b } = getPaletteColor(t)
        fluid.spawnInk(x, y, undefined, r, g, b)

        prevX = x
        prevY = y
    }

    const end = () => {
        prevX = prevY = null
    }

    canvas.addEventListener("mousemove", move)
    canvas.addEventListener("touchmove", move, { passive: false })
    window.addEventListener("mouseleave", end)
    window.addEventListener("touchend", end)
}

export { Fluid, palette, enableInteraction };