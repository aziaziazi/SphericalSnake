    // Angle representing the radius of one snake node.
var NODE_ANGLE = Math.PI / 60;

// This is the number of positions stored in the node queue.
// This determines the velocity.
var NODE_QUEUE_SIZE = 9;

var STARTING_DIRECTION = Math.PI / 4;

var cnv, ctx, width, height, centerX, centerY, points, stopped;

var clock; // Absolute time since last update.
var accumulatedDelta = 0; // How much delta time is built up.

// An array of snake nodes.
var snake;

// Point representing the pellet to eat.
var pellet;

var snakeVelocity;

// The straight distance required to have two nodes colliding.
// To derive, draw a triangle from the sphere origin of angle 2 * NODE_ANGLE.
var collisionDistance = 2 * Math.sin(NODE_ANGLE);

// The angle of the current snake direction in radians.
var direction = STARTING_DIRECTION;

var focalLength = 200;

var lastPointerX = 0;
var lastPointerY = 0;
var directionAmount = 0;

var score = 0;

const gammaAngleMin = 0;
const gammaAngleMax = 10;
const directionMin = 0;
const directionMax = 0.02;
const defaultTurn = 0.08;

let activeLeft = false;
let activeRight = false;
let angularVelocity = 0;

// Mode de contrôle de la direction : 'pointer' ou 'gyroscope'
let directionMode = 'pointer';

const btnMoveLeft = document.querySelector("#move_left");
function setLeft(val) {
    if (val) {
        btnMoveLeft.classList.add("down");
    } else {
        btnMoveLeft.classList.remove("down");   
    }
}

const btnMoveRight = document.querySelector("#move_right");
function setRight(val) {
    if (val) {
        btnMoveRight.classList.add("down");
    } else {
        btnMoveRight.classList.remove("down");   
    }
}

const container = document.getElementById("container");
function directionalValue(deltaTime) {    
    const Px = lastPointerX
    const Py = lastPointerY
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // vecteur direction actuelle
    const ux = Math.cos(direction);
    const uy = Math.sin(direction);

    // vecteur vers la souris
    const vx = Px - cx;
    const vy = Py - cy;

    const vLen = Math.hypot(vx, vy);
    if (vLen === 0) return;

    const vxn = vx / vLen;
    const vyn = vy / vLen;

    const dot = ux * vxn + uy * vyn;
    const cross = ux * vyn - uy * vxn;

    const angleDiff = Math.atan2(cross, dot);
    console.log('angularVelocity => ', angularVelocity,angleDiff);

    // DEAD ZONE
    if (Math.abs(angleDiff) < 0.001) {
        angularVelocity = 0;
        direction += angleDiff; // snap exact
        return;
    }

    // paramètres de contrôle
    const Kp = 32;   // réactivité
    const Kd = 6;    // amortissement

    // accélération angulaire
    const angularAccel = Kp * angleDiff - Kd * angularVelocity;

    // intégration
    angularVelocity += angularAccel * deltaTime;
    direction += angularVelocity * deltaTime;

}



function convertGamaToDirection(x) {
    return (x - gammaAngleMin) * (directionMax - directionMin) / (gammaAngleMax - gammaAngleMin) + directionMin;
}

// Handler d'orientation
function handleOrientation(e) {
    // Ne mettre à jour que si le mode gyroscope est actif
    if (directionMode !== 'gyroscope') return;
    
    // gamma : inclinaison gauche/droite en degrés [-90 → 90]
    let gamma = e.gamma;
    
    directionAmount = convertGamaToDirection(gamma)
    
    console.log('dir, orient', directionAmount, gamma)
    // gauche
    if (gamma < -gammaAngleMin) {
        console.info("gauche", !activeLeft)
        if (!activeLeft) {
            setLeft(true);
            activeLeft = true;
        }
        if (activeRight) {
            setRight(false);
            activeRight = false;
        }
    }
    // droite
    else if (gamma > gammaAngleMax) {
        console.info("droite", !activeRight)
        if (!activeRight) {
            setRight(true);
            activeRight = true;
        }
        if (activeLeft) {
            setLeft(false);
            activeLeft = false;
        }
    }
    // centre → rien
    else {
        console.log('center')
        if (activeLeft) {
            setLeft(false);
            activeLeft = false;
        }
        if (activeRight) {
            setRight(false);
            activeRight = false;
        }
    }
}

