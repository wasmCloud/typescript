const DEFAULT_CONTENT_IMAGES = [
    { src: '/images/content/statue-of-liberty.jpg', label: 'Statue of Liberty' },
    { src: '/images/content/lincoln-memorial-illuminated.jpg', label: 'Lincoln Memorial' },
];
const DEFAULT_STYLE_IMAGES = [
    { src: '/images/style/cartoon.jpg', label: 'Cartoon' },
    { src: '/images/style/pen-and-ink.jpg', label: 'Pen and Ink' },
];

function labelFromFilename(filename) {
    const dot = filename.lastIndexOf('.');
    return dot > 0 ? filename.slice(0, dot) : filename;
}

const stylizeForm = document.getElementById("stylizeForm");
const contentGallery = document.getElementById("contentGallery");
const styleGallery = document.getElementById("styleGallery");
const contentImageInput = document.getElementById("contentImageInput");
const styleImageInput = document.getElementById("styleImageInput");
const stylizeButton = document.getElementById("stylizeButton");
const stylizedImage = document.getElementById("stylizedImage");
const outputCard = document.getElementById("outputCard");

const galleries = {
    content: {
        items: DEFAULT_CONTENT_IMAGES.map((img) => ({ ...img })),
        selectedIndex: DEFAULT_CONTENT_IMAGES.length ? 0 : -1,
        element: contentGallery,
        input: contentImageInput,
    },
    style: {
        items: DEFAULT_STYLE_IMAGES.map((img) => ({ ...img })),
        selectedIndex: DEFAULT_STYLE_IMAGES.length ? 0 : -1,
        element: styleGallery,
        input: styleImageInput,
    },
};

function render() {
    for (const [kind, gallery] of Object.entries(galleries)) {
        gallery.element.innerHTML = "";

        gallery.items.forEach((image, index) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "image-card";
            if (index === gallery.selectedIndex) card.classList.add("selected");

            const labelText = image.label || image.name || `${kind} ${index + 1}`;

            const label = document.createElement("span");
            label.className = "image-card-label";
            label.textContent = labelText;
            label.title = labelText;
            card.appendChild(label);

            const frame = document.createElement("span");
            frame.className = "image-card-frame";

            const img = document.createElement("img");
            img.src = image.src;
            img.alt = labelText;
            frame.appendChild(img);

            if (image.removable) {
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "image-card-remove";
                remove.setAttribute("aria-label", "Remove image");
                remove.textContent = "×";
                remove.addEventListener("click", (event) => {
                    event.stopPropagation();
                    removeImage(kind, index);
                });
                frame.appendChild(remove);
            }

            card.appendChild(frame);

            card.addEventListener("click", () => selectImage(kind, index));
            gallery.element.appendChild(card);
        });

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "add-button";
        addButton.innerHTML = '<span class="plus">+</span><span>Add Image</span>';
        addButton.addEventListener("click", () => gallery.input.click());
        gallery.element.appendChild(addButton);
    }

    updateStylizeEnabled();
}

function selectImage(kind, index) {
    galleries[kind].selectedIndex = index;
    render();
}

function removeImage(kind, index) {
    const gallery = galleries[kind];
    const removed = gallery.items.splice(index, 1)[0];
    if (removed && removed.objectUrl) URL.revokeObjectURL(removed.objectUrl);

    if (gallery.selectedIndex === index) {
        gallery.selectedIndex = gallery.items.length ? 0 : -1;
    } else if (gallery.selectedIndex > index) {
        gallery.selectedIndex -= 1;
    }
    render();
}

function updateStylizeEnabled() {
    const ready = galleries.content.selectedIndex >= 0 && galleries.style.selectedIndex >= 0;
    stylizeButton.disabled = !ready;
}

contentImageInput.addEventListener("change", (event) => handleUpload(event, "content"));
styleImageInput.addEventListener("change", (event) => handleUpload(event, "style"));

function handleUpload(event, kind) {
    const file = event.target.files[0];
    event.target.value = null;
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const gallery = galleries[kind];
    gallery.items.push({
        src: objectUrl,
        objectUrl,
        file,
        name: file.name,
        label: labelFromFilename(file.name),
        removable: true,
    });
    gallery.selectedIndex = gallery.items.length - 1;
    render();
}

stylizeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (stylizeButton.disabled) return;
    stylize();
});

async function stylize() {
    outputCard.dataset.state = "loading";
    stylizedImage.removeAttribute("src");
    stylizeButton.disabled = true;

    try {
        const contentImage = await imageToPayload(currentImage("content"), "content");
        const styleImage = await imageToPayload(currentImage("style"), "style");

        const response = await fetch("/stylize", {
            method: "POST",
            body: JSON.stringify({ contentImage, styleImage }),
        });

        if (!response.ok) {
            throw new Error(`Stylize failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const blob = new Blob([buffer], { type: "image/jpeg" });
        stylizedImage.src = URL.createObjectURL(blob);
        outputCard.dataset.state = "ready";
    } catch (error) {
        console.error(error);
        outputCard.dataset.state = "empty";
    } finally {
        updateStylizeEnabled();
    }
}

function currentImage(kind) {
    const gallery = galleries[kind];
    return gallery.items[gallery.selectedIndex];
}

// Match the server: content is capped at max-side 256, style is forced 256×256.
const CONTENT_MAX_SIDE = 256;
const STYLE_TARGET_SIZE = 256;
const JPEG_QUALITY = 0.9;

async function imageToPayload(image, kind) {
    const blob = image.file ? image.file : await fetchAsBlob(image.src);
    return resizeBlobToPayload(blob, kind);
}

async function resizeBlobToPayload(blob, kind) {
    const bitmap = await createImageBitmap(blob);
    const [width, height] = kind === "style"
        ? [STYLE_TARGET_SIZE, STYLE_TARGET_SIZE]
        : contentTargetSize(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const resizedBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error("canvas.toBlob failed")),
            "image/jpeg",
            JPEG_QUALITY,
        );
    });
    const dataUrl = await blobToDataUrl(resizedBlob);
    return { dataUrl, width, height };
}

function contentTargetSize(width, height) {
    if (width <= CONTENT_MAX_SIDE && height <= CONTENT_MAX_SIDE) {
        return [width, height];
    }
    if (height >= width) {
        return [Math.max(1, Math.round(width * CONTENT_MAX_SIDE / height)), CONTENT_MAX_SIDE];
    }
    return [CONTENT_MAX_SIDE, Math.max(1, Math.round(height * CONTENT_MAX_SIDE / width))];
}

async function fetchAsBlob(src) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Failed to fetch ${src}: ${response.status}`);
    return response.blob();
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
        reader.readAsDataURL(blob);
    });
}

render();
