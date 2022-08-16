
// CONFIG ++++++++

const DEBUG_MODE = false;


// Y ORIGIN FOR ALL RAY CASTERS
const raycaster_ys = [
  50
]

// Y RAY CASTER
const rc_spacing = 20;
const rc_coords = [
  [0, 0],
//  [rc_spacing, 0],
//  [0, rc_spacing],
//  [0, -rc_spacing],
//  [-rc_spacing, 0]
]

const gravity = 100;
let acceleration = 2;

// XZ RAY CASTER
const xz_ray_length = 160;
const frc_cfgs = [
/*  {
    y: 0.9,
    angle: -Math.PI/8
  },*/
  {
    y: 0.95,
    angle: -Math.PI/12
  },
/*  {
    y: 0.9,
    angle: 0
  },*/
  {
    y: 0.95,
    angle: Math.PI/12
  },
/*  {
    y: 0.9,
    angle: Math.PI/8
  }*/
]

// CAMERA
const MIN_ZOOM = 100, MAX_ZOOM = 1000;
let ZOOM = 400;

// MOVEMENT
const movement_speed = 500;
const rotation_velocity = 10;
const obstacle_range = 50;

// CONSTANTS
const ZERO_VEC2 = new THREE.Vector2(0, 0);
const ZERO_VEC3 = new THREE.Vector3(0, 0);
const one_deg = Math.PI/180;
// ---------------
//
//
import * as THREE from 'three';

import Stats from './jsm/libs/stats.module.js';

import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from './jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from './jsm/environments/RoomEnvironment.js';
import { Lensflare, LensflareElement } from './jsm/objects/Lensflare.js';


import { VertexNormalsHelper } from './jsm/helpers/VertexNormalsHelper.js';

const loading_overlay = document.getElementById("loading_overlay");
const loading_indicator = loading_overlay.querySelector("div.progress-bar div.progress-indicator");
const loading_text = loading_overlay.querySelector("div.progress-bar div.progress-text");
const lmanager = new THREE.LoadingManager();
lmanager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
  loading_indicator.style.width = Math.round(itemsLoaded/itemsTotal*100)+"%";
  loading_text.innerText = 'Loading: '+url;
};

let LOADING = true;
lmanager.onLoad = function ( ) {
  LOADING = false;
  loading_overlay.classList.add("hide");
  setTimeout(() => {
    loading_overlay.style.display = "none";
  }, 2000);
};

lmanager.onError = function ( url ) {
  loading_text.innerText = 'Error: '+url;
  loading_textloading.style.color = "red";
};



let camera, scene, renderer, stats, mixer;
const clock = new THREE.Clock();

let dest_y = undefined;
let clight = undefined;
window.addEventListener('wheel', (evt) => {
  ZOOM = Math.min(Math.max(ZOOM+evt.deltaY, MIN_ZOOM), MAX_ZOOM);
});
let CZOOM = ZOOM;

let target_rotation = 0;

const WASD = {
  w: false,
  a: false,
  s: false,
  d: false
}

const MOUSE_XY = {
  x: 0,
  y: 0
}
/*
      cam_raycaster.far = ZOOM;
      cam_raycaster.setFromCamera(new THREE.Vector2(0, 0), orbit.camera);
      cam_raycaster.ray.origin = cam_raycaster.ray.origin.clone().sub(orbit.position.clone()).normalize().multiplyScalar(ZOOM).add(orbit.position);
      let cam_intersects = cam_raycaster.intersectObject( WORLD_OBJECT );
*/

const RAY_CASTER = new THREE.Raycaster();
const CAST_RAY = (ray_origin, ray_direction, near, far, extra) => {
  if (near) RAY_CASTER.near = near;
  if (far) RAY_CASTER.far = far;
  if (ray_origin instanceof THREE.Camera) {
    RAY_CASTER.setFromCamera(ray_direction, ray_origin);
  } else {
    RAY_CASTER.set(ray_origin, ray_direction);
  }
  if (extra) extra();
  return RAY_CASTER.intersectObject( WORLD_OBJECT );
}



let CHAR_OBJECT = undefined;
let WORLD_OBJECT = undefined;