container.addEventListener("pointermove", function (e) {
    lastPointerX = e.offsetX
    lastPointerY = e.offsetY
});

window.addEventListener('keydown', function(e) {
    if (e.key == "ArrowLeft") {
        directionAmount = -0.08
        setLeft(true)
    };
    if (e.key == "ArrowRight") {
        directionAmount = 0.08
        setRight(true)
    };
});

window.addEventListener('keyup', function(e) {
    directionAmount = 0
    if (e.key == "ArrowLeft") setLeft(false);
    if (e.key == "ArrowRight") setRight(false);
});

btnMoveLeft.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    directionAmount = -0.08
    setLeft(true);
});
btnMoveLeft.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    directionAmount = 0
    setLeft(false);
});
btnMoveLeft.addEventListener("pointerup", function (e) {
    e.preventDefault();
    directionAmount = 0
    setLeft(false);
});
btnMoveLeft.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

btnMoveRight.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    directionAmount = 0.08
    setRight(true);
});
btnMoveRight.addEventListener("pointerleave", function (e) {
    e.preventDefault();
    directionAmount = 0
    setRight(false);
});
btnMoveRight.addEventListener("pointerup", function (e) {
    e.preventDefault();
    directionAmount = 0
    setRight(false);
});
btnMoveRight.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

document.querySelector("#refresh").addEventListener("click", async (e) => {
    e.preventDefault();
    // requestPermissionIfNeeded();
    window.location.reload(true);
})

function regeneratePellet() {
    pellet = pointFromSpherical(Math.random() * Math.PI * 2, Math.random() * Math.PI);
}

function pointFromSpherical(theta, phi) {
    var sinPhi = Math.sin(phi);
    return {
        x: Math.cos(theta) * sinPhi,
        y: Math.sin(theta) * sinPhi,
        z: Math.cos(phi)
    };
}

function copyPoint(src, dest) {
    if (!dest) dest = {};
    dest.x = src.x;
    dest.y = src.y;
    dest.z = src.z;
    return dest;
}

function addSnakeNode() {
    var snakeNode = {
        x: 0, y: 0, z: -1, posQueue: []
    };
    for (var i = 0; i < NODE_QUEUE_SIZE; i++) snakeNode.posQueue.push(null);
    if (snake.length > 0) {
        // Position the new node "behind" the last node.
        var last = snake[snake.length-1];
        var lastPos = last.posQueue[NODE_QUEUE_SIZE - 1];

        // todo: if nodes are added too quickly (possible if snake collides with two
        // pellets quickly) then this doesn't look natural.

        // If the last node doesn't yet have a full history the default is
        // to rotate along starting direction.
        if (lastPos === null) {
            copyPoint(last, snakeNode);
            rotateZ(-STARTING_DIRECTION, snakeNode);
            rotateY(-NODE_ANGLE * 2, snakeNode);
            rotateZ(STARTING_DIRECTION, snakeNode);
        } else {
            copyPoint(lastPos, snakeNode);
        }
    }
    snake.push(snakeNode);
}

function incrementScore() {
    score += 1;
    document.querySelector("#score").innerHTML = "Score: " + score;
}

function allPoints() {
    var allPoints = [pellet].concat(points).concat(snake);
    for (var i = 0; i < snake.length; i++)
        allPoints = allPoints.concat(snake[i].posQueue);
    return allPoints;
}

