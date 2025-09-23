import { resizeAspectRatio, setupText, updateText } from './util/util.js';
import { Shader, readShaderFile } from './util/shader.js';

// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0); // x, y 2D 좌표

    gl.bindVertexArray(null);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

// Function to create shader program
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Create shader programs
const program = createProgram(gl, vertexShaderSource, fragmentShaderSourceRed);

// Check if shader programs were created successfully
if (!program) {
    console.error('Failed to create shader programs.');
}

const vertices = new Float32Array([
     0.1,  0.1,  // Top-left
    -0.1,  0.1,  // Top-center
    -0.1, -0.1,  // Top-right
     0.1, -0.1,  // Middle-left
]);

// Create Vertex Array Object
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Create vertex buffer
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); // Attribute location 0
gl.enableVertexAttribArray(0); // Enable attribute location 0
gl.useProgram(program);

// Uniforms for movement
const uOffsetLoc = gl.getUniformLocation(program, 'uOffset');
let offsetX = 0.0;
let offsetY = 0.0;
const speed = 0.6;

// Initialize uniform
gl.uniform2f(uOffsetLoc, offsetX, offsetY);

// Key state for smooth movement
const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

window.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// Animation loop with delta time for smooth movement
let lastTime = 0;
function animate(ts) {
    const dt = lastTime ? (ts - lastTime) / 1000.0 : 0; // seconds
    lastTime = ts;

    // Compute intended movement
    let dx = 0.0, dy = 0.0;
    if (keys.ArrowLeft) dx -= speed * dt;
    if (keys.ArrowRight) dx += speed * dt;
    if (keys.ArrowUp) dy += speed * dt;
    if (keys.ArrowDown) dy -= speed * dt;

    if (dx !== 0.0 || dy !== 0.0) {
        offsetX += dx;
        offsetY += dy;

        // Clamp to keep the square within view (half-size ~ 0.1)
        const margin = 0.1;
        const maxOffset = 1.0 - margin;
        offsetX = Math.max(-maxOffset, Math.min(maxOffset, offsetX));
        offsetY = Math.max(-maxOffset, Math.min(maxOffset, offsetY));

        gl.useProgram(program);
        gl.uniform2f(uOffsetLoc, offsetX, offsetY);
    }

    render();
    requestAnimationFrame(animate);
}

// Render loop
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

requestAnimationFrame(animate);