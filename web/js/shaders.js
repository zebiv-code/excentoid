// GLSL shader sources for excentoid rendering

export const solidVert = `#version 300 es
precision highp float;
uniform mat4 uMVP;
uniform mat4 uModel;
uniform mat3 uNormalMatrix;
in vec3 aPos;
in vec3 aNormal;
in float aPatchId;
out vec3 vNormal;
out vec3 vWorldPos;
out float vPatchId;
void main() {
    vWorldPos = (uModel * vec4(aPos, 1.0)).xyz;
    vNormal = normalize(uNormalMatrix * aNormal);
    vPatchId = aPatchId;
    gl_Position = uMVP * vec4(aPos, 1.0);
}`;

export const solidFrag = `#version 300 es
precision highp float;
uniform vec3 uEye;
uniform int uNumPatches;
in vec3 vNormal;
in vec3 vWorldPos;
in float vPatchId;
out vec4 fragColor;

vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0*l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    float h6 = h * 6.0;
    if (h6 < 1.0) rgb = vec3(c, x, 0);
    else if (h6 < 2.0) rgb = vec3(x, c, 0);
    else if (h6 < 3.0) rgb = vec3(0, c, x);
    else if (h6 < 4.0) rgb = vec3(0, x, c);
    else if (h6 < 5.0) rgb = vec3(x, 0, c);
    else rgb = vec3(c, 0, x);
    return rgb + m;
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uEye - vWorldPos);
    if (!gl_FrontFacing) N = -N;
    vec3 L1 = normalize(vec3(2.0, 3.0, 4.0));
    vec3 L2 = normalize(vec3(-3.0, 1.0, -2.0));
    float diff1 = max(dot(N, L1), 0.0);
    float diff2 = max(dot(N, L2), 0.0);
    vec3 H1 = normalize(L1 + V);
    float spec1 = pow(max(dot(N, H1), 0.0), 40.0);
    float hue = vPatchId / float(uNumPatches);
    vec3 baseColor = hsl2rgb(hue, 0.65, 0.55);
    vec3 ambient = 0.12 * baseColor;
    vec3 color = ambient + baseColor * (0.7 * diff1 + 0.3 * diff2) + vec3(0.4) * spec1;
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    color += vec3(0.15, 0.2, 0.35) * fresnel;
    fragColor = vec4(color, 1.0);
}`;

export const lineVert = `#version 300 es
precision highp float;
uniform mat4 uMVP;
in vec3 aPos;
in vec3 aColor;
out vec3 vColor;
void main() {
    vColor = aColor;
    gl_Position = uMVP * vec4(aPos, 1.0);
}`;

export const lineFrag = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 fragColor;
void main() {
    fragColor = vec4(vColor, 1.0);
}`;
