import { resizeAspectRatio, setupText} from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

let isInitialized = false;
let shader;
let vao;
let positionBuffer;
const vertices = new Float32Array([
    -0.1, -0.1,
     0.1, -0.1,
     0.1,  0.1,
    -0.1,  0.1,
]);

let position = new Float32Array([0.0, 0,0]);

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

    canvas.width = 600;
    canvas.height = 600;

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
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

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
        shader.setVec2('uPos', position[0], position[1]);
        
        // 나머지 초기화
        setupBuffers();
        shader.use();

        // 텍스트 초기화
        setupText(canvas, "Use arrow keys to move rectangle", 1);
        
        // 마우스 이벤트 설정
        setupArrowKeysEvents();
        
        // 초기 렌더링
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

function updatePosition() {
    const step = 0.01;
    if (keys.ArrowLeft) {
        position[0] -= step;
    }
    if (keys.ArrowRight) {
        position[0] += step;
    }
    if (keys.ArrowUp) {
        position[1] += step;
    }
    if (keys.ArrowDown) {
        position[1] -= step;
    }

    // 경계 체크
    position[0] = Math.max(-0.9, Math.min(0.9, position[0]));
    position[1] = Math.max(-0.9, Math.min(0.9, position[1]));

    shader.setVec2('uPos', position[0], position[1]);
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(vao);

    shader.use();
    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

}

// Arrow key event handling
const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };

function setupArrowKeysEvents() {
    function handleKeyDown(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        if (event.key in keys) {
            keys[event.key] = true;
        }

        updatePosition();
        render();
    }

    function handleKeyUp(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        if (event.key in keys) {
            keys[event.key] = false;
        }

        updatePosition();
        render();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
}