function requestDevicePermissions() {
    console.log('requestDevicePermissions');
    if (typeof DeviceOrientationEvent.requestPermission === 'function' && typeof DeviceMotionEvent.requestPermission === 'function') {
       const requestOrientationPermission = () => {
        console.log('requestOrientationPermission');
           DeviceOrientationEvent.requestPermission().then(permissionState => {
               if (permissionState === 'granted') {                
                   window.addEventListener('deviceorientation', function(event) {
                        handleOrientation(event);
                    });
               } else {
                   const button = document.createElement('button');
                   button.innerText = "Enable Orientation";
                    button.style.position = 'absolute';
                    button.style.top = '100%';
                    button.style.left = '100%';
                    button.style.transform = 'translate(50%, 50%)';
                    document.body.appendChild(button);

                    button.addEventListener('click', () => {
                        requestOrientationPermission();
                        document.body.removeChild(button); // Remove button after requesting permissions
                    });
                }
            }).catch(err => {
                console.error("Error requesting deviceorientation permission:", err);
            });
        };
        requestOrientationPermission();
        const button = document.createElement('button');
        button.innerText = "Enable Orientation";
        button.style.fontSize = '1rem';
        button.style.position = 'absolute';
        button.style.top = 0;
        button.style.left = 0;
        button.style.zIndex = 100;
        button.style.transform = 'translate(50%, 50%)';
        document.body.appendChild(button);

        button.addEventListener('click', () => {
            console.log('click');        
            requestOrientationPermission();
            document.body.removeChild(button); // Remove button after requesting permissions
        });
    } else {
        // Automatically start listeners on non-iOS 13+ devices
        window.addEventListener('deviceorientation', function(event) {
            handleOrientation(event);
            console.log("DeviceOrientationEvent listener added automatically.");
        });
    }
}

function init() {    
    requestDevicePermissions()
    
    // Setup direction mode selector
    const directionModeSelect = document.querySelector("#direction_mode");
    if (directionModeSelect) {
        directionModeSelect.addEventListener("change", (e) => {
            directionMode = e.target.value;
            console.log("Direction mode changed to:", directionMode);
        });
        // Initialiser avec la valeur du select
        directionMode = directionModeSelect.value;
    }
    
    cnv = document.getElementsByTagName('canvas')[0];
    ctx = cnv.getContext('2d');
    width = cnv.width;
    height = cnv.height;
    centerX = width / 2;
    centerY = height / 2;
    points = [];
    clock = Date.now();
    regeneratePellet();

    // The +1 is necessary since the queue excludes the current position.
    snakeVelocity = NODE_ANGLE * 2 / (NODE_QUEUE_SIZE + 1);
    var n = 40;
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            points.push(
                pointFromSpherical(i / n * Math.PI * 2, j / n * Math.PI));
        }
    }
    snake = [];
    for (var i = 0; i < 8; i++) addSnakeNode();
    window.requestAnimationFrame(update);
}

function update() {
    if (stopped) return;
    var curr = Date.now();
    var delta = curr - clock;
    clock = curr;

    accumulatedDelta += delta;
    var targetDelta = 15; //ms
    if (accumulatedDelta > targetDelta * 4) {
        // Cap the accumulated delta. Avoid an unbounded number of updates. Slow down game.
        accumulatedDelta = targetDelta * 4;
    }

    while (accumulatedDelta >= targetDelta) {
        accumulatedDelta -= targetDelta;

        checkCollisions();
        switch (directionMode) {
            case 'gyroscope':
            case 'buttons':
                direction += directionAmount
                break;
            case 'pointer':
                const deltaTime = targetDelta / 1000;
                directionalValue(deltaTime);
                break;
            default:
                break;
        }


       // deltaTime en secondes
        applySnakeRotation();
        rotateZ(-direction);
        rotateY(-snakeVelocity);
        rotateZ(direction);
    }
    render();
    window.requestAnimationFrame(update);
}

