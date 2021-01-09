class Drop {
    constructor(x, y, speedX, speedY, length) {
        this.speed = createVector(speedX, speedY);
        this.position = createVector(x, y);
        this.length = length;
    }
}

const FPSManager = {
    interval: 1000,
    lastTime: new Date(),
    frames: 0,
    count: 0,
    update: function () {
        this.count++;
        const time = new Date();
        if (time - this.lastTime > this.interval) {
            this.frames = this.count;
            this.count = 0;
            this.lastTime = time;
        }
    }
};

const gui = new dat.GUI();

let screenSize;
let screenEdges;
let imageEdges;
let imagePhoto;
let imagePixels;

let drops = [];

const colors = {
    background: 'rgba(10, 10, 10, 0.1)',
    rainDrop: 'rgba(255, 255, 255, 0.2)',
    fpsText: '#ed225d',
};

const settings = {
    showFPS: false,
    screenEdgeMargin: 0,
    gravityForce: 0.05,
    count: 1200,
    image: {
        precision: 1,
    },
    rainDrop: {
        minLength: 7,
        maxLength: 12,
        initialMinSpeed: 1,
        initialMaxSpeed: 4,
        width: 1,
    },
};

const randomPositionStrategy = {
    getPosition: () => ({
        x: random(screenEdges.left, screenEdges.right),
        y: random(screenEdges.top, screenEdges.bottom),
    }),
};

const topPositionStrategy = {
    getPosition: () => ({
        x: random(screenEdges.left, screenEdges.right),
        y: 0,
    }),
}

function updateScreenSize() {
    const bodyRect = document.body.getBoundingClientRect();
    screenSize = {
        width: bodyRect.width,
        height: bodyRect.height,
    };
    resizeCanvas(screenSize.width, screenSize.height)

    screenEdges = {
        left: settings.screenEdgeMargin,
        top: settings.screenEdgeMargin,
        right: screenSize.width - settings.screenEdgeMargin,
        bottom: screenSize.height - settings.screenEdgeMargin,
    };
}

function createDrop(positionStrategy) {
    const { x, y } = positionStrategy.getPosition();
    const speedX = 0;
    const speedY = random(settings.rainDrop.initialMinSpeed, settings.rainDrop.initialMaxSpeed);
    const length = random(settings.rainDrop.minLength, settings.rainDrop.maxLength);
    return new Drop(x, y, speedX, speedY, length);
}

function generateDrops(count = 1) {
    while (count > 0) {
        drops.push(createDrop(randomPositionStrategy));
        count--;
    }
}

function getRGBColorString(r, g, b) {
    return `rgb(${r},${g},${b})`;
}

function getImageEdges(image) {
    const centerX = screenSize.width / 2;
    const imageScale = screenSize.height / image.height;

    const scaledImageSize = {
        width: image.width * imageScale,
        height: image.height * imageScale,
    };

    return {
        top: 0,
        bottom: scaledImageSize.height,
        left: centerX - scaledImageSize.width / 2,
        right: centerX + scaledImageSize.width / 2,
        width: scaledImageSize.width,
        height: scaledImageSize.height,
    };
}

function getImagePixels(image, imageEdges, precision) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = screenSize.width;
    canvas.height = screenSize.height;

    context.drawImage(image, 0, 0, image.width, image.height, imageEdges.left, 0, imageEdges.width, imageEdges.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let pixels = [];
    for (let y = 0; y < imageData.height; y += precision) {
        let row = [];
        const rowOffset = y * 4 * imageData.width;

        for (let x = 0; x < imageData.width; x += precision) {
            const columnOffset = rowOffset + x * 4;
            const r = imageData.data[columnOffset];
            const g = imageData.data[columnOffset + 1];
            const b = imageData.data[columnOffset + 2];
            const color = getRGBColorString(r, g, b);
            row.push(color);
        }

        pixels.push(row);
    }

    return pixels;
}

function getImagePixelColor(x, y) {
    if (imagePixels && imagePixels.length &&
        x >= imageEdges.left && x < imageEdges.right &&
        y >= imageEdges.top && y < imageEdges.bottom
    ) {
        const precisionX = Math.floor(x / settings.image.precision);
        const precisionY = Math.floor(y / settings.image.precision);
        return imagePixels[precisionY][precisionX];
    }

    return colors.rainDrop;
}

function updateImageData() {
    imageEdges = getImageEdges(imagePhoto);
    imagePixels = getImagePixels(imagePhoto, imageEdges, settings.image.precision);
}

function loadCustomImage(path) {
    const imageSource = new Image();
    imageSource.src = path;
    imageSource.addEventListener('load', function () {
        imagePhoto = this;
        updateImageData();
    });
}

function handleCountChange(count) {
    const currentCount = drops.length;
    if (currentCount >= count) {
        drops = drops.slice(0, count);
    } else {
        generateDrops(settings.count - currentCount);
    }
}

function generateGUISettings() {
    gui.add(settings, 'count', 100, 2000)
        .step(100)
        .onChange(handleCountChange);
    gui.add(settings, 'gravityForce', 0.01, 0.1).step(0.01);

    const dropFolder = gui.addFolder('Drop');
    dropFolder.add(settings.rainDrop, 'minLength', 2, 12).step(1);
    dropFolder.add(settings.rainDrop, 'maxLength', 12, 30).step(1);
    dropFolder.add(settings.rainDrop, 'width', 1, 5).step(1);
    dropFolder.open();

    const imageFolder = gui.addFolder('Image');
    imageFolder.add(settings.image, 'precision', 1, 20)
        .step(1)
        .onChange(updateImageData);
    imageFolder.open();

    gui.add(settings, 'showFPS');
}

function setup() {
    createCanvas();
    updateScreenSize();
    generateGUISettings();

    window.addEventListener('resize', () => {
        updateScreenSize();
        updateImageData();
    });

    loadCustomImage('./images/image.jpeg');

    generateDrops(settings.count);

    draw();
}

function clearCanvas() {
    noStroke();
    fill(colors.background);
    rect(0, 0, screenSize.width, screenSize.height);
}

function drawFPS() {
    textSize(32);
    noStroke();
    fill(colors.fpsText);
    text(FPSManager.frames, 10, 35);
}

function drawDrops() {
    strokeWeight(settings.rainDrop.width);

    drops.forEach(drop => {
        const x = Math.floor(drop.position.x);
        const y = Math.floor(drop.position.y);
        const color = getImagePixelColor(x, y);
        stroke(color);
        line(drop.position.x, drop.position.y - drop.length, drop.position.x, drop.position.y);
    });
}

function draw() {
    clearCanvas();

    drawDrops();
    settings.showFPS && drawFPS();

    update();
}

function applyGravity(element) {
    element.speed.add(0, settings.gravityForce);
}

function updateDrops() {
    for (let index = 0; index < drops.length; index++) {
        const drop = drops[index];

        applyGravity(drop);
        drop.position.add(drop.speed);

        if (drop.position.y - drop.length > screenEdges.bottom) {
            drops[index] = createDrop(topPositionStrategy);
        }
    }
}

function updateFPS() {
    FPSManager.update();
}

function update() {
    updateFPS();
    updateDrops();
}
