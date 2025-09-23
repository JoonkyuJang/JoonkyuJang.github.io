#version 300 es
in vec2 aPos;
uniform vec2 uPos;
void main() {
    vec2 fPos = aPos + uPos;
    gl_Position = vec4(fPos, 0.0, 1.0);
}