const dirLight1 = new THREE.DirectionalLight( 0xffffdd, 4 );
dirLight1.position.set( 0, 20000, 9000 );
dirLight1.castShadow = true;
let dimmult = 5000;
dirLight1.shadow.camera.top = dimmult;
dirLight1.shadow.camera.bottom = -dimmult;
dirLight1.shadow.camera.left = -dimmult;
dirLight1.shadow.camera.right = dimmult;
dirLight1.shadow.camera.near = 0;
dirLight1.shadow.camera.far = 100000;
dirLight1.shadow.mapSize.y = dirLight1.shadow.mapSize.x = 4096//2048//8192//4096;
dirLight1.shadow.radius = 1
dirLight1.shadow.bias = -0.00005

const flareLight = new THREE.DirectionalLight( 0xffffdd, 0 );
flareLight.position.set( 0, 20000, 9000 );

const tLoader = new THREE.TextureLoader(lmanager);
const sun = new THREE.Mesh( new THREE.PlaneGeometry( 3500, 3500 ), new THREE.MeshBasicMaterial({
transparent: true,
  map: tLoader.load( 'sun.png' ),
  fog: false,
  depthWrite: false
}) );

sun.position.set( 0, 20000, 9000);

let CHAR_STATE = "idle";
let JUMPIN_UP = false;
let JUMPIN = false;
let LANDED = false;
let JUMP_KEY_UP = false;

const ANIMATIONS = {
  idle: undefined,
  run: undefined
}

function ANIMATE_CHARACTER(state) {
  if (CHAR_STATE != state) {
    if (JUMPIN) return;
    if (state == "idle" && ( WASD.w || WASD.a || WASD.s || WASD.d ) ) {
      return
    }

    console.log("ANIMATE", CHAR_STATE, state)
    for (const anim in ANIMATIONS) {
      ANIMATIONS[anim].paused = false;
    }
    ANIMATIONS[state].enabled = true;
    ANIMATIONS[state].setEffectiveTimeScale( 1 );
    ANIMATIONS[state].setEffectiveWeight( 1 );
    ANIMATIONS[state].time = 0;
    ANIMATIONS[state].crossFadeFrom ( ANIMATIONS[CHAR_STATE], .15, false)
    if (state == "jump") {
      acceleration = 5;
      JUMPIN = true;
      JUMPIN_UP = true;
//      ANIMATIONS[state].loop = THREE.LoopOnce;
      setTimeout(() => {
        JUMPIN_UP = false;
      }, ANIMATIONS[state].getClip().duration/3*2 * 1000);
      setTimeout(() => {
        JUMPIN = false;
        acceleration = 2;
        if (WASD.w || WASD.a || WASD.s || WASD.d) {
          ANIMATE_CHARACTER("run");
        } else {
          ANIMATE_CHARACTER("idle");
        }
      }, ANIMATIONS[state].getClip().duration * 1000)
    }
    ANIMATIONS[state].play()
    CHAR_STATE = state;

  }
}


document.addEventListener('keydown', (e) => {
  switch (e.keyCode) {
    case 32:
      if (JUMP_KEY_UP) {
        JUMP_KEY_UP = false;
        ANIMATE_CHARACTER("jump")
      }
      break;
    case 87:
      WASD.w = true;
      ANIMATE_CHARACTER("run")
      break;
    case 65:
      WASD.a = true;
      ANIMATE_CHARACTER("run")
      break;
    case 83:
      WASD.s = true;
      ANIMATE_CHARACTER("run")
      break;
    case 68:
      WASD.d = true;
      ANIMATE_CHARACTER("run")
      break;
    default:
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.keyCode) {
    case 32:
      JUMP_KEY_UP = true;
      break;
    case 87:
      WASD.w = false;
      ANIMATE_CHARACTER("idle")
      break;
    case 65:
      WASD.a = false;
      ANIMATE_CHARACTER("idle")
      break;
    case 83:
      WASD.s = false;
      ANIMATE_CHARACTER("idle")
      break;
    case 68:
      WASD.d = false;
      ANIMATE_CHARACTER("idle")
      break;
    default:
  }
});


let normalHelper = undefined
if (DEBUG_MODE) {
  normalHelper = new THREE.ArrowHelper();
  normalHelper.visible = false;
}
init();
animate();