// Radius is given in angle and is drawn based on depth.
function drawPoint(point, radius, red) {
    var p = copyPoint(point);

    // Translate so that sphere origin is (0, 0, 2).
    p.z += 2;

    // This orients it so z axis is more negative the closer to you it is,
    // the x axis is to negative to the right, and the y axis is positive up.

    // Project.
    p.x *= -1 * focalLength / p.z;
    p.y *= -1 * focalLength / p.z;
    radius *= focalLength / p.z;

    p.x += centerX;
    p.y += centerY;

    ctx.beginPath();

    // Transparent based on depth.
    var alpha = 1 - (p.z - 1) / 2;
    // Color based on depth.
    var depthColor = 255 - Math.floor((p.z - 1) / 2 * 255);
    ctx.fillStyle = "rgba(" + red + ", 0, " + depthColor + ", " + alpha + ")";
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function render() {
    ctx.clearRect(0, 0, width, height);
    for(var i = 0; i < points.length; i++) {
        drawPoint(points[i], 1 / 250, 0);
    }
    for (var i = 0; i < snake.length; i++) {
        drawPoint(snake[i], NODE_ANGLE, 120);
    }

    drawPoint(pellet, NODE_ANGLE, 0);

    // Draw angle.
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    var r = NODE_ANGLE / 2 * focalLength * 2.2;
    ctx.lineTo(centerX + Math.cos(direction) * r,
        centerY + Math.sin(direction) * r);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;

    // Draw circle.
    ctx.beginPath();
    ctx.strokeStyle = "rgb(0,0,0)";

    // The radius value was determined experimentally.
    // todo: figure out the math behind this.
    ctx.arc(centerX, centerY, .58 * focalLength, 0, Math.PI * 2);
    ctx.stroke();
}

// If pt is not provided, rotate all points.
function rotateZ(a, pt) {
    // Compute necessary rotation matrix.
    var cosA = Math.cos(a),
        sinA = Math.sin(a);

    var inPoints = [pt];
    if (!pt) inPoints = allPoints();
    for(var i = 0; i < inPoints.length; i++) {
        if (!inPoints[i]) continue;
        var x = inPoints[i].x,
            y = inPoints[i].y;
        inPoints[i].x = cosA * x - sinA * y;
        inPoints[i].y = sinA * x + cosA * y;
    }
}

function rotateY(a, pt) {
    // Compute necessary rotation matrix.
    var cosA = Math.cos(a),
        sinA = Math.sin(a);

    var inPoints = [pt];
    if (!pt) inPoints = allPoints();

    for(var i = 0; i < inPoints.length; i++) {
        if (!inPoints[i]) continue;
        var x = inPoints[i].x,
            z = inPoints[i].z;
        inPoints[i].x = cosA * x + sinA * z;
        inPoints[i].z = - sinA * x + cosA * z;
    }
}

function applySnakeRotation() {
    var nextPosition = null;
    for (var i = 0; i < snake.length; i++) {
        var oldPosition = copyPoint(snake[i]); 
        if (i == 0) {
            // Move head in current direction.
            rotateZ(-direction, snake[i]);
            rotateY(snakeVelocity, snake[i]);
            rotateZ(direction, snake[i]);
        } else if (nextPosition === null) {
            // History isn't available yet.
            rotateZ(-STARTING_DIRECTION, snake[i]);
            rotateY(snakeVelocity, snake[i]);
            rotateZ(STARTING_DIRECTION, snake[i]);
        } else {
            copyPoint(nextPosition, snake[i]);
        }

        snake[i].posQueue.unshift(oldPosition);
        nextPosition = snake[i].posQueue.pop();
    }
}

function collision(a,b) {
    var dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    return dist < collisionDistance; 
}

function checkCollisions() {
    for (var i = 2; i < snake.length; i++) {
         if (collision(snake[0], snake[i])) {
             showEnd();
             leaderboard.setScore(score);
             return;
         }
    }
    if (collision(snake[0], pellet)) {
        regeneratePellet();
        addSnakeNode();
        incrementScore();
    }
}

function showEnd() {
    document.getElementsByTagName('body')[0].style = 'background: #E8E8E8';
    document.getElementById('gg').style = 'display:block';
    stopped = true;
}

init();