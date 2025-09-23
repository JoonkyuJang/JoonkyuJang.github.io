// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size
canvas.width = 500;
canvas.height = 500;

window.addEventListener('resize', () => {
    const aspectRatio = 1;
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;

    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();
});

// Initialize WebGL settings: viewport and clear color
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background

// Enable scissor test
gl.enable(gl.SCISSOR_TEST);

// Render loop
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Top-left quadrant (green)
    gl.scissor(0, canvas.height / 2, canvas.width / 2, canvas.height / 2);
    gl.clearColor(0.0, 1.0, 0.0, 1.0); // Green color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Top-right quadrant (red)
    gl.scissor(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
    gl.clearColor(1.0, 0.0, 0.0, 1.0); // Red color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bottom-left quadrant (blue)
    gl.scissor(0, 0, canvas.width / 2, canvas.height / 2);
    gl.clearColor(0.0, 0.0, 1.0, 1.0); // Blue color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bottom-right quadrant (yellow)
    gl.scissor(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
    gl.clearColor(1.0, 1.0, 0.0, 1.0); // Yellow color
    gl.clear(gl.COLOR_BUFFER_BIT);
}

render();