function init() {

  const container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 1000000 );
  camera.orbit_rotation = new THREE.Vector3();
  camera.orbit_position = new THREE.Vector3(0, 180, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x000000 );
  scene.fog = new THREE.Fog( 0xfffafa, 1500, 12000 );


  if (DEBUG_MODE) scene.add(normalHelper);

/*
  const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x000000, 1 );
  hemiLight.position.set( 0, 200000, 0 );
  hemiLight.lookAt(new THREE.Vector3(0,0,0));
//        hemiLight.rotation.set(0, 0, -Math.PI/4);
  scene.add( hemiLight );*/

  var ambientLight = new THREE.AmbientLight( 0x73a0c4 );
  scene.add( ambientLight );

  scene.add(flareLight);

  scene.add(dirLight1.target);
  scene.add( dirLight1 );

  const dltarget = new THREE.Object3D();
  dltarget.position.set(0, 0, 0);
  dirLight1.target = dltarget;



  const tLoader1 = new THREE.TextureLoader(lmanager);
  const textureFlare0 = tLoader1.load( 'models/lensflare/lensflare0_alpha.png' );
  const textureFlare1 = tLoader1.load( 'models/lensflare/lensflare0_alpha2.png' );
  const lensflare = new Lensflare();
  lensflare.addElement( new LensflareElement( textureFlare0, 1200, 0, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 1100, 0.01, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 1000, 0.02, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 900, 0.03, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 800, 0.05, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 700, 0.1, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 600, 0.15, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 500, 0.20, dirLight1.color ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 300, 0.25, new THREE.Color( 0xdd77ff) ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 700, 0.4, new THREE.Color( 0xcc88ff) ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 1500, 0.6, new THREE.Color( 0xbb99ff) ) );
  lensflare.addElement( new LensflareElement( textureFlare0, 5000, 1, new THREE.Color( 0xaaaaff) ) );
  lensflare.frustumCulled = false;
  flareLight.add( lensflare );


  const loader = new GLTFLoader(lmanager);
  const dracoLoader = new DRACOLoader(lmanager);
  dracoLoader.setDecoderPath( 'draco/' );
  loader.setDRACOLoader( dracoLoader );
  loader.load( 'models/nchar.glb', function ( object ) {
    console.log(object);
    
    mixer = new THREE.AnimationMixer( object.scene );

    ANIMATIONS.run = mixer.clipAction( object.animations[ 0 ] );
    ANIMATIONS.idle = mixer.clipAction( object.animations[ 1 ] );
    ANIMATIONS.idle.play();
    ANIMATIONS.jump = mixer.clipAction( object.animations[ 2 ] );


    object.scene.frustumCulled = false;
    object.scene.traverse( function ( child ) {
      if( child.material ) {
          child.material.side = THREE.FrontSide;
        if (child.material.map) {
          child.material.map.flipY = false;
        }
      }

      child.frustumCulled = false;
      if ( child.isMesh ) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const oscale = 100;
    object.scene.scale.x = object.scene.scale.y = object.scene.scale.z = oscale;

    scene.add( object.scene );
    CHAR_OBJECT = object.scene;
    flareLight.target = CHAR_OBJECT;

    CHAR_OBJECT.arrowHelpers = []
    for (const rcfg of frc_cfgs) {
      const ahlp = DEBUG_MODE ? new THREE.ArrowHelper( new THREE.Vector3(0, rcfg.y, 0.5), new THREE.Vector3(0, raycaster_ys[0], 0), xz_ray_length, "#FF0000" ) : {};
      ahlp.cfg = rcfg;
      CHAR_OBJECT.arrowHelpers.push(ahlp);
    }

    for (const coord of rc_coords) {
      const ahlp = DEBUG_MODE ? new THREE.ArrowHelper( new THREE.Vector3(0, -1, 0), new THREE.Vector3(coord[0]*rc_spacing, raycaster_ys[0], coord[1]*rc_spacing), 100, "#00FF00" ) : {};
      ahlp.coord = coord;
      CHAR_OBJECT.arrowHelpers.push(ahlp);
    }

    if (DEBUG_MODE) {
      for (const ahlp of CHAR_OBJECT.arrowHelpers) {
        scene.add(ahlp);
      }
    }


//    dirLight1.target = orbit.camera;
  });

  loader.load( 'models/hangar.glb', function ( object ) {

    const oscale = 50;
    object.scene.scale.set(oscale, oscale, oscale);
    object.scene.scale.x = object.scene.scale.y = object.scene.scale.z = oscale;
    object.scene.traverse( function ( child ) {
      if( child.material ) {
        child.material.side = THREE.DoubleSide;
        if (child.material.map) {
          child.material.map.flipY = false;
        }

      }

      if ( child.isMesh ) {
        child.castShadow = true;
        child.receiveShadow = true;

      }

      if ( child.geometry ) {
        child.geometry.computeVertexNormals();

      }

    });


//        WORLD_OBJECT.rotation.set(0, Math.PI/4 ,0);



    scene.add( object.scene );
    WORLD_OBJECT = object.scene;




    sun.lookAt(WORLD_OBJECT.position);

  scene.add( sun );

  });




  const textureLoader = new THREE.TextureLoader(lmanager);

  const textureEquirec = textureLoader.load( 'space.png' );
  textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
  textureEquirec.encoding = THREE.sRGBEncoding;
  scene.background = textureEquirec;

  renderer = new THREE.WebGLRenderer( { antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild( renderer.domElement );

  window.addEventListener("beforeuload", (evt) => {
    renderer.renderLists.dispose();
  });


  renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || renderer.domElement.mozRequestPointerLock;
  renderer.domElement.onclick = function() {
    renderer.domElement.requestPointerLock();
  }
  loading_overlay.onclick = function() {
    renderer.domElement.requestPointerLock();
  }
  document.exitPointerLock = document.exitPointerLock ||
                             document.mozExitPointerLock;


  const environment = new RoomEnvironment();
  const pmremGenerator = new THREE.PMREMGenerator( renderer );
  scene.environment = pmremGenerator.fromScene( environment ).texture;


  let cameraDistance = CZOOM;
  camera.position.z = cameraDistance;
  scene.add(camera);

  document.addEventListener('mousemove', function(e){
    let scale = .04;
    MOUSE_XY.x += e.movementX * scale;
    MOUSE_XY.y += e.movementY * scale;
  })

  window.addEventListener( 'resize', onWindowResize );
  if (DEBUG_MODE) {
    stats = new Stats();
    container.appendChild( stats.dom );
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
function animate() {
  requestAnimationFrame( animate );
  const delta = clock.getDelta();
  if (!LOADING) {


    let update_camera_pos = false;

    let set_rotation = CHAR_OBJECT.rotation.y;
    let running = false;

    if (WASD.w || WASD.a || WASD.s || WASD.d) {
      running = true;
      let rotation = 0;

      if (WASD.w && WASD.a) {
        rotation = Math.PI/4
      } else if (WASD.w && WASD.d) {
        rotation = -Math.PI/4
      } else if (WASD.s && WASD.a) {
        rotation = Math.PI/2 + Math.PI/4
      } else if (WASD.s && WASD.d) {
        rotation = -Math.PI/2 - Math.PI/4
      } else if (WASD.w) {
        rotation = 0;
      } else if (WASD.a) {
        rotation = Math.PI/2;
      } else if (WASD.s) {
        rotation = Math.PI;
      } else if (WASD.d) {
        rotation = -Math.PI/2;
      }

      target_rotation = camera.orbit_rotation.y-Math.PI+rotation;
      if (target_rotation > Math.PI) target_rotation -= Math.PI*2; 
      if (target_rotation < -Math.PI) target_rotation += Math.PI*2; 
      if (CHAR_OBJECT.rotation.y > Math.PI) CHAR_OBJECT.rotation.y -= Math.PI*2; 
      if (CHAR_OBJECT.rotation.y < -Math.PI) CHAR_OBJECT.rotation.y += Math.PI*2; 
      const current_rotation = CHAR_OBJECT.rotation.y;
      set_rotation = current_rotation;

      if (current_rotation < target_rotation) {
        if (current_rotation < -Math.PI/2 && target_rotation > Math.PI/2) {
          set_rotation -= rotation_velocity*delta;
        } else {
          if (target_rotation <= current_rotation+rotation_velocity*delta) {
            set_rotation = target_rotation
          } else {
            set_rotation += rotation_velocity*delta;
          }
        }
      } else if (current_rotation > target_rotation) { 
        if (current_rotation > Math.PI/2 && target_rotation < -Math.PI/2) {
          set_rotation += rotation_velocity*delta
        } else {
          if (target_rotation >= current_rotation-rotation_velocity*delta) {
            set_rotation = target_rotation
          } else {
            set_rotation -= rotation_velocity*delta;
          }
        }
      }


    }

    let move_vec = undefined;

    let obstacles = [];
    if (running) {
      move_vec = new THREE.Vector3( 0, 0, 1 );
      move_vec.multiplyScalar(movement_speed*delta);
      if (JUMPIN) move_vec.divideScalar(2);
      move_vec.applyAxisAngle ( new THREE.Vector3( 0, 1, 0 ), set_rotation );
      const mvc = new THREE.Vector3(move_vec.x, 0, move_vec.z).normalize();

      CHAR_OBJECT.rotation.set(0, set_rotation, 0);

      for (let i = 0; i < CHAR_OBJECT.arrowHelpers.length; i++) {
        let ahlp = CHAR_OBJECT.arrowHelpers[i];
        if (ahlp.cfg) {
          const ray_vec = new THREE.Vector3(mvc.x, ahlp.cfg.y, mvc.z).normalize();
          ray_vec.applyAxisAngle( new THREE.Vector3( 0, 1, 0 ), ahlp.cfg.angle )

          const ro_vec = new THREE.Vector3(CHAR_OBJECT.position.x+move_vec.x, CHAR_OBJECT.position.y+raycaster_ys[0], CHAR_OBJECT.position.z+move_vec.z);

          let cobs = undefined;

          const fow_intersects = CAST_RAY(ro_vec, ray_vec, 0, xz_ray_length);
//          if (fow_intersects.length > 0) cobs = { fnorm: fow_intersects[0].face.normal.clone().transformDirection( WORLD_OBJECT.matrixWorld ), tovec: ro_vec.clone().sub(fow_intersects[0].point) };


          let move_vec_inv = ray_vec.clone().negate();
          let bak_raycaster_origin = ray_vec.multiplyScalar(xz_ray_length).add(ro_vec);

          const bak_intersects = CAST_RAY(bak_raycaster_origin, move_vec_inv, 0, xz_ray_length);
          if (bak_intersects.length > 0) {

            const normalMatrix = new THREE.Matrix3().getNormalMatrix( bak_intersects[bak_intersects.length-1].object.matrixWorld );
            cobs = { fnorm: bak_intersects[bak_intersects.length-1].face.normal.clone().applyMatrix3( normalMatrix ).normalize(), tovec: ro_vec.clone().sub(bak_intersects[bak_intersects.length-1].point) };
            if (DEBUG_MODE) {
              normalHelper.position.copy( bak_intersects[bak_intersects.length-1].point );
              normalHelper.setDirection( bak_intersects[bak_intersects.length-1].face.normal.clone().applyMatrix3( normalMatrix ).normalize());
              normalHelper.setColor( 0x0000ff );
              normalHelper.setLength( 100 );
              normalHelper.visible = true;
            }
          }

          if (cobs) obstacles.push(cobs);
        }
      }


//      console.log(obstacles, move_vec);
      if (obstacles.length > 1) {
        console.debug("OBSTACLES", obstacles.lenght);
        let yval = 0;
        let lensum = 0;
        let yface = false;
        for (const obstacle of obstacles) {
          yval += -obstacle.tovec.y;
       //   obstacle.tovec.y = 0;
          lensum += obstacle.tovec.length();
          if (obstacle.fnorm.y > 0.1 || obstacle.fnorm.y < 0.1) {
            yface = true;
          }
        }
        yval /= obstacles.length;
        lensum /= obstacles.length;

        const mvlen = move_vec.length();


        if (yface) {

          if (yval > 70 && yval < 90) {
            move_vec.normalize().multiplyScalar((xz_ray_length - lensum)/xz_ray_length*mvlen*0.01).negate();
          } else {
            move_vec.normalize().multiplyScalar((xz_ray_length - lensum)/xz_ray_length*mvlen*0.1).negate();
          }
        } else {
          move_vec.x = 0;
          move_vec.z = 0;
        }

      } else if (obstacles.length == 1) {
        console.debug("OBSTACLE");
        if (obstacles[0].fnorm.dot(obstacles[0].tovec.clone().negate()) >= 0) {
          const tovec = obstacles[0].tovec.clone();
          tovec.y = 0;
          tovec.normalize();

          move_vec.x = tovec.x;
          move_vec.z = tovec.z;
          
        } else {

          const problematic_velocity = move_vec.clone().projectOnVector(obstacles[0].fnorm);
          const mvlen = move_vec.length();
          if (obstacles[0].fnorm.y > 0.1 || obstacles[0].fnorm.y < -0.1) {
 //           console.log("ONE Y FACE");
            move_vec = obstacles[0].fnorm.normalize().multiplyScalar((xz_ray_length - obstacles[0].tovec.length())/xz_ray_length*mvlen).negate();
          }
          move_vec.sub(problematic_velocity);



/*
          const tovec = move_vec.clone().negate().normalize().multiplyScalar(xz_ray_length - obstacles[0].tovec.length())
          console.log("ONE" ,tovec.length());
          move_vec.x += tovec.x;
          move_vec.z += tovec.z;
*/
        }

     /*   
        for (const obstacle of obstacles) {
          const yval = -obstacle.tovec.y;
          obstacle.tovec.y = 0;
//          console.log(yval, obstacle.tovec.length());
          if (obstacle.tovec.length() < yval) {
            let fix_len = yval - obstacle.tovec.length();
            move_vec.add(obstacle.tovec.normalize().multiplyScalar(fix_len));
          }
        }*/
      }



    } else {
      move_vec = new THREE.Vector3( 0, 0, 0 );
    }

    const cur_y = CHAR_OBJECT.position.y;
    let new_y = undefined;
    if (move_vec) {
      const ddvec = new THREE.Vector3(0, -1, 0);
      for (const cr_coord of rc_coords) {
        const intersects = CAST_RAY(new THREE.Vector3(CHAR_OBJECT.position.x+move_vec.x+cr_coord[0], cur_y+100, CHAR_OBJECT.position.z+move_vec.z+cr_coord[1]), ddvec, 0, 200);
        if (intersects.length > 0) {
          if (!new_y || intersects[0].point.y > new_y) {
            new_y = Math.round(intersects[0].point.y*1000)/1000;
          }
        } else {
          new_y = cur_y-150;
        }
      }
    }

    if (!new_y) {
      new_y = cur_y;
    } else {
      dest_y = new_y;
    }

    if (JUMPIN_UP) {
      new_y = cur_y+delta*gravity*acceleration;
      if (acceleration > 0) {
        acceleration -= 0.5;
        if (acceleration < 0) acceleration = 0
      }
    } else {
      if (typeof dest_y != "undefined" && dest_y < cur_y) {
        new_y = cur_y-delta*gravity*acceleration;
        if (new_y <= dest_y) {
          LANDED = true;
          new_y = dest_y;
          acceleration = 0;
        } else {
          LANDED = false;
          acceleration += 1;
        }
      } else if (typeof dest_y != "undefined" && dest_y > cur_y) {
        new_y = cur_y+delta*gravity*acceleration;
        if (new_y >= dest_y) {
          LANDED = true;
          new_y = dest_y;
          acceleration = 0;
        } else {
          LANDED = false;
          acceleration += 1;
        }
      }
    }


    if (running || cur_y != new_y) {
      if (cur_y != new_y) console.log(new_y);
      CHAR_OBJECT.position.set(CHAR_OBJECT.position.x+move_vec.x, new_y, CHAR_OBJECT.position.z+move_vec.z);
      if (DEBUG_MODE) {
        const mvc = new THREE.Vector3(move_vec.x, 0, move_vec.z).normalize();
        for (const ahlp of CHAR_OBJECT.arrowHelpers) {
          const coord = { x: 0, y: 0 };
          if (ahlp.coord) {
            coord.x = ahlp.coord[0];
            coord.y = ahlp.coord[1];
            ahlp.position.set(CHAR_OBJECT.position.x+coord.x, new_y+raycaster_ys[0], CHAR_OBJECT.position.z+coord.y);
          } else if (ahlp.cfg) {
            const ray_vec = new THREE.Vector3(0, ahlp.cfg.y, 1);
            ray_vec.applyAxisAngle( new THREE.Vector3( 0, 1, 0 ), ahlp.cfg.angle+CHAR_OBJECT.rotation.y )
            ahlp.setDirection(ray_vec);
            ahlp.position.set(CHAR_OBJECT.position.x, new_y+raycaster_ys[0], CHAR_OBJECT.position.z);
          }
        }
      }
      camera.orbit_position.set(CHAR_OBJECT.position.x, new_y+180, CHAR_OBJECT.position.z);
      update_camera_pos = true;
    }




    if (MOUSE_XY.x != 0 || MOUSE_XY.y != 0) {
      update_camera_pos = true;

      if (MOUSE_XY.y != 0) {
        camera.orbit_rotation.x += -MOUSE_XY.y * delta;
        MOUSE_XY.y = 0;
      }

      if (MOUSE_XY.x != 0) {
        camera.orbit_rotation.y += -MOUSE_XY.x * delta;
        if (camera.orbit_rotation.y > Math.PI) camera.orbit_rotation.y -= Math.PI*2
        if (camera.orbit_rotation.y < -Math.PI) camera.orbit_rotation.y += Math.PI*2
        MOUSE_XY.x = 0;
      }
    
      if (camera.orbit_rotation.x > one_deg * 60) {
        camera.orbit_rotation.set(one_deg * 60, camera.orbit_rotation.y, 0);
      } else if (camera.orbit_rotation.x < one_deg * -80) {
        camera.orbit_rotation.set(one_deg * -80, camera.orbit_rotation.y, 0);
      }
    }



    if (update_camera_pos) {
      let ncampos = new THREE.Vector3(0,0,ZOOM);
      ncampos.applyAxisAngle(new THREE.Vector3(1, 0, 0), camera.orbit_rotation.x);
      ncampos.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.orbit_rotation.y);
      const rdir = ncampos.clone().negate().normalize();

      const orbit_plus_move = camera.orbit_position.clone();
      if (move_vec) orbit_plus_move.add(move_vec);
      ncampos.add(orbit_plus_move);

      let far_intersect = undefined;
      let cam_intersects = CAST_RAY(ncampos, rdir, 0, ZOOM);

      for (const intersection of cam_intersects) {
        if (far_intersect) {
          if (far_intersect.distance < intersection.distance) {
            far_intersect = intersection;
          }
        } else {
          far_intersect = intersection;
        }
      }
      
      let cam_intersects_reverse = CAST_RAY(orbit_plus_move, RAY_CASTER.ray.direction.negate(), 0, ZOOM);

      for (const intersection of cam_intersects_reverse) {
        intersection.distance = ZOOM - intersection.distance;
        if (far_intersect) {
          if (far_intersect.distance < intersection.distance) {
            far_intersect = intersection;
          }
        } else {
          far_intersect = intersection;
        }
      }


      if (far_intersect) {
        CZOOM = ZOOM - far_intersect.distance;
        ncampos = new THREE.Vector3(0,0,Math.max(CZOOM-ZOOM*0.2, 1))
        ncampos.applyAxisAngle(new THREE.Vector3(1, 0, 0), camera.orbit_rotation.x);
        ncampos.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.orbit_rotation.y);
        ncampos.add(camera.orbit_position);
      }

      camera.position.set(ncampos.x, ncampos.y, ncampos.z);
      camera.lookAt(camera.orbit_position);

      const campos = ncampos;
      let dlpos = undefined;
      if (camera.orbit_rotation.x < -Math.PI/6) {
        dlpos = new THREE.Vector3();
      } else {
        dlpos = new THREE.Vector3(campos.x-CHAR_OBJECT.position.x, 0, campos.z-CHAR_OBJECT.position.z).normalize().negate().multiplyScalar(dimmult*0.9);
      }

      dirLight1.target.position.set(campos.x+dlpos.x, 0, campos.z+dlpos.z);
      dirLight1.target.updateMatrixWorld();
      dirLight1.position.set( campos.x+dlpos.x, 20000, campos.z+dlpos.z+9000 );
      dirLight1.updateMatrixWorld();
    }
  }

  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);

  if (DEBUG_MODE) stats.update();
}

