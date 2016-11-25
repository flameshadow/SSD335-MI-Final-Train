/**
 * Created by mark on 10/28/16.
 */

Physijs.scripts.worker = 'lib/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

document.addEventListener("DOMContentLoaded", onLoad);

var renderer, camera, scene, controls, plane;

var points = [];
var line;
var cube;
var currPosition = {};
var linePrecision = 100;
var userPoints = [];
var splinePoints = [];

const ENABLE_CONTROLS = true;
const ENABLE_AXIS = true;

var pathCreated = false;
var raycaster = new THREE.Raycaster();
var moveableObjects = [];
var train, light, input;

var mouse = new THREE.Vector2(),
    offset = new THREE.Vector3(),
    intersection = new THREE.Vector3(),
    INTERSECTED, SELECTED;
var container;

var box1;

function onLoad() {
    sceneSetup();
    initialDraw();
    addEventListeners();
    animate();

} // function onLoad()

function addEventListeners() {
    renderer.domElement.addEventListener('mousedown', onMouseDownDrawMode, false);
    window.addEventListener("keypress", onKeyPress);
    window.addEventListener('resize', onWindowResize, false);

} // function addEventListeners()

function swapEventListeners() {
    renderer.domElement.removeEventListener('mousedown', onMouseDownDrawMode);
    window.removeEventListener("keypress", onKeyPress);

    renderer.domElement.addEventListener('mousemove', onMouseMoveSelectMode, false);
    renderer.domElement.addEventListener('mousedown', onMouseDownSelectMode, false);
    renderer.domElement.addEventListener('mouseup', onMouseUpSelectMode, false);
} // function swapEventListeners()


/*
 * KEYBOARD
 */

function onKeyPress(event) {
    switch (event.keyCode) {
        case ' '.charCodeAt(0):
        case 'p'.charCodeAt(0):
            pathCreated = true;
            if (train) {
                scene.add(train);
            }
            swapEventListeners();
            makePoint(userPoints[0].x, userPoints[0].y, userPoints[0].z);
            calculateTotalDistance();
            moveAlongPath();
            break;
        default:
            break;
    } // switch keyCode

} // function onKeyDown()

/*
 * MOUSE
 */

function onMouseDownDrawMode(event) {
    if (pathCreated) {
        return;
    }
    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 -1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 +1;


    raycaster.setFromCamera(mouse, camera);
    plane = new THREE.Plane(THREE.Utils.cameraLookDir(camera), 0);
    var pos = raycaster.ray.intersectPlane(plane);

    makePoint(pos.x, pos.y, pos.z);
} // function onMouseDownDrawMode()

function onMouseDownSelectMode( event ) {

    event.preventDefault();

    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects(moveableObjects);

    if ( intersects.length > 0 ) {
        controls.enabled = false;

        SELECTED = intersects[ 0 ].object;

        if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
            offset.copy( intersection ).sub( SELECTED.position );
        }

        container.style.cursor = 'move';
    } // if
} // function onMouseDownSelectMode()

function onMouseMoveSelectMode( event ) {

    event.preventDefault();

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );

    if ( SELECTED ) {
        if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
            SELECTED.position.copy( intersection.sub( offset ) );
        }
        return;
    } // if

    var intersects = raycaster.intersectObjects( moveableObjects );

    if ( intersects.length > 0 ) {
        INTERSECTED = intersects[ 0 ].object;

        plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection( plane.normal ),
            INTERSECTED.position );

        container.style.cursor = 'pointer';

    } else {
        INTERSECTED = null;
        container.style.cursor = 'auto';
    } // if/else

} // function onMouseMoveSelectMode()

function onMouseUpSelectMode(event) {
    event.preventDefault();

    controls.enabled = true;

    if ( INTERSECTED ) {
        SELECTED = null;
    }

    container.style.cursor = 'auto';
} // function onMouseUp()



/*
 * WINDOW RESIZE
 */

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
} // function onWindowResize()

/*
 * SCENE SETUP
 */

function sceneSetup() {
    /* Create the renderer */

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    container = renderer.domElement;

    /* Create the scene */

    scene = new Physijs.Scene({reportSize: 5, fixedTimeStep:1/120});
    scene.setGravity(new THREE.Vector3(0, -10, 0));

    /* Create the camera */

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 250, 0);

    scene.add(camera);  // add camera to scene

    /* Create the lights */

    light = new THREE.PointLight(0xa0a0a0, 0.5, 0);
    light.position.set(50, 70, 100);
    scene.add(light);

    light = new THREE.AmbientLight(0x808080, 1);
    scene.add(light);
    // Light
    light = new THREE.DirectionalLight( 0xFFFFFF );
    light.position.set( 0, 150, 150 );
    light.target.position.copy( scene.position );
    light.castShadow = true;
    light.shadow.camera.left = -150;
    light.shadow.camera.top = -150;
    light.shadow.camera.right = 150;
    light.shadow.camera.bottom = 150;
    light.shadow.camera.near = 20;
    light.shadow.camera.far = 400;
    light.shadow.bias = -.0001;
    light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
    scene.add( light );

    /* Create the controls */
    if (ENABLE_CONTROLS) {
        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.noZoom = false;
        controls.noPan = true;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.target = scene.position;
    } else {
        controls = null;
    }

    /* Crate the axis */
    if (ENABLE_AXIS) {
        scene.add(  new THREE.AxisHelper( 50 ) );
    }

    /* Raycast plane */
    plane = new THREE.Plane(THREE.Utils.cameraLookDir(camera), 0);

    var floorGeo = new THREE.PlaneGeometry(10000, 10000);
    var floorMat = new THREE.MeshPhongMaterial({color: 0xAA1111});
    //plane = new THREE.Mesh(planeGeo, planeMat);
    var floor = new Physijs.PlaneMesh(
        floorGeo,
        new THREE.MeshBasicMaterial({transparent: true, opacity: 0}),
        0
    );
    floor.rotation.set(-Math.PI/2, 0, 0);
    floor.position.set(0, -1, 0);
    scene.add(floor);
  //  scene.add(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    /* Load the train */
    loadTrain();
} // function sceneSetup()


