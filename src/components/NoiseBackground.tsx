import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface NoiseBackgroundProps {
  color1: string
  color2: string
  offset: { x: number; y: number }
}

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uBg;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec2 uOffset;
  varying vec2 vUv;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // FBM function for more complex patterns
  float fbm(vec2 p, int octaves, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= persistence;
    }
    return value;
  }

  void main() {
    vec3 color = uBg;
    
    // 위치 변화와 패턴 변화의 적절한 조합
    vec2 uv = vUv + uOffset * 0.0002;
    
    // 균형잡힌 패턴 스케일
    float scale1 = 0.8 + sin(uOffset.x * 0.003) * 0.2;
    float scale2 = 0.8 + cos(uOffset.y * 0.003) * 0.2;
    
    // 동일한 octaves로 균형
    int octaves = 4;
    
    // 동일한 persistence로 균형
    float persistence = 0.5;
    
    // 통일된 domain warping
    vec2 warp = vec2(
      fbm(uv + uTime * 0.1, 3, 0.5),
      fbm(uv + vec2(5.2, 1.3) + uTime * 0.1, 3, 0.5)
    ) * 0.08;
    
    // 균형잡힌 노이즈 패턴
    float noise1 = fbm(uv * scale1 + warp + uTime * 0.05, octaves, persistence);
    float noise2 = fbm(uv * scale2 + warp + uTime * 0.04, octaves, persistence);
    
    // 적당한 색상 혼합으로 구분 개선
    float mixStrength1 = abs(noise1) * 0.99;
    float mixStrength2 = abs(noise2) * 0.99;
    
    color = mix(color, uColorA, mixStrength1);
    color = mix(color, uColorB, mixStrength2);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

export function NoiseBackground({ color1, color2, offset }: NoiseBackgroundProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, gl, scene, camera } = useThree()
  
  // Set up color picker function for real-time pixel reading
  useEffect(() => {
    (window as any).getPixelColor = (x: number, y: number) => {
      const canvas = gl.domElement
      const rect = canvas.getBoundingClientRect()
      const pixelX = Math.floor(x * canvas.width)
      const pixelY = Math.floor((1 - y) * canvas.height)
      
      // Create a render target to read pixels
      const renderTarget = new THREE.WebGLRenderTarget(canvas.width, canvas.height)
      
      // Render current scene to render target
      gl.setRenderTarget(renderTarget)
      gl.render(scene, camera)
      
      // Read pixel data
      const pixelBuffer = new Uint8Array(4)
      gl.readRenderTargetPixels(renderTarget, pixelX, pixelY, 1, 1, pixelBuffer)
      
      // Clean up
      gl.setRenderTarget(null)
      renderTarget.dispose()
      
      return `#${pixelBuffer[0].toString(16).padStart(2, '0')}${pixelBuffer[1].toString(16).padStart(2, '0')}${pixelBuffer[2].toString(16).padStart(2, '0')}`
    }
  }, [gl, scene, camera])


  // Convert HSL to RGB
  const hslToRgb = (hslString: string) => {
    const hslMatch = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!hslMatch) return [0, 0, 0]

    const h = parseInt(hslMatch[1]) / 360
    const s = parseInt(hslMatch[2]) / 100
    const l = parseInt(hslMatch[3]) / 100

    let r, g, b

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return [r, g, b]
  }

  const uniforms = useMemo(
    () => ({
      uBg: { value: [0.7, 0.7, 0.75] },
      uColorA: { value: hslToRgb(color1) },
      uColorB: { value: hslToRgb(color2) },
      uOffset: { value: new THREE.Vector2(offset.x, offset.y) },
      uTime: { value: 0 }
    }),
    [color1, color2]
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uOffset.value = new THREE.Vector2(offset.x, offset.y)
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -1]} scale={[10, 10, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}