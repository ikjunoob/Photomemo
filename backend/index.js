// 필요한 모듈들을 가져옵니다.
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');

// .env 파일의 환경 변수를 로드합니다.
dotenv.config();

// Express 앱 생성 및 포트 설정
const app = express();
const PORT = process.env.PORT;

// --- 미들웨어 설정 ---

// CORS 설정: 지정된 프론트엔드 주소의 요청을 허용하고, 쿠키를 포함할 수 있게 합니다.
app.use(cors({
    origin: process.env.FRONT_ORIGIN,
    credentials: true
}));

// JSON 파싱 미들웨어: 요청 본문을 JSON으로 파싱하며, 크기 제한을 2MB로 설정합니다.
app.use(express.json({ limit: "2mb" }));

// 쿠키 파싱 미들웨어: 요청된 쿠키를 파싱하여 req.cookies에서 사용할 수 있게 합니다.
app.use(cookieParser());

// --- MongoDB 연결 ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB 연결 성공"))
    .catch((err) => console.error("MongoDB 연결 실패:", err.message));

// --- 라우팅 ---

// 루트 경로('/') GET 요청: 서버 상태 확인용 (Health Check)
app.get("/", (_req, res) => res.send("PhotoMemo API OK"));

// --- 오류 처리 미들웨어 ---

// 지정된 라우트가 없을 경우 500 서버 오류를 응답합니다.
app.use((_req, res) => {
    res.status(500).json({ message: "서버 오류" });
});

// --- 서버 실행 ---

// 지정된 포트에서 서버를 실행합니다.
app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});