// --- 1. CONFIGURACIÓN BÁSICA DEL MUNDO 3D ---
const container = document.getElementById('canvas-container');
const cancionFinal = document.getElementById('cancionFinal');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.03); // Niebla para profundidad

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 18); // Posición inicial de la cámara

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Controles para girar la cámara (OrbitControls)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.autoRotate = true; // El mundo gira solo
controls.autoRotateSpeed = 0.4;
controls.maxDistance = 35;
controls.minDistance = 6;

// --- 2. ILUMINACIÓN ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Luz tenue general
scene.add(ambientLight);

// Luz cálida saliendo del centro de la flor
const flowerLight = new THREE.PointLight(0xFFD700, 2.5, 60); 
scene.add(flowerLight);

// --- 3. CARGANDO EL MODELO 3D REAL (GLTF/GLB) ---
const loader = new THREE.GLTFLoader();
let sunflowerGroup = new THREE.Group(); // Mantenemos el grupo para la interactividad
scene.add(sunflowerGroup);

// Aquí ponemos el nombre de tu archivo descargado
loader.load(
    'sunflower.glb', 
    function (gltf) {
        const modeloReal = gltf.scene;
        
        // Dependiendo de cómo lo hizo el artista, quizás debas ajustar el tamaño
        modeloReal.scale.set(1.5, 1.5, 1.5); 
        
        // Y centrarlo si viene movido
        modeloReal.position.set(0, -2, 0); 
        
        // Lo añadimos a nuestro grupo para que el detector de clics siga funcionando
        sunflowerGroup.add(modeloReal);
    },
    undefined, // Función para mostrar barra de carga (la omitimos por simplicidad)
    function (error) {
        console.error('Hubo un error cargando el modelo 3D:', error);
    }
);

// --- 4. PARTÍCULAS (Polen brillante flotando) ---
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1200; // Más polen
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 45; // Esparcir por área de 45
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.1,
    color: 0xFFDE59,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending // Para mayor brillo
});

const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleMesh);

// --- 5. INTERACTIVIDAD (El Clímax y Audio) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isCinematicMode = false;

// Manejador de clics/toques
window.addEventListener('click', (event) => {
    activarSiProcede(event);
});

window.addEventListener('touchstart', (event) => {
    activarSiProcede(event.touches[0]);
});

function activarSiProcede(interactionEvent) {
    if (isCinematicMode) return; 

    // Calcular posición del mouse
    mouse.x = (interactionEvent.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(interactionEvent.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Detectar si tocamos el girasol detallado
    const intersects = raycaster.intersectObjects(sunflowerGroup.children);

    if (intersects.length > 0) {
        activarClimax();
    }
}

function activarClimax() {
    isCinematicMode = true;
    
    // Ocultar instrucciones
    document.getElementById('instrucciones').style.opacity = 0;
    
    // Desactivar giro automático y acercar cámara cinemáticamente
    controls.autoRotate = false;
    
    // Animar la luz y el material dramáticamente
    flowerLight.intensity = 6;
    petalMaterial.emissiveIntensity = 2.5;
    petalMaterial.color.set(0xFFDE59); // Amarillo más pálido/caliente

    // --- REPRODUCIR MÚSICA DE FONDO (flores-amarillas.mp3) ---
    cancionFinal.play().catch(error => {
        // En algunos navegadores, el audio automático está bloqueado
        console.warn("No se pudo reproducir el audio automáticamente, requiere interacción del usuario.", error);
    });
    
    // Mostrar el mensaje final detallado después de 1 segundo
    setTimeout(() => {
        document.getElementById('mensaje-final').classList.remove('oculto');
        document.getElementById('mensaje-final').classList.add('mostrar');
    }, 1000);
}

// --- 6. ANIMACIÓN CONSTANTE Y RESPONSIVE ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();

    // Rotar partículas lentamente
    particleMesh.rotation.y = elapsedTime * 0.04;
    particleMesh.rotation.x = elapsedTime * 0.01;

    // Movimiento de respiración suave en el girasol detallado
    sunflowerGroup.position.y = Math.sin(elapsedTime) * 0.4;
    sunflowerGroup.rotation.y = Math.cos(elapsedTime * 0.2) * 0.05; // Ligero ladeo

    // Si estamos en el clímax, la cámara se acerca cinemáticamente
    if (isCinematicMode) {
        camera.position.lerp(new THREE.Vector3(0, 3, 10), 0.015);
        controls.target.lerp(new THREE.Vector3(0, 1, 0), 0.015);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

// Ajustar si se redimensiona la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});