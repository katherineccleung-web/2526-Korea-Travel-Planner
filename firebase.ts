// @ts-ignore
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence, 
  initializeFirestore,
  CACHE_SIZE_UNLIMITED 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- 設定教學 (SETUP INSTRUCTIONS) ---
// 1. 前往 https://console.firebase.google.com/
// 2. 建立新專案 (Create a new project)
// 3. 新增網頁應用程式 (Web App "</>") -> 複製 config 貼到下方
//
// --- 無法寫入資料？(PERMISSION DENIED) ---
// 如果您遇到 "Missing or insufficient permissions" 錯誤，請手動設定規則：
//
// [Firestore Database]
// 1. 左側選單點擊 "Firestore Database" (在 Build 下方)
// 2. 點擊上方的 "Rules" (規則) 標籤
// 3. 將內容改為： allow read, write: if true;
// 4. 點擊 Publish
//
// [Storage]
// 1. 左側選單點擊 "Storage"
// 2. 點擊上方的 "Rules" (規則) 標籤
// 3. 將內容改為： allow read, write: if true;
// 4. 點擊 Publish

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// --------------------------------------------------------
// 判斷是否為演示模式 (如果使用者還沒填入 API Key)
// --------------------------------------------------------
export const isMockMode = firebaseConfig.apiKey === "YOUR_API_KEY_HERE";

if (isMockMode) {
  console.warn("⚠️ Firebase 尚未設定，App 將以 [演示模式] 執行，資料不會儲存到雲端。");
} else if (typeof window !== "undefined" && firebaseConfig.projectId !== "your-project") {
  console.group("🔥 Firebase 設定捷徑");
  console.log(
    `👉 設定資料庫規則 (Firestore Rules):\nhttps://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`
  );
  console.log(
    `👉 設定儲存空間規則 (Storage Rules):\nhttps://console.firebase.google.com/project/${firebaseConfig.projectId}/storage/rules`
  );
  console.groupEnd();
}

// Fixed: Use named import for initializeApp
const app = initializeApp(firebaseConfig);

// 初始化 Firestore (設定離線緩存)
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// 只有在非 Mock 模式下才啟用 Persistence，避免報錯
if (!isMockMode) {
  enableMultiTabIndexedDbPersistence(db).catch((err: any) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence failed: Browser not supported');
    }
  });
}

const storage = getStorage(app);

export { db, storage };