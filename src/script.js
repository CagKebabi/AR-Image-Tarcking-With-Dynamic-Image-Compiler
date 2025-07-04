import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import defaultGlbModel from "./assets/targets/model.glb?url";

let currentMindarInstance = null;
let compiler = null;

document.addEventListener("DOMContentLoaded", () => {
  // DOM elementlerini seç
  const uploadContainer = document.getElementById("uploadContainer");
  const arContainer = document.getElementById("arContainer");
  const imageUpload = document.getElementById("imageUpload");
  const modelUpload = document.getElementById("modelUpload");
  const uploadButton = document.getElementById("uploadButton");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const compileProgress = document.getElementById("compileProgress");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  // Compiler'ı başlat
  compiler = new window.MINDAR.IMAGE.Compiler();

  // Resmi yükle ve Image nesnesine çevir
  const loadImage = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };
  
  // 3D modeli yükle
  const loadModel = async (file) => {
    if (!file) {
      // Eğer dosya seçilmediyse varsayılan modeli kullan
      return defaultGlbModel;
    }
    return URL.createObjectURL(file);
  };

  // Yükleme butonuna tıklama olayı ekle
  uploadButton.addEventListener("click", async () => {
    const file = imageUpload.files[0];
    if (!file) {
      alert("Lütfen bir resim seçin");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Lütfen geçerli bir resim dosyası seçin");
      return;
    }

    try {
      loadingIndicator.style.display = "block";
      compileProgress.style.display = "block";
      uploadButton.disabled = true;

      // Resmi yükle
      const image = await loadImage(file);
      
      // Modeli yükle (eğer seçilmişse)
      const modelFile = modelUpload.files[0];
      const modelUrl = await loadModel(modelFile);

      // Resmi derle
      const dataList = await compiler.compileImageTargets([image], (progress) => {
        const percentage = (progress / 100) * 100;
        console.log(percentage.toFixed(1));
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `%${percentage.toFixed(1)}`;
      });

      // Derlenmiş veriyi export et
      const exportedBuffer = await compiler.exportData();
      const mindBlob = new Blob([exportedBuffer], { type: "application/octet-stream" });
      const mindUrl = URL.createObjectURL(mindBlob);

      // AR'ı başlat
      await startAR(mindUrl, modelUrl);

      // Yükleme ekranını gizle ve AR container'ı göster
      uploadContainer.style.display = "none";
      arContainer.style.display = "block";
    } catch (error) {
      console.error("Hata:", error);
      alert("Bir hata oluştu: " + error.message);
    } finally {
      loadingIndicator.style.display = "none";
      compileProgress.style.display = "none";
      uploadButton.disabled = false;
      progressBar.style.width = "0%";
      progressText.textContent = "%0";
    }
  });

  const startAR = async (mindTargetSource, modelSource) => {
    try {
      // Kamera API'sinin varlığını kontrol et
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Tarayıcınız kamera erişimini desteklemiyor. Lütfen modern bir tarayıcı kullanın (Chrome, Firefox, Safari gibi)"
        );
      }

      // HTTPS kontrolü - yerel ağ için özel durum
      const isLocalNetwork =
        /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^localhost$|^127\.0\.0\.1$/.test(
          location.hostname
        );
      if (location.protocol !== "https:" && !isLocalNetwork) {
        throw new Error(
          "Kamera erişimi için HTTPS gereklidir. Lütfen sayfayı HTTPS üzerinden açın."
        );
      }

      // Kamera erişimi iste
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());

      // Eğer önceki bir MindAR örneği varsa, onu temizle
      if (currentMindarInstance) {
        await currentMindarInstance.stop();
        currentMindarInstance = null;
      }

      // AR container'ı temizle
      arContainer.innerHTML = "";

      const mindarThree = new MindARThree({
        container: document.body,
        imageTargetSrc: mindTargetSource,
        filterMinCF: 0.001,
        filterBeta: 0.01
      });

      const { renderer, scene, camera } = mindarThree;

      // Renderer ayarları
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;

      // Işıkları ekle
      const ambientLight = new THREE.AmbientLight(0xffffff, 2);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      // Platform (Cylinder)
      const platformGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32);
      const platformMaterial = new THREE.MeshBasicMaterial({
        color: 0x1b2a47,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);

      platformMesh.scale.set(0.5, 0.5, 0.5);
      platformMesh.position.set(0, 0, 0);
      platformMesh.rotation.y = Math.PI / 2;

      // Model
      let model_mixer;
      const loader = new GLTFLoader();
      const model = await loader.loadAsync(modelSource, (xhr) => {
        if (xhr.lengthComputable) {
          const yuzde = Math.round((xhr.loaded / xhr.total) * 100);
          console.log(`3D Model Yükleniyor: %${yuzde}`);
        }
      });

      // Model ölçeği ve pozisyonunu ayarla
      model.scene.scale.set(0.5, 0.5, 0.5);
      model.scene.position.set(0, 0, 0); // Merkeze konumlandır

      // // Setup animation mixer
      // model_mixer = new THREE.AnimationMixer(model.scene);
      // const modelAction = model_mixer.clipAction(model.animations[0]);
      // modelAction.play();

      // Modelleri anchor'a ekle
      const anchor = mindarThree.addAnchor(0);
      //anchor.group.add(platformMesh);
      anchor.group.add(model.scene);

      anchor.onTargetFound = () => {
        console.log(platformMesh);
        
      };

      anchor.onTargetLost = () => {
        //platformMesh.visible = false;
      };

      // Animation loop
      const clock = new THREE.Clock();
      await mindarThree.start();
      currentMindarInstance = mindarThree;

      renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();

        if (model_mixer) {
          model_mixer.update(delta);
        }
        renderer.render(scene, camera);
      });
    } catch (error) {
      console.error("Hata:", error);
      alert("Bir hata oluştu: " + error.message);
    }
  };
});