function loadTrain() {
    var loader = new THREE.ObjectLoader();
    loader.load('models/train.json', function(obj) {
        var bbox = new THREE.BoxHelper(obj, 0xFFFFFF);

        bbox.geometry.computeBoundingBox();

        var trainWidth = bbox.geometry.boundingBox.max.x - bbox.geometry.boundingBox.min.x;
        var trainHeight = bbox.geometry.boundingBox.max.y - bbox.geometry.boundingBox.min.y;
        var trainLength = bbox.geometry.boundingBox.max.z - bbox.geometry.boundingBox.min.z;

        train = new Physijs.BoxMesh(
            new THREE.BoxGeometry(trainWidth, trainHeight, trainLength),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0}),
            0 // mass
        );
        train.add(obj);
    });
} // loadTrain()

function initialDraw() {

    var imagePrefix = "images/dawnmountain-";
    var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
    var imageSuffix = ".png";
    var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );

    var materialArray = [];
    for (var i = 0; i < 6; i++)
        materialArray.push( new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture( imagePrefix + directions[i] + imageSuffix ),
            side: THREE.BackSide
        }));
    var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
    var skyBox = new THREE.Mesh( skyGeometry, skyMaterial );
    scene.add( skyBox );

    var obj = new Physijs.BoxMesh(
        new THREE.CubeGeometry(10, 10, 10),
        new THREE.MeshNormalMaterial({color:0x004488 }),
        10 // mass
    );
    obj.position.set(-50,0,0);
    moveableObjects.push(obj);

    obj = new Physijs.SphereMesh(
        new THREE.SphereGeometry(10, 32, 32),
        new THREE.MeshNormalMaterial({color:0xffff00}),
        10 // mass
    );
    obj.position.set(50, 0, 0);
    moveableObjects.push(obj);

    obj = new Physijs.ConeMesh(
        new THREE.ConeGeometry(10, 5, 32, 32),
        new THREE.MeshNormalMaterial({color:0x00FFFF}),
        10 // mass
    );
    obj.position.set(0, 0, 50);
    moveableObjects.push(obj);

    for (i = 0; i < moveableObjects.length; i++) {
        scene.add(moveableObjects[i]);
    } // for i

} // function initialDraw()


function makePoint(x, y, z) {
    y = 0;
    userPoints.push(new THREE.Vector3(x, y, z));
    makeLineFromPoints();
} // function makePoint()

function makeLineFromPoints() {
    if (line!=null) {
        scene.remove(line);
    } // if

    if (userPoints.length < 2) return;

    var spline = new THREE.CatmullRomCurve3(userPoints);
    splinePoints = spline.getPoints(linePrecision);

    var material = new THREE.LineBasicMaterial({color:0xffffff});

    var geometry = new THREE.Geometry();
    for ( var i = 0; i < splinePoints.length; i++) {
        geometry.vertices.push(splinePoints[i]);
    }
    line = new THREE.Line(geometry, material);
    scene.add(line);

}

var pointIndex = 0;
var tween;
var totalDistance = 0;
var totalTime = 10;

function calculateTotalDistance() {
    for (var i = 0; i < splinePoints.length-1; i++) {
        totalDistance += splinePoints[i].distanceTo(splinePoints[i+1]);
    } // for i
    totalTime = totalDistance / 100 + 10;
} // function calculateTotalDistance()

function moveAlongPath() {
    // if (line != null) {
    //     scene.remove(line);
    //     line = null;
    // }
    currPosition = splinePoints[pointIndex];
    pointIndex = (pointIndex+1) % splinePoints.length;
    var target = splinePoints[pointIndex];
    var distance = currPosition.distanceTo(target);
    var ratioOfWhole = (distance/totalDistance);

    var seconds = totalTime * ratioOfWhole;
    tween = new TWEEN.Tween(currPosition).to(target, seconds*1000);
    tween.onUpdate(tweenStep);
    tween.onComplete(moveAlongPath);
    tween.start();
}

function tweenStep() {
    var dx = train.position.x - currPosition.x;
    var dz = train.position.z - currPosition.z;
    train.rotation.set(0, Math.atan2(dx, dz)-Math.PI/2, 0);
    train.position.x = currPosition.x;
    train.position.y = currPosition.y;
    train.position.z = currPosition.z;
    train.__dirtyRotation = true;
    train.__dirtyPosition = true;
} // tweenStep()


function animate() {
    TWEEN.update();
    if (controls) { controls.update(); }

    for (var i = 0; i < moveableObjects.length; i++) {
        moveableObjects[i].__dirtyRotation = true;
        moveableObjects[i].__dirtyPosition = true;
    }

    scene.simulate();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
} // function animate()

THREE.Utils = {
    cameraLookDir: function(camera) {
        var vector = new THREE.Vector3(0, 0, -1);
        vector.applyEuler(camera.rotation, camera.rotation.order);
        return vector;
    }
};
