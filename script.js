const sizeInput = document.getElementById('sizeInput');
const proportionSelect = document.getElementById('proportionSelect');
const modelSelect = document.getElementById('modelSelect');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const status = document.getElementById('status');
const previewGallery = document.getElementById('previewGallery');
const resultSection = document.getElementById('resultSection');

let croppedImages = []; 

// 1. Load AI Models
async function loadModels() {
    status.innerText = "Loading AI Models...";
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    if (modelSelect.value === 'ssd') {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    } else {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    }
    status.innerText = "AI Ready!";
}
loadModels();
modelSelect.addEventListener('change', loadModels);

// 2. File Upload Handling
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleUpload);

async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    resultSection.style.display = 'block';
    
    for (const file of files) {
        status.innerText = `Processing: ${file.name}...`;
        const img = await faceapi.bufferToImage(file);
        
        const options = modelSelect.value === 'ssd' 
            ? new faceapi.SsdMobilenetv1Options() 
            : new faceapi.TinyFaceDetectorOptions();

        const detection = await faceapi.detectSingleFace(img, options);

        if (detection) {
            const canvas = performFixedCrop(img, detection.box);
            const dataUrl = canvas.toDataURL("image/png");
            croppedImages.push({ name: `crop_${file.name}`, data: dataUrl });
            renderPreview(dataUrl);
        }
    }
    status.innerText = "Batch Done!";
}

// 3. Fixed Cropping Math
function performFixedCrop(img, box) {
    const size = parseInt(sizeInput.value);
    const proportion = parseFloat(proportionSelect.value);
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Calculate source square size based on face width and desired proportion
    const sourceSize = box.width / proportion;
    
    // Find face center
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Source start points (top-left of the crop square)
    const sourceX = centerX - sourceSize / 2;
    const sourceY = centerY - sourceSize / 2;

    // Draw the image: (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    return canvas;
}

function renderPreview(dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = "preview-item";
    previewGallery.appendChild(img);
}

// 4. Download and Clear
document.getElementById('downloadAllBtn').addEventListener('click', async () => {
    const zip = new JSZip();
    croppedImages.forEach(item => {
        const base64Data = item.data.split(',')[1];
        // Ensure name ends in .png
        const fileName = item.name.split('.')[0] + ".png";
        zip.file(fileName, base64Data, {base64: true});
    });

    const content = await zip.generateAsync({type: "blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "faces_bulk.zip";
    link.click();
});

document.getElementById('clearBtn').addEventListener('click', () => {
    croppedImages = [];
    previewGallery.innerHTML = '';
    resultSection.style.display = 'none';
    status.innerText = "AI Ready!";
});