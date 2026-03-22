// --- 1. CONFIGURACIÓN BÁSICA ---
const container = document.getElementById('canvas-container');
const cancionFinal = document.getElementById('cancionFinal');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.01); // Niebla más suave para ver a lo lejos

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Ajustamos la cámara inicial un poco más abajo para que vea el modelo en -20
camera.position.set(0, -10, 30); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.autoRotate = true; 
controls.autoRotateSpeed = 0.4;
// El centro de rotación debe estar donde está tu girasol (-20)
controls.target.set(0, -20, 0); 

// --- 2. ILUMINACIÓN (REUBICADA) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Más luz ambiental
scene.add(ambientLight);

// Luz frontal: La ponemos a la misma altura del girasol (-20) y un poco al frente (Z=10)
const flowerLight = new THREE.PointLight(0xFFD700, 1.5, 80); 
flowerLight.position.set(0, -15, 40); 
scene.add(flowerLight);

// --- 3. CARGANDO TU MODELO (Tus dimensiones aplicadas) ---
const sunflowerGroup = new THREE.Group();
scene.add(sunflowerGroup);

let materialesGirasol = [];
const loader = new THREE.GLTFLoader();

loader.load(
    'sunflower.glb', 
    function (gltf) {
        const modeloReal = gltf.scene;
        
        // TUS DIMENSIONES:
        modeloReal.scale.set(0.9, 0.9, 0.9); 
        modeloReal.rotation.y = 1.5; 
        modeloReal.position.set(0, -45, 0); 
        
        modeloReal.traverse((child) => {
            if (child.isMesh) {
                materialesGirasol.push(child.material);
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        sunflowerGroup.add(modeloReal);
        console.log("Girasol ubicado en -20 y listo");
    },
    undefined, 
    function (error) {
        console.error('Error:', error);
    }
);

// --- 4. PARTÍCULAS (Polen circular y brillante) ---

// Función mágica para crear una textura de círculo difuminado sin usar archivos externos
function crearTexturaPolen() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');

    // Dibujamos un degradado radial (del centro hacia afuera)
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');    // Blanco puro en el centro
    gradient.addColorStop(0.2, 'rgba(255, 222, 89, 0.8)'); // Amarillo brillante
    gradient.addColorStop(0.5, 'rgba(255, 222, 89, 0.2)'); // Amarillo tenue
    gradient.addColorStop(1, 'rgba(255, 222, 89, 0)');     // Transparente en los bordes

    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000; // ¡Subimos un poco la cantidad para que se vea más lleno!
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    // Esparcimos el polen en un área grande alrededor del girasol
    posArray[i*3] = (Math.random() - 0.5) * 80; 
    posArray[i*3+1] = (Math.random() - 0.5) * 80 - 10; 
    posArray[i*3+2] = (Math.random() - 0.5) * 80; 
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.4, // Ahora que son círculos suaves, pueden ser un pelín más grandes
    map: crearTexturaPolen(), // Aplicamos la textura circular que creamos arriba
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending, // Esto hace que "brillen" cuando se amontonan
    depthWrite: false // CRUCIAL: Esto evita que se vean bordes negros entre partículas
});

const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleMesh);

// --- 5. INTERACTIVIDAD ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isCinematicMode = false;

window.addEventListener('click', (event) => activarSiProcede(event));
window.addEventListener('touchstart', (event) => activarSiProcede(event.touches[0]));

function activarSiProcede(interactionEvent) {
    if (isCinematicMode) return; 

    mouse.x = (interactionEvent.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(interactionEvent.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sunflowerGroup.children, true);

    if (intersects.length > 0) {
        activarClimax();
    }
}

function activarClimax() {
    isCinematicMode = true;
    
    // Ocultar instrucciones
    const inst = document.getElementById('instrucciones');
    if(inst) inst.style.opacity = 0;
    document.getElementById('instrucciones').style.display = 'none';

    controls.autoRotate = false;
    flowerLight.intensity = 2; // Explosión de luz

    // Brillo en materiales
    materialesGirasol.forEach(mat => {
        if (mat.emissive) mat.emissive.setHex(0x664400); 
    });

    // Audio
    if(cancionFinal) {
        cancionFinal.volume = 0.15;
        cancionFinal.play().catch(e => console.log("Audio bloqueado", e));
    }
    
    // MOSTRAR MENSAJE: Forzamos el cambio de clase
    setTimeout(() => {
        const msg = document.getElementById('mensaje-final');
        if(msg) {
            msg.classList.remove('oculto');
            msg.classList.add('mostrar');
            console.log("Mensaje mostrado");
        }
    }, 1000);
}

// --- 6. ANIMACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    particleMesh.rotation.y = elapsedTime * 0.03;

    // Levitación suave relativa a su posición -20
    sunflowerGroup.position.y = Math.sin(elapsedTime) * 0.5;

    if (isCinematicMode) {
        // ZOOM CORREGIDO: Bajamos la cámara a donde está el modelo (-18 aprox)
        camera.position.lerp(new THREE.Vector3(0, -15, 20), 0.02);
        controls.target.lerp(new THREE.Vector3(0, -20, 0), 0.02);
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});