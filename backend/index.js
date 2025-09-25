const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// .env 파일의 환경 변수를 로드합니다.
dotenv.config();

const app = express();
// PORT가 설정되어 있지 않으면 5000번 포트를 사용합니다.
const PORT = process.env.PORT || 5000;

// CORS와 JSON 파싱을 위한 미들웨어를 사용합니다.
app.use(cors());
app.use(express.json());

// MongoDB에 연결합니다.
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB 연결 성공"))
    .catch((err) => console.error("MongoDB 연결 실패:", err.message));

// 기본 GET 라우트 설정
// 서버의 루트 URL('/')로 GET 요청이 오면 "API is running..." 메시지를 응답합니다.
app.get("/", (req, res) => {
    res.send("Photomemo!");
});

// 지정된 PORT에서 서버를 실행합니다.
app.listen(PORT, () => {
    console.log(`${PORT}번 포트에서 서버가 실행되었습니다.`);
});
