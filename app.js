// Referencias a elementos del DOM
const openCameraBtn = document.getElementById('openCamera');
const switchCameraBtn = document.getElementById('switchCamera');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const takePhotoBtn = document.getElementById('takePhoto');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const photoGallery = document.getElementById('photoGallery');
const closeCameraBtn = document.getElementById('closeCamera');

let stream = null;
let facingMode = 'environment'; 
const STORAGE_KEY = 'pwa-camera-photos-v1';
const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };

async function checkMultipleCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    switchCameraBtn.style.display = videoDevices.length > 1 ? 'block' : 'none';
}

async function openCamera() {
    try {
        await checkMultipleCameras();

        const constraints = {
            video: {
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        cameraContainer.style.display = 'block';
        openCameraBtn.textContent = 'Cámara Abierta';
        openCameraBtn.disabled = true;
        closeCameraBtn.style.display = 'block'; 

        
        video.onloadedmetadata = () => {
            // Ajustar canvas al tamaño del video cada vez que cargue metadata
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
        };

        console.log('Cámara abierta exitosamente');
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    }
}

function takePhoto() {
    if (!stream) {
        alert('Primero debes abrir la cámara');
        return;
    }

  // Asegurar dimensiones actualizadas
  canvas.width = video.videoWidth || canvas.width;
  canvas.height = video.videoHeight || canvas.height;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageUrl = canvas.toDataURL('image/jpeg', 0.92);

  // Obtener ubicación (no bloquear si falla)
  const locationStatus = document.getElementById('locationStatus');
  if (locationStatus) locationStatus.textContent = 'Ubicación: obteniendo...';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
      if (locationStatus) locationStatus.textContent = `Ubicación: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`;
      addPhotoToGallery(imageUrl, coords);
      savePhotoToStorage(imageUrl, coords);
    },
    err => {
      console.warn('No se pudo obtener ubicación:', err);
      if (locationStatus) locationStatus.textContent = 'Ubicación: no disponible';
      addPhotoToGallery(imageUrl, null);
      savePhotoToStorage(imageUrl, null);
    },
    GEO_OPTIONS

 
  );
}

function addPhotoToGallery(imageUrl) {
  addPhotoToGallery(imageUrl, null);
  closeCamera();
}

