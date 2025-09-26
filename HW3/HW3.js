import { setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

let isInitialized = false;
let shader;
let vao;
let positionBuffer;
let axes = new Axes(gl, 0.85);
let isDrawing = false; // mouse button을 누르고 있는 동안 true로 change
let startPoint = null;  // mouse button을 누른 위치
let tempEndPoint = null; // mouse를 움직이는 동안의 위치
let line = null; // 그려진 선분
let circle = null; // 그려진 원 (circle)
let intersectionPoints = null; // 교차점들
let gl_PointSize = 10.0; // vertex shader에서 사용할 point size
let textOverlay; // Circle 정보 표시
let textOverlay2; // Line segment 정보 표시
let textOverlay3; // intersection points 정보 표시



document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) { // true인 경우는 main이 이미 실행되었다는 뜻이므로 다시 실행하지 않음
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;

    // resizeAspectRatio(gl, canvas);
    window.addEventListener('resize', () => {
        // Calculate new canvas dimensions while maintaining aspect ratio
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const aspectRatio = originalWidth / originalHeight;
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

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('aPos', 2, gl.FLOAT, false, 0, 0); // x, y 2D 좌표

    gl.bindVertexArray(null);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
            return false; 
        }

        // 셰이더 초기화
        await initShader();

        gl_PointSize = 10.0;
        
        // 나머지 초기화
        setupBuffers();
        shader.use();
        
        // 마우스 이벤트 설정
        setupMouseEvents();
        
        // 초기 렌더링
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,  // x/canvas.width 는 0 ~ 1 사이의 값, 이것을 * 2 - 1 하면 -1 ~ 1 사이의 값
        -((y / canvas.height) * 2 - 1) // y canvas 좌표는 상하를 뒤집어 주어야 하므로 -1을 곱함
    ];
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();

    if (line) {
        shader.setVec4('u_color', 0.0, 1.0, 1.0, 1.0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }
        
    if (circle) {
        shader.setVec4('u_color', 1.0, 0.0, 1.0, 1.0);
        const numSegments = 100;
        const circleVertices = [];
        for (let i = 0; i <= numSegments; i++) {
            const theta = (i / numSegments) * 2.0 * Math.PI;
            const x = circle[0] + circle[2] * Math.cos(theta);
            const y = circle[1] + circle[2] * Math.sin(theta);
            circleVertices.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINE_LOOP, 0, numSegments + 1);
    }

    if (intersectionPoints) {
        shader.setVec4('u_color', 1.0, 1.0, 0.0, 1.0); // yellow
        // Draw a box around each intersection point with size gl_PointSize
        const boxVertices = [];
        const halfSize = gl_PointSize / canvas.width; // Adjust size based on canvas width
        for (let point of intersectionPoints) {
            const x = point[0];
            const y = point[1];
            boxVertices.push(
                x - halfSize, y - halfSize,
                x + halfSize, y - halfSize,
                x + halfSize, y + halfSize,
                x - halfSize, y + halfSize
            );
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxVertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        for (let i = 0; i < intersectionPoints.length; i++) {
            gl.drawArrays(gl.TRIANGLE_FAN, i * 4, 4); // Each box has 4 vertices
        }
    }

    if (isDrawing && startPoint && tempEndPoint) {
        if (circle) {
            shader.setVec4('u_color', 0.5, 0.5, 0.5, 1.0); // red
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
        else {
            shader.setVec4('u_color', 0.5, 0.5, 0.5, 1.0);
            const numSegments = 100;
            const circleVertices = [];
            const length = Math.sqrt(Math.pow(tempEndPoint[0] - startPoint[0], 2) + Math.pow(tempEndPoint[1] - startPoint[1], 2));
            for (let i = 0; i <= numSegments; i++) {
                const theta = (i / numSegments) * 2.0 * Math.PI;
                const x = startPoint[0] + length * Math.cos(theta);
                const y = startPoint[1] + length * Math.sin(theta);
                circleVertices.push(x, y);
            }
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments + 1);
        }
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create()); // 두 개의 identity matrix를 parameter로 전달

}

// Mouse event handlers
function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect(); // canvas를 나타내는 rect 객체를 반환
        const x = event.clientX - rect.left;  // canvas 내 x 좌표
        const y = event.clientY - rect.top;   // canvas 내 y 좌표
        
        if (!isDrawing && !line) { 
            // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우 (즉, mouse down 상태가 아닌 경우)
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 즉, mouse down 상태가 됨
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY]; // 임시 선분의 끝 point
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {
            if (!circle) {
                const length = Math.sqrt(Math.pow(tempEndPoint[0] - startPoint[0], 2) + Math.pow(tempEndPoint[1] - startPoint[1], 2));
                circle = [startPoint[0], startPoint[1], length]; // 원의 중심과 반지름
                
                // Setup text 1
                textOverlay = setupText(canvas, "Circle center: (" + circle[0].toFixed(2) + ", " + circle[1].toFixed(2) + "), radius: " + circle[2].toFixed(2), 1);
            }
            else if (!line) {
                line = [...startPoint, ...tempEndPoint]; // startPoint와 tempEndPoint를 펼쳐서 하나의 array로 합침
                // Setup text 2
                textOverlay2 = setupText(canvas, "Line Segment: (" + line[0].toFixed(2) + ", " + line[1].toFixed(2) + ") ~ (" + line[2].toFixed(2) + ", " + line[3].toFixed(2) + ")", 2);
                
                // Calculate number of intersection points and intersection coordinates
                intersectionPoints = [];
                const A = line[1] - line[3]; // y1 - y2
                const B = line[2] - line[0]; // x2 - x1
                const C = line[0]*line[3] - line[2]*line[1]; // x1*y2 - x2*y1
                const r = circle[2];
                const h = circle[0];
                const k = circle[1];

                const dist = Math.abs(A*h + B*k + C) / Math.sqrt(A*A + B*B);

                if (dist > r) {
                    intersectionPoints = []; // no intersection
                }
                else if (Math.abs(dist - r) < 1e-6) {
                    // tangent
                    const t = (A*h + B*k + C) / (A*A + B*B);
                    const x = h - A*t;
                    const y = k - B*t;
                    if (x >= Math.min(line[0], line[2]) && x <= Math.max(line[0], line[2]) &&
                        y >= Math.min(line[1], line[3]) && y <= Math.max(line[1], line[3])) {
                        intersectionPoints.push([x, y]);
                    }
                }
                else {
                    // two intersection points
                    const d = r*r - dist*dist;
                    const mult = Math.sqrt(d / (A*A + B*B));
                    const t = (A*h + B*k + C) / (A*A + B*B);
                    const x0 = h - A*t;
                    const y0 = k - B*t;
                    const ax = B * mult;
                    const ay = A * mult;
                    if (x0 + ax >= Math.min(line[0], line[2]) && x0 + ax <= Math.max(line[0], line[2]) &&
                        y0 - ay >= Math.min(line[1], line[3]) && y0 - ay <= Math.max(line[1], line[3])) {
                        intersectionPoints.push([x0 + ax, y0 - ay]);
                    }
                    if (x0 - ax >= Math.min(line[0], line[2]) && x0 - ax <= Math.max(line[0], line[2]) &&
                        y0 + ay >= Math.min(line[1], line[3]) && y0 + ay <= Math.max(line[1], line[3])) {
                        intersectionPoints.push([x0 - ax, y0 + ay]);
                    }
                }

                if (intersectionPoints.length === 0) {
                    textOverlay3 = setupText(canvas, "No intersection points", 3);
                }
                else {
                    let overlayText = "Intersection Points: " + intersectionPoints.length;
                    for (let i = 0; i < intersectionPoints.length; i++) {
                        overlayText += " Point " + (i+1) + ": (" + intersectionPoints[i][0].toFixed(2) + ", " + intersectionPoints[i][1].toFixed(2) + ")";
                    }
                    textOverlay3 = setupText(canvas, overlayText, 3);
                }
                
            }

            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}