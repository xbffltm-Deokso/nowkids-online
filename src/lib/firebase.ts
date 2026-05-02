import { initializeApp, getApps, getApp } from "firebase/app";
import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";
import { connectorConfig } from "./generated";

const firebaseConfig = {
  apiKey: "AIzaSyAAXcDVedgeq3uljs0XWphl29ZAfsVfWZc",
  authDomain: "nowkids-attendancedb.firebaseapp.com",
  projectId: "nowkids-attendancedb",
  storageBucket: "nowkids-attendancedb.firebasestorage.app",
  messagingSenderId: "121614751153",
  appId: "1:121614751153:web:9dc126c54ce24cd1db5990",
  measurementId: "G-CNVGJ95X9H"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Data Connect
export const dataConnect = getDataConnect(app, connectorConfig);

// 에뮬레이터 환경인 경우 주석 해제하여 연결
// connectDataConnectEmulator(dataConnect, 'localhost', 9399);
