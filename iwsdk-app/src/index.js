import {
  Mesh, MeshStandardMaterial,
  SphereGeometry, PlaneGeometry,
  SessionMode, World,
  LocomotionEnvironment, EnvironmentType,
  Interactable, PanelUI,
  ScreenSpace, OneHandGrabbable, 
  PhysicsBody, PhysicsShape, 
  PhysicsShapeType, PhysicsState, 
  PhysicsSystem, CylinderGeometry,
} from '@iwsdk/core';

import { PanelSystem } from './panel.js'; // system for displaying "Enter VR" panel on Quest 1

import { 
  CanvasTexture, MeshBasicMaterial,
  DoubleSide
} from 'three';

const assets = { };

World.create(document.getElementById('scene-container'), {
  assets,
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: 'always',
    features: { }
  },

  features: { 
    locomotion: true,
    grabbing: true
   },

}).then((world) => {

  const { camera } = world;

  world
    .registerSystem(PhysicsSystem)
    .registerComponent(PhysicsBody)
    .registerComponent(PhysicsShape);

  // homerun message
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  function drawTextToCanvas(text){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'red';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 16);
  }
  
  drawTextToCanvas('no home run');

  const texture = new CanvasTexture(canvas);
  
  const boardMat = new MeshBasicMaterial({ 
    map: texture, 
    transparent: true,  
    side: DoubleSide,
  });

  const boardGeo = new PlaneGeometry(12, 1.5);
  const boardMesh = new Mesh(boardGeo, boardMat);
  const boardEntity = world.createTransformEntity(boardMesh);

  boardEntity.object3D.position.set(10, 5, -20);  // in front of the user
  boardEntity.object3D.visible = true; // start hidden
  boardEntity.object3D.rotation.set(0, Math.PI / 4, 0);
  boardEntity.object3D.lookAt(camera.position);
  
  let score = 0;

  function updateScoreboard(message = "no home run") {
    drawTextToCanvas(message);

    texture.needsUpdate = true; 
  }

  updateScoreboard();

  // create a floor
  const floorGeometry = new PlaneGeometry(200, 200);
  const floorMaterial = new MeshStandardMaterial({color: "green"});
  const floorMesh = new Mesh(floorGeometry, floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;

  const floorEntity = world.createTransformEntity(floorMesh);

  floorEntity.addComponent(PhysicsShape, {
    shape: PhysicsShapeType.Box(thin),
    dimensions: [200, 1,  200],
    density: 0.2,
    friction: 0.5,
    restitution: 0.9,
  });
  floorEntity.addComponent(PhysicsBody, { state: PhysicsState.Static});
  floorEntity.addComponent(LocomotionEnvironment, {type: EnvironmentType.STATIC});



  // Create a green sphere
  const sphereGeometry = new SphereGeometry(0.25, 32, 32);
  const sphereMaterial = new MeshStandardMaterial({ color: "red" });
  const sphereMesh = new Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.position.set(1, 1.5, -3);
  
  const sphereEntity = world.createTransformEntity(sphereMesh)
    .addComponent(Interactable)
    .addComponent(OneHandGrabbable)
    .addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Sphere,
      dimensions: [0.25],
      density: 0.2,
      friction: 0.5,
      restitution: 0.9,
    })
    .addComponent(PhysicsBody, {state: PhysicsState.Dynamic});

  
  // create a bat
  const batMesh = new Mesh(
    new CylinderGeometry(0.05, 0.05, 1, 32),
    new MeshStandardMaterial({color: "brown"})
  );

  batMesh.position.set(-0.5, 1.3, -2);
  const batEntity = world.createTransformEntity(batMesh)
    .addComponent(Interactable).addComponent(OneHandGrabbable)
    .addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Cylinder,
      dimensions: [0.05, 1], // radius, height
      density: 0.5,
      restitution: 0.1,
    })
    .addComponent(PhysicsBody, {state: PhysicsState.Dynamic});

  // create a wall
  const wallMesh = new Mesh(
    new PlaneGeometry(20, 20),
    new MeshStandardMaterial({color: "grey"}));
  
  wallMesh.position.set(0, 1, -10);
  wallMesh.rotation.y = Math.PI;

  const wallEntity = world.createTransformEntity(wallMesh)
    .addComponent(PhysicsShape, {
      shape: PhysicsShapeType.Box,
      dimensions: [20, 20, 0.1], 
      density: 0,}).addComponent(PhysicsBody, { 
        state: PhysicsState.Static });
    
  let homeRun = false;
    
  function gameLoop() {
    const p = sphereEntity.object3D.position;

    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      p.x = p.x || 0;
      p.y = p.y || 0;
      p.z = p.z || 0;
    }

    const wallZ = -10;
    if (!homeRun && p.z < wallZ) {
      homeRun = true;
      updateScoreboard("HOME RUN!");
    }  

    requestAnimationFrame(gameLoop);
  }

  setTimeout(() => {
    gameLoop();
  }, 100);

  

  // vvvvvvvv EVERYTHING BELOW WAS ADDED TO DISPLAY A BUTTON TO ENTER VR FOR QUEST 1 DEVICES vvvvvv
  //          (for some reason IWSDK doesn't show Enter VR button on Quest 1)
  world.registerSystem(PanelSystem);
  
  if (isMetaQuest1()) {
    const panelEntity = world
      .createTransformEntity()
      .addComponent(PanelUI, {
        config: '/ui/welcome.json',
        maxHeight: 0.8,
        maxWidth: 1.6
      })
      .addComponent(Interactable)
      .addComponent(ScreenSpace, {
        top: '20px',
        left: '20px',
        height: '40%'
      });
    panelEntity.object3D.position.set(0, 1.29, -1.9);
  } else {
    // Skip panel on non-Meta-Quest-1 devices
    // Useful for debugging on desktop or newer headsets.
    console.log('Panel UI skipped: not running on Meta Quest 1 (heuristic).');
  }
  function isMetaQuest1() {
    try {
      const ua = (navigator && (navigator.userAgent || '')) || '';
      const hasOculus = /Oculus|Quest|Meta Quest/i.test(ua);
      const isQuest2or3 = /Quest\s?2|Quest\s?3|Quest2|Quest3|MetaQuest2|Meta Quest 2/i.test(ua);
      return hasOculus && !isQuest2or3;
    } catch (e) {
      return false;
    }
    
  }

});