function addPhotoToGallery(imageUrl, coords){
  const emptyMsg = document.getElementById('emptyMsg');
  if (emptyMsg) emptyMsg.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.className = 'photo-item';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Foto capturada';
  img.loading = 'lazy';
  img.style.cursor = 'pointer';
  img.addEventListener('click', () => window.open(imageUrl, '_blank'));

  const info = document.createElement('div');
  info.className = 'photo-info';
  const ts = new Date().toLocaleString();
  const coordText = coords ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` : '—';
  info.innerHTML = `<div style="font-size:0.85rem;color:var(--muted)">Ubicación: ${coordText}</div><div style="font-size:0.8rem;color:var(--muted)">Tomado: ${ts}</div>`;

  const dl = document.createElement('button');
  dl.textContent = 'Descargar';
  dl.style.marginLeft = '8px';
  dl.addEventListener('click', () => downloadOrShare(imageUrl));

  const metaRow = document.createElement('div');
  metaRow.style.display = 'flex';
  metaRow.style.alignItems = 'center';
  metaRow.appendChild(info);
  metaRow.appendChild(dl);

  wrapper.appendChild(img);
  wrapper.appendChild(metaRow);

  photoGallery.insertBefore(wrapper, photoGallery.firstChild);
}

// Persistencia en localStorage
function savePhotoToStorage(dataUrl) {
  // dataUrl: string, coords: {lat,lon,accuracy} | null
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // allow being called as savePhotoToStorage(dataUrl) for backward compat
    let coords = null;
    if (arguments.length > 1) coords = arguments[1];
    list.push({data: dataUrl, ts: Date.now(), coords});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('No se pudo guardar la foto en localStorage:', e);
  }
}

function loadPhotosFromStorage() {
    try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!list || !list.length) return;
    const emptyMsg = document.getElementById('emptyMsg');
    if (emptyMsg) emptyMsg.style.display = 'none';
    list.forEach(item => {
      addPhotoToGallery(item.data, item.coords || null);
    });
    } catch (e) {
        console.warn('No se pudo cargar la galería desde localStorage:', e);
    }
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        cameraContainer.style.display = 'none';
        openCameraBtn.textContent = 'Abrir Cámara';
        openCameraBtn.disabled = false;
        closeCameraBtn.style.display = 'none'; // Ocultar botón de cerrar
        console.log('Cámara cerrada');
    }
}

// Función para cambiar entre cámaras
async function switchCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    await openCamera(); // Reabrir la cámara con la nueva configuración
}

// Event listeners
openCameraBtn.addEventListener('click', openCamera);
takePhotoBtn.addEventListener('click', takePhoto);
switchCameraBtn.addEventListener('click', switchCamera);
closeCameraBtn.addEventListener('click', closeCamera); // Nuevo listener

// Limpiar stream cuando el usuario cierra o navega fuera de la página
window.addEventListener('beforeunload', closeCamera);

// Al cargar la página, recuperar fotos guardadas
document.addEventListener('DOMContentLoaded', () => {
    loadPhotosFromStorage();
});

// Intenta compartir/guardar la imagen en móvil, con fallback a descarga o abrir en nueva pestaña
async function downloadOrShare(imageUrl){
  const filename = `photo-${Date.now()}.jpg`;
  // Primero intenta usar Web Share API (con archivos) si está disponible
  if (navigator.canShare || navigator.share) {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Foto', text: 'Foto tomada desde la PWA' });
        return;
      }
      // Algunos navegadores (Safari iOS) tienen navigator.share pero no comparten archivos
      if (navigator.share) {
        // Fallback: compartir enlace a la imagen
        await navigator.share({ title: 'Foto', text: 'Foto tomada desde la PWA', url: imageUrl });
        return;
      }
    } catch (e) {
      // continuar a fallback
      console.warn('Share API no disponible o falló:', e);
    }
  }

  // Fallback: crear enlace de descarga
  try {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // En iOS Safari el atributo download se ignora; abrir en nueva pestaña como último recurso
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') || navigator.userAgent.includes('iPod')) {
      window.open(imageUrl, '_blank');
      alert('Si el archivo no se descarga automáticamente, mantén pulsada la imagen y selecciona "Guardar".');
    }
  } catch (e) {
    console.warn('Descarga falló, abriendo en nueva pestaña', e);
    window.open(imageUrl, '_blank');
  }
}


//---GEOLOCALIZACIÓN 
// Referencias a elementos del DOM
const $ = (selector) => document.querySelector(selector);

const permisoSpan = $("#permiso");
const latSpan = $("#lat");
const lngSpan = $("#lng");
const accSpan = $("#acc");
const timestampSpan = $("#timestamp");
const mensajeP = $("#mensaje");
const linkMaps = $("#link-maps");
const btnUbicacion = $("#btn-ubicacion");
const btnDetener = $("#btn-detener");

let watchId = null;

// Mostrar estado inicial de permisos si está disponible
if ("permissions" in navigator && navigator.permissions.query) {
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    permisoSpan.textContent = result.state;
    result.onchange = () => {
      permisoSpan.textContent = result.state;
    };
  }).catch(() => {
    permisoSpan.textContent = "no disponible (permissions API)";
  });
} else {
  permisoSpan.textContent = "desconocido (sin Permissions API)";
}

// Función para formatear fecha/hora
function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleString();
}

// Función que maneja posición exitosa
function onPositionSuccess(position) {
  const { latitude, longitude, accuracy } = position.coords;

  latSpan.textContent = latitude.toFixed(6);
  lngSpan.textContent = longitude.toFixed(6);
  accSpan.textContent = accuracy.toFixed(2);
  timestampSpan.textContent = formatTimestamp(position.timestamp);

  mensajeP.textContent = "Ubicación actualizada correctamente.";

  // Mostrar link a mapas (Google Maps)
  const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
  linkMaps.href = url;
  linkMaps.style.display = "inline-block";
}

// Función que maneja errores de geolocalización
function onPositionError(error) {
  console.error(error);
  switch (error.code) {
    case error.PERMISSION_DENIED:
      mensajeP.textContent = "Permiso denegado. Revisa la configuración del navegador.";
      break;
    case error.POSITION_UNAVAILABLE:
      mensajeP.textContent = "La ubicación no está disponible.";
      break;
    case error.TIMEOUT:
      mensajeP.textContent = "La solicitud de ubicación tardó demasiado.";
      break;
    default:
      mensajeP.textContent = "Ocurrió un error al obtener la ubicación.";
  }
}

// Opciones de la Geolocation API
const geoOptions = {
  enableHighAccuracy: true,  // Intentar usar GPS cuando sea posible
  timeout: 10000,            // Máximo 10s de espera
  maximumAge: 0              // No usar ubicaciones cacheadas
};

// Evento: al hacer clic en "Obtener / Ver ubicación"
btnUbicacion.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    mensajeP.textContent = "Este navegador no soporta Geolocation API.";
    return;
  }

  mensajeP.textContent = "Obteniendo ubicación...";

  // Primero, obtener una sola posición
  navigator.geolocation.getCurrentPosition(onPositionSuccess, onPositionError, geoOptions);

  // Luego, iniciar seguimiento continuo
  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(onPositionSuccess, onPositionError, geoOptions);
    btnDetener.disabled = false;
    mensajeP.textContent = "Seguimiento de ubicación iniciado.";
  }
});

// Evento: al hacer clic en "Detener seguimiento"
btnDetener.addEventListener("click", () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    mensajeP.textContent = "Seguimiento de ubicación detenido.";
    btnDetener.disabled = true;
  }
});

