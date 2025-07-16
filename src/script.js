import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import defaultGlbModel from "./assets/targets/model.glb?url";
import Dropzone from "dropzone";

// Dropzone'un otomatik keşfetme özelliğini devre dışı bırak
Dropzone.autoDiscover = false;

let currentMindarInstance = null;
let compiler = null;
let imageFile = null;
let modelFile = null;
let videoFile = null;
let viewScene, viewCamera, viewRenderer;
let viewTexture, viewPlane;
let viewModel = null;
let selectedSocialMediaIcons = [];

document.addEventListener("DOMContentLoaded", () => {
  // DOM elementlerini seç
  const uploadContainer = document.getElementById("uploadContainer");
  const arContainer = document.getElementById("arContainer");
  const uploadButton = document.getElementById("uploadButton");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const compileProgress = document.getElementById("compileProgress");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const viewCanvas = document.getElementById("viewCanvas");
  const socialMediaIconsGrid = document.getElementById("socialMediaIconsGrid");
  const selectAllIconsBtn = document.getElementById("selectAllIcons");
  const clearSelectedIconsBtn = document.getElementById("clearSelectedIcons");

  // Sosyal medya ikonları için modellerin yollarını ve isimlerini tanımla
  const socialMediaIcons = [
    { name: "Blender", file: "BlenderLogo2.glb" },
    { name: "Discord", file: "DiscordLogo2.glb" },
    { name: "Facebook", file: "FacebookLogo2.glb" },
    { name: "GitHub", file: "GitHubLogo2.glb" },
    { name: "Kick", file: "KickLogo2.glb" },
    { name: "LinkedIn", file: "LinkedinLogo2.glb" },
    { name: "Mastodon", file: "MastodonLogo2.glb" },
    { name: "Patreon", file: "PatreonLogo2.glb" },
    { name: "PayPal", file: "PaypalLogo2.glb" },
    { name: "Pinterest", file: "PinterestLogo2.glb" },
    { name: "PlayStation", file: "PstationLogo2.glb" },
    { name: "Quora", file: "QuoraLogo2.glb" },
    { name: "Reddit", file: "RedditLogo3.glb" },
    { name: "Rumble", file: "RumbleLogo2.glb" },
    { name: "Sketchfab", file: "SketchfabLogo2.glb" },
    { name: "Snapchat", file: "SnapchatLogo2.glb" },
    { name: "Spotify", file: "SpotifyLogo2.glb" },
    { name: "Steam", file: "SteamLogo2.glb" },
    { name: "Switch", file: "SwchLogo2.glb" },
    { name: "Telegram", file: "TelegramLogo2.glb" },
    { name: "TikTok", file: "TikTokLogo2.glb" },
    { name: "Tumblr", file: "TumblrLogo2.glb" },
    { name: "Twitch", file: "TwitchLogo2.glb" },
    { name: "Unity", file: "UnityLogo2.glb" },
    { name: "Unreal", file: "UnrealLogo3.glb" },
    { name: "WeChat", file: "WeChatLogo2.glb" },
    { name: "WhatsApp", file: "WhatsAppLogo2.glb" },
    { name: "Windows", file: "WindowsLogo3_2.glb" },
    { name: "X (Twitter)", file: "XTwitterLogo2.glb" },
    { name: "YouTube", file: "YoutubeLogo2.glb" }
  ];

  // Sosyal medya ikonlarını grid olarak doldur
  const populateSocialMediaIconsGrid = () => {
    socialMediaIcons.forEach(icon => {
      // Her ikon için bir container oluştur
      const iconItem = document.createElement("div");
      iconItem.className = "social-media-icon-item";
      iconItem.dataset.file = icon.file;
      iconItem.dataset.name = icon.name;
      
      // İkon görseli için placeholder
      const iconImg = document.createElement("div");
      iconImg.className = "social-media-icon-img";
      iconImg.style.backgroundColor = "#f0f0f0";
      iconImg.style.borderRadius = "5px";
      
      // İkon adı
      const iconName = document.createElement("div");
      iconName.className = "social-media-icon-name";
      iconName.textContent = icon.name;
      
      // Elementleri birleştir
      iconItem.appendChild(iconImg);
      iconItem.appendChild(iconName);
      
      // Tıklama olayı ekle
      iconItem.addEventListener("click", () => {
        toggleSocialMediaIcon(iconItem, icon);
      });
      
      // Grid'e ekle
      socialMediaIconsGrid.appendChild(iconItem);
      
      // İkon görselini yükle (önizleme için)
      loadSocialMediaIconPreview(iconImg, icon.file);
    });
  };
  
  // Sosyal medya ikonu önizleme görselini yükle
  const loadSocialMediaIconPreview = (imgElement, iconFileName) => {
    const iconUrl = `./assets/social-media-icons/${iconFileName}`;
    
    // GLTFLoader ile modeli yükle ve önizleme oluştur
    const loader = new GLTFLoader();
    loader.load(iconUrl, (gltf) => {
      // Canvas oluştur ve modeli render et
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
      });
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.z = 1.5;
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 2);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);
      
      const model = gltf.scene;
      scene.add(model);
      
      // Modeli uygun boyuta getir
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1 / maxDim;
      model.scale.set(scale, scale, scale);
      
      // Modeli ortala
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      
      // Modeli döndür
      model.rotation.y = Math.PI / 4;
      
      // Render et
      renderer.render(scene, camera);
      
      // Canvas içeriğini img elementine aktar
      imgElement.style.backgroundImage = `url(${canvas.toDataURL()})`;
      imgElement.style.backgroundSize = "contain";
      imgElement.style.backgroundPosition = "center";
      imgElement.style.backgroundRepeat = "no-repeat";
    });
  };
  
  // Sosyal medya ikonu seçimini değiştir
  const toggleSocialMediaIcon = (iconElement, icon) => {
    // Seçim durumunu değiştir
    iconElement.classList.toggle("selected");
    
    // Seçili ikonlar listesini güncelle
    if (iconElement.classList.contains("selected")) {
      // İkonu seçili listeye ekle
      selectedSocialMediaIcons.push({
        name: icon.name,
        file: icon.file,
        url: `./assets/social-media-icons/${icon.file}`
      });
    } else {
      // İkonu seçili listeden çıkar
      selectedSocialMediaIcons = selectedSocialMediaIcons.filter(item => item.file !== icon.file);
    }
    
    // Seçili ikonları view canvas'ta göster
    displaySelectedSocialMediaIcons();
  };

  // Seçili sosyal medya ikonlarını view canvas'ta göster
  const displaySelectedSocialMediaIcons = async () => {
    try {
      // Önceki sosyal medya ikonlarını kaldır
      const existingSocialMediaIcons = viewScene.children.filter(child => child.userData && child.userData.isSocialMediaIcon);
      existingSocialMediaIcons.forEach(icon => {
        viewScene.remove(icon);
      });
      
      // Seçili ikon yoksa işlemi sonlandır
      if (selectedSocialMediaIcons.length === 0) {
        renderViewCanvas();
        return;
      }
      
      // Her seçili ikonu yükle ve göster
      const iconSpacing = 0.5; // İkonlar arası mesafe
      const startPosition = -((selectedSocialMediaIcons.length - 1) * iconSpacing) / 2; // Merkezi hizalama için başlangıç pozisyonu
      
      for (let i = 0; i < selectedSocialMediaIcons.length; i++) {
        const icon = selectedSocialMediaIcons[i];
        const loader = new GLTFLoader();
        
        // Promise ile yükleme işlemini bekle
        await new Promise((resolve, reject) => {
          loader.load(icon.url, (gltf) => {
            // Modeli hazırla
            const socialMediaIcon = gltf.scene;
            socialMediaIcon.userData.isSocialMediaIcon = true; // Daha sonra referans için işaretle
            socialMediaIcon.userData.iconFile = icon.file; // Hangi ikon olduğunu kaydet
            
            // Modelin boyutunu ayarla
            const box = new THREE.Box3().setFromObject(socialMediaIcon);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 0.3 / maxDim; // Modeli uygun boyuta ölçekle
            
            socialMediaIcon.scale.set(scale, scale, scale);
            
            // İkonu konumlandır (x ekseninde yan yana)
            const xPosition = startPosition + (i * iconSpacing);
            socialMediaIcon.position.set(xPosition, 0, 0);
            
            // Modeli sahneye ekle
            viewScene.add(socialMediaIcon);
            
            resolve();
          }, undefined, reject);
        });
      }
      
      // Sahneyi render et
      renderViewCanvas();
    } catch (error) {
      console.error("Sosyal medya ikonları görüntülenirken hata oluştu:", error);
    }
  };

  // Tümünü seç butonuna tıklama olayı ekle
  selectAllIconsBtn.addEventListener("click", () => {
    const iconItems = socialMediaIconsGrid.querySelectorAll(".social-media-icon-item");
    selectedSocialMediaIcons = [];
    
    iconItems.forEach(item => {
      item.classList.add("selected");
      
      // İkonu seçili listeye ekle
      selectedSocialMediaIcons.push({
        name: item.dataset.name,
        file: item.dataset.file,
        url: `./assets/social-media-icons/${item.dataset.file}`
      });
    });
    
    // Seçili ikonları view canvas'ta göster
    displaySelectedSocialMediaIcons();
  });
  
  // Seçimi temizle butonuna tıklama olayı ekle
  clearSelectedIconsBtn.addEventListener("click", () => {
    const iconItems = socialMediaIconsGrid.querySelectorAll(".social-media-icon-item");
    
    iconItems.forEach(item => {
      item.classList.remove("selected");
    });
    
    selectedSocialMediaIcons = [];
    
    // Seçili ikonları view canvas'tan kaldır
    displaySelectedSocialMediaIcons();
  });

  // Sosyal medya ikonları grid'ini doldur
  populateSocialMediaIconsGrid();

  // Resmi view canvas'ta göster
  const displayImageInViewCanvas = async (file) => {
    if (!file) return;
    
    try {
      // Resmi yükle
      const image = await loadImage(file);
      
      // Eğer önceki bir texture varsa, dispose et
      if (viewTexture) {
        viewTexture.dispose();
      }
      
      // Yeni texture oluştur
      viewTexture = new THREE.Texture(image);
      viewTexture.colorSpace = THREE.SRGBColorSpace; // Renk uzayını düzelt
      viewTexture.needsUpdate = true;
      
      // Eğer plane yoksa oluştur, varsa texture'ını güncelle
      if (!viewPlane) {
        const planeGeometry = new THREE.PlaneGeometry(1, 1);
        const planeMaterial = new THREE.MeshBasicMaterial({ 
          map: viewTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 1.0
        });
        viewPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        viewPlane.position.z = -0.01; // Plane'i modelin arkasına konumlandır
        viewScene.add(viewPlane);
      } else {
        viewPlane.material.map = viewTexture;
        viewPlane.material.needsUpdate = true;
      }
      
      // Plane'in boyutlarını resmin en-boy oranına göre ayarla
      const aspectRatio = image.width / image.height;
      if (aspectRatio > 1) {
        viewPlane.scale.set(1, 1/aspectRatio, 1);
      } else {
        viewPlane.scale.set(aspectRatio, 1, 1);
      }
      
      // Sahneyi render et
      renderViewCanvas();
    } catch (error) {
      console.error("Resim görüntülenirken hata oluştu:", error);
    }
  };
  
  // Modeli view canvas'ta göster
  const displayModelInViewCanvas = async (file) => {
    try {
      // Eğer önceki bir model varsa, kaldır
      if (viewModel) {
        viewScene.remove(viewModel);
        viewModel = null;
      }
      
      // Model dosyası yoksa, varsayılan modeli kullan
      const modelUrl = file ? URL.createObjectURL(file) : defaultGlbModel;
      
      // GLTFLoader ile modeli yükle
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        // Modeli hazırla
        viewModel = gltf.scene;
        
        // Modelin boyutunu ayarla
        const box = new THREE.Box3().setFromObject(viewModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.5 / maxDim; // Modeli uygun boyuta ölçekle
        
        //viewModel.scale.set(scale, scale, scale);
        
        // Modeli merkeze konumlandır
        viewModel.position.set(0, 0, 0);
        
        // Modeli sahneye ekle
        viewScene.add(viewModel);
        
        // Sahneyi render et
        renderViewCanvas();
      }, 
      // Progress callback
      (xhr) => {
        console.log(`Model yükleniyor: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
      }, 
      // Error callback
      (error) => {
        console.error('Model yüklenirken hata oluştu:', error);
      });
    } catch (error) {
      console.error("Model görüntülenirken hata oluştu:", error);
    }
  };

  // Videoyu view canvas'ta göster
  const displayVideoInViewCanvas = async (file) => {
    if(!file) return;
    
    try {
      // Önceki video plane'i varsa kaldır
      const existingVideoPlane = viewScene.children.find(child => child.userData && child.userData.isVideoPlane);
      if (existingVideoPlane) {
        viewScene.remove(existingVideoPlane);
      }
      
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.loop = true;
      video.muted = true; // Otomatik oynatma için gerekli
      video.playsInline = true; // Mobil cihazlar için gerekli
      video.load();
      
      // Video yüklendiğinde aspect ratio'yu ayarla
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          const videoAspect = video.videoWidth / video.videoHeight;
          console.log(`Video boyutları: ${video.videoWidth}x${video.videoHeight}, Aspect Ratio: ${videoAspect}`);
          
          const videoTexture = new THREE.VideoTexture(video);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          videoTexture.format = THREE.RGBAFormat;
          videoTexture.colorSpace = THREE.SRGBColorSpace;
          
          const planeGeometry = new THREE.PlaneGeometry(1, 1);
          const planeMaterial = new THREE.MeshBasicMaterial({ 
            map: videoTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
          });
          
          const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
          videoPlane.userData.isVideoPlane = true; // Daha sonra referans için işaretle
          
          // Video aspect ratio'suna göre plane'i ölçeklendir
          if (videoAspect > 1) {
            // Yatay video (landscape)
            videoPlane.scale.set(1, 1/videoAspect, 1);
          } else {
            // Dikey video (portrait)
            videoPlane.scale.set(videoAspect, 1, 1);
          }
          
          //videoPlane.position.z = 0.1; // Plane'i video arkasına konumlandır
          viewScene.add(videoPlane);
          
          // Videoyu oynat
          video.play().catch(e => console.error("Video oynatma hatası:", e));
          
          // Sahneyi render et
          renderViewCanvas();
          
          resolve();
        }, { once: true });
        
        // Hata durumunda da çözüm sağla
        video.addEventListener('error', () => {
          console.error("Video yükleme hatası");
          resolve();
        }, { once: true });
      });
      
    } catch (error) {
      console.error("Video görüntülenirken hata oluştu:", error);
    }
  }
  
  // View Canvas için Three.js sahnesini kur
  const setupViewCanvas = (canvas) => {
    // Parent container'ın boyutlarını al
    const container = document.querySelector('.view-canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Canvas boyutlarını container'a göre ayarla
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Sahne, kamera ve renderer oluştur
    viewScene = new THREE.Scene();
    viewScene.background = new THREE.Color(0x111111); // Yumuşak siyah arka plan
    
    viewCamera = new THREE.PerspectiveCamera(
      75, 
      canvas.width / canvas.height, 
      0.1, 
      1000
    );
    viewCamera.position.z = 1;
    
    viewRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    viewRenderer.setSize(canvas.width, canvas.height);
    viewRenderer.outputColorSpace = THREE.SRGBColorSpace; // Renderer renk uzayını ayarla
    
    // OrbitControls ekle
    const controls = new OrbitControls(viewCamera, canvas);
    controls.enableDamping = true; // Yumuşak hareket için
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;
    controls.enableZoom = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 3;
    
    // Işık ekle
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    viewScene.add(ambientLight);
    
    // Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
    window.addEventListener('resize', () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      viewCamera.aspect = containerWidth / containerHeight;
      viewCamera.updateProjectionMatrix();
      
      viewRenderer.setSize(containerWidth, containerHeight);
    });
    
    // Animation loop ekle (OrbitControls için)
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // OrbitControls güncellemesi
      renderViewCanvas();
    };
    animate();
  };
  
  // View Canvas'ı render et
  const renderViewCanvas = () => {
    if (viewRenderer && viewScene && viewCamera) {
      viewRenderer.render(viewScene, viewCamera);
    }
  };

  // View Canvas için Three.js sahnesini başlat
  setupViewCanvas(viewCanvas);

  // Başlangıçta yükleme butonunu devre dışı bırak
  uploadButton.disabled = true;

  // Compiler'ı başlat
  compiler = new window.MINDAR.IMAGE.Compiler();

  // Resim Dropzone'unu başlat
  const imageDropzone = new Dropzone("#imageDropzone", {
    url: "/dummy-upload", // Gerçek bir URL'e gerek yok, dosyaları client-side işleyeceğiz
    acceptedFiles: "image/*",
    maxFiles: 1,
    autoProcessQueue: false,
    addRemoveLinks: true,
    dictDefaultMessage: "Resim dosyasını buraya sürükleyin veya tıklayarak seçin",
    dictRemoveFile: "Kaldır",
    dictCancelUpload: "İptal",
    dictMaxFilesExceeded: "Sadece bir resim yükleyebilirsiniz",
  });

  // Model Dropzone'unu başlat
  const modelDropzone = new Dropzone("#modelDropzone", {
    url: "/dummy-upload", // Gerçek bir URL'e gerek yok, dosyaları client-side işleyeceğiz
    acceptedFiles: ".glb",
    maxFiles: 1,
    autoProcessQueue: false,
    addRemoveLinks: true,
    dictDefaultMessage: "3D model dosyasını (.glb) buraya sürükleyin veya tıklayarak seçin",
    dictRemoveFile: "Kaldır",
    dictCancelUpload: "İptal",
    dictMaxFilesExceeded: "Sadece bir model yükleyebilirsiniz",
  });

  // Video Dropzone'unu başlat
  const videoDropzone = new Dropzone("#videoDropzone", {
    url: "/dummy-upload", // Gerçek bir URL'e gerek yok, dosyaları client-side işleyeceğiz
    acceptedFiles: "video/*",
    maxFiles: 1,
    autoProcessQueue: false,
    addRemoveLinks: true,
    dictDefaultMessage: "Video dosyasını buraya sürükleyin veya tıklayarak seçin",
    dictRemoveFile: "Kaldır",
    dictCancelUpload: "İptal",
    dictMaxFilesExceeded: "Sadece bir video yükleyebilirsiniz",
  });

  // Resim yüklendiğinde
  imageDropzone.on("addedfile", (file) => {
    // Önceki dosyayı kaldır (eğer varsa)
    if (imageDropzone.files.length > 1) {
      imageDropzone.removeFile(imageDropzone.files[0]);
    }
    imageFile = file;
    checkFilesAndEnableButton();
    
    // Yüklenen resmi view canvas'ta göster
    displayImageInViewCanvas(file);
  });

  // Resim kaldırıldığında
  imageDropzone.on("removedfile", () => {
    imageFile = null;
    checkFilesAndEnableButton();
  });

  // Model yüklendiğinde
  modelDropzone.on("addedfile", (file) => {
    // Önceki dosyayı kaldır (eğer varsa)
    if (modelDropzone.files.length > 1) {
      modelDropzone.removeFile(modelDropzone.files[0]);
    }
    modelFile = file;
    
    // Yüklenen modeli view canvas'ta göster
    displayModelInViewCanvas(file);
  });

  // Model kaldırıldığında
  modelDropzone.on("removedfile", () => {
    modelFile = null;
    
    // Modeli canvas'tan kaldır
    if (viewModel) {
      viewScene.remove(viewModel);
      viewModel = null;
      renderViewCanvas();
    }
  });

  // Video yüklendiğinde
  videoDropzone.on("addedfile", (file) => {
    // Önceki dosyayı kaldır (eğer varsa)
    if (videoDropzone.files.length > 1) {
      videoDropzone.removeFile(videoDropzone.files[0]);
    }
    videoFile = file;
    checkFilesAndEnableButton();
    
    // Yüklenen videoyu view canvas'ta göster
    displayVideoInViewCanvas(file);
  });

  // Video kaldırıldığında
  videoDropzone.on("removedfile", () => {
    videoFile = null;
    checkFilesAndEnableButton();
  });

  // Dosya durumunu kontrol et ve butonu etkinleştir/devre dışı bırak
  const checkFilesAndEnableButton = () => {
    // En az bir resim dosyası yüklenmiş olmalı
    uploadButton.disabled = !imageFile;
  };

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
      // Eğer dosya seçilmediyse null döndür
      return null;
    }
    
    // Normal dosya için URL oluştur
    return URL.createObjectURL(file);
  };

  // Video yükle
  const loadVideo = async (file) => {
    if (!file) {
      // Eğer dosya seçilmediyse null döndür
      return null;
    }
    
    // Video elementi oluştur ve hazırla
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(file);
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.load();
    
    // Video elementini döndür
    return videoElement;
  };

  // Yükleme butonuna tıklama olayı ekle
  uploadButton.addEventListener("click", async () => {
    if (!imageFile) {
      alert("Lütfen bir resim seçin");
      return;
    }

    try {
      loadingIndicator.style.display = "block";
      compileProgress.style.display = "block";
      uploadButton.disabled = true;

      // Resmi yükle
      const image = await loadImage(imageFile);
      
      // Kullanıcının yüklediği modeli yükle (eğer seçilmişse)
      let modelUrl = null;
      if (modelFile) {
        modelUrl = await loadModel(modelFile);
      }
      
      // Video yükle (eğer seçilmişse)
      const videoUrl = await loadVideo(videoFile);

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
      await startAR(mindUrl, modelUrl, videoUrl);

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

  const startAR = async (mindTargetSource, modelSource, videoElement) => {
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

      // Model
      let model_mixer;
      let model = null;
      
      if (modelSource) {
        const loader = new GLTFLoader();
        model = await loader.loadAsync(modelSource, (xhr) => {
          if (xhr.lengthComputable) {
            const yuzde = Math.round((xhr.loaded / xhr.total) * 100);
            console.log(`3D Model Yükleniyor: %${yuzde}`);
          }
        });
      }

      // Video texture ve plane oluştur (eğer video varsa)
      let videoPlane = null;
      if (videoElement && videoElement instanceof HTMLVideoElement) {
        try {
          // Video elementinin hazır olduğundan emin ol
          if (videoElement.readyState === 0) {
            await new Promise((resolve) => {
              videoElement.addEventListener('loadeddata', resolve, { once: true });
              videoElement.load();
            });
          }
          
          // Video oynatmayı başlat
          await videoElement.play().catch(e => console.error("Video oynatma hatası:", e));
          
          // Video texture oluştur
          const videoTexture = new THREE.VideoTexture(videoElement);
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          videoTexture.format = THREE.RGBAFormat;
          videoTexture.colorSpace = THREE.SRGBColorSpace;
          
          // Video plane oluştur
          const planeGeometry = new THREE.PlaneGeometry(1, 1);
          const planeMaterial = new THREE.MeshBasicMaterial({ 
            map: videoTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
          });
          
          videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
          //videoPlane.position.z = -0.05; // Modelin arkasına konumlandır
          
          // Video boyutlarına göre plane'i ölçeklendir
          const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
          console.log(`AR Video boyutları: ${videoElement.videoWidth}x${videoElement.videoHeight}, Aspect Ratio: ${videoAspect}`);
          
          if (videoAspect > 1) {
            // Yatay video (landscape)
            videoPlane.scale.set(1, 1/videoAspect, 1);
          } else {
            // Dikey video (portrait)
            videoPlane.scale.set(videoAspect, 1, 1);
          }
        } catch (videoError) {
          console.error("Video texture oluşturma hatası:", videoError);
        }
      }

      // Model ölçeği ve pozisyonunu ayarla
      if (model) {
        model.scene.position.set(0, 0, 0); // Merkeze konumlandır
      }

      // // Setup animation mixer
      // model_mixer = new THREE.AnimationMixer(model.scene);
      // const modelAction = model_mixer.clipAction(model.animations[0]);
      // modelAction.play();

      // Modelleri anchor'a ekle
      const anchor = mindarThree.addAnchor(0);
      //anchor.group.add(platformMesh);
      
      // Model ekle (eğer varsa)
      if (model) {
        anchor.group.add(model.scene);
      }
      
      // Video plane'i ekle (eğer oluşturulduysa)
      if (videoPlane) {
        anchor.group.add(videoPlane);
      }

      // Seçili sosyal medya ikonlarını ekle
      if (selectedSocialMediaIcons.length > 0) {
        const iconSpacing = 0.5; // İkonlar arası mesafe
        const startPosition = -((selectedSocialMediaIcons.length - 1) * iconSpacing) / 2; // Merkezi hizalama için başlangıç pozisyonu
        
        for (let i = 0; i < selectedSocialMediaIcons.length; i++) {
          const icon = selectedSocialMediaIcons[i];
          const loader = new GLTFLoader();
          const socialMediaIcon = await loader.loadAsync(icon.url, (xhr) => {
            if (xhr.lengthComputable) {
              const yuzde = Math.round((xhr.loaded / xhr.total) * 100);
              console.log(`Sosyal medya ikonu yükleniyor (${icon.name}): %${yuzde}`);
            }
          });
          
          // Sosyal medya ikonunun boyutunu ve konumunu ayarla
          const iconScene = socialMediaIcon.scene;
          
          // Modelin boyutunu ayarla
          const box = new THREE.Box3().setFromObject(iconScene);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 0.3 / maxDim; // Modeli uygun boyuta ölçekle
          
          iconScene.scale.set(scale, scale, scale);
          
          // İkonu konumlandır (x ekseninde yan yana)
          const xPosition = startPosition + (i * iconSpacing);
          iconScene.position.set(xPosition, 0, 0);
          
          anchor.group.add(iconScene);
        }
      }

      anchor.onTargetFound = () => {
        console.log("Hedef bulundu");
        // Video oynatmayı başlat (eğer varsa)
        if (videoElement) {
          videoElement.play().catch(e => console.error("Video oynatma hatası:", e));
        }
      };

      anchor.onTargetLost = () => {
        console.log("Hedef kayboldu");
        // Video oynatmayı duraklat (eğer varsa)
        if (videoElement) {
          videoElement.pause();
        }
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
