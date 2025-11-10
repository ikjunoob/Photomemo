const express = require("express");
const router = express.Router();
const Post = require("../models/Posts"); // 게시글 DB 모델 불러오기
const jwt = require("jsonwebtoken"); // 토큰 처리를 위한 라이브러리
const mongoose = require("mongoose"); // MongoDB 연결을 위한 라이브러리
const { authenticateToken } = require("../middlewares/auth"); // 로그인 인증 미들웨어
const { deleteObject } = require("../src/s3"); // S3 파일 삭제 함수

// S3 기본 URL 설정 (환경 변수에서 가져오거나 기본값 사용)
const S3_BASE_URL =
    process.env.S3_BASE_URL ||
    `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;

/**
 * 전체 URL에서 파일 키(Key)만 추출하는 함수
 * 예: https://s3.../uploads/image.jpg -> uploads/image.jpg
 */
function urlToKey(u) {
    if (!u) return "";
    const s = String(u);
    if (!/^https?:\/\//i.test(s)) return s; // http로 시작하지 않으면 이미 키라고 판단
    const base = String(S3_BASE_URL || "").replace(/\/+$/, "");
    // URL이 기본 S3 주소로 시작하면 그 뒷부분만 잘라냄
    return s.startsWith(base + "/") ? s.slice(base.length + 1) : s;
}

/**
 * 파일 키(Key)를 전체 URL로 변환하는 함수
 * 예: uploads/image.jpg -> https://s3.../uploads/image.jpg
 */
function joinS3Url(base, key) {
    const b = String(base || "").replace(/\/+$/, "");
    const k = String(key || "").replace(/^\/+/, "");
    return `${b}/${k}`;
}

/**
 * 입력값을 안전하게 배열로 변환하는 함수
 * 문자열이나 JSON 문자열이 들어와도 배열 형태로 통일시켜 줌
 */
const toArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === "string") {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [val];
        } catch {
            return [val];
        }
    }
    return [];
};

/**
 * 요청된 ID가 MongoDB의 올바른 ObjectId 형식인지 검사하는 미들웨어
 * 형식이 잘못되었으면 400 에러 반환
 */
const ensureObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "잘못된 id 형식입니다." });
    }
    next();
};

/**
 * 객체에서 값이 undefined인 속성을 제거하는 함수
 * (수정 시 값이 있는 필드만 업데이트하기 위함)
 */
const pickDefined = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// =================================================================
// 라우터 시작
// =================================================================

/**
 * 📝 게시글 작성 (POST /)
 * 로그인 필요 (authenticateToken 적용)
 */
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { title, content, fileUrl, imageUrl } = req.body;

        // fileUrl이나 imageUrl을 배열 형태로 정리
        let files = toArray(fileUrl);
        if (!files.length && imageUrl) files = toArray(imageUrl);

        // 현재 로그인한 사용자의 ID 추출
        const uid = req.user._id || req.user.id;

        // 이 사용자가 가장 최근에 쓴 글을 찾아서 글 번호 매기기
        const latest = await Post.findOne({ user: uid }).sort({ number: -1 });
        const nextNumber = latest ? Number(latest.number) + 1 : 1;

        // DB에 새 게시글 저장
        const post = await Post.create({
            user: uid,
            number: nextNumber,
            title,
            content,
            fileUrl: files, // 파일 키 목록 저장
            imageUrl,
        });

        res.status(201).json(post); // 201 Created 응답
    } catch (error) {
        console.error("POST /api/posts 실패:", error);
        res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
});

/**
 * 👀 전체 게시글 조회 (GET /)
 */
router.get("/", async (req, res) => {
    try {
        // 최신순으로 모든 게시글 가져오기
        const list = await Post.find().sort({ createdAt: -1 }).lean();

        // 각 게시글의 파일 키를 전체 URL로 변환해서 반환
        const data = list.map((p) => {
            const raw = Array.isArray(p.fileUrl)
                ? p.fileUrl
                : p.imageUrl
                    ? [p.imageUrl]
                    : [];

            const keys = raw.filter((v) => typeof v === "string" && v.length > 0);
            const urls = keys.map((v) =>
                v.startsWith("http") ? v : joinS3Url(S3_BASE_URL, v)
            );

            return { ...p, fileUrl: urls };
        });

        res.json(data);
    } catch (error) {
        console.error("GET /api/posts 실패", error);
        res.status(500).json({ message: "서버 오류" });
    }
});

/**
 * 👤 내 게시글 조회 (GET /my)
 * 로그인 필요
 */
router.get("/my", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        if (!userId) return res.status(400).json({ message: "유저 정보 없음" });

        // 로그인한 사용자가 쓴 글만 찾아서 반환
        const myPosts = await Post.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        // (전체 조회와 동일하게 URL 변환 로직 적용)
        const data = myPosts.map((p) => {
            const raw = Array.isArray(p.fileUrl)
                ? p.fileUrl
                : p.imageUrl
                    ? [p.imageUrl]
                    : [];
            const keys = raw.filter((v) => typeof v === "string" && v.length > 0);
            const urls = keys.map((v) =>
                v.startsWith("http") ? v : joinS3Url(S3_BASE_URL, v)
            );
            return { ...p, fileUrl: urls };
        });

        res.json(data);
    } catch (error) {
        console.error("GET /api/posts/my 실패", error);
        res.status(500).json({ message: "서버 오류" });
    }
});

/**
 * 🔍 특정 게시글 상세 조회 (GET /:id)
 */
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const doc = await Post.findById(req.params.id).lean();

        if (!doc) return res.status(404).json({ message: "존재하지 않는 게시글" });

        // 파일 키를 URL로 변환
        const keys = Array.isArray(doc.fileUrl)
            ? doc.fileUrl
            : doc.imageUrl
                ? [doc.imageUrl]
                : [];
        const urls = keys
            .filter((v) => typeof v === "string" && v.length > 0)
            .map((v) => (v.startsWith("http") ? v : joinS3Url(S3_BASE_URL, v)));

        res.json({ ...doc, fileUrl: urls });
    } catch (error) {
        res.status(500).json({ message: "서버 오류" });
    }
});

/**
 * ✏️ 게시글 수정 (PUT /:id)
 * 로그인 필요, ObjectId 형식 검사(ensureObjectId)
 */
router.put("/:id", authenticateToken, ensureObjectId, async (req, res) => {
    try {
        const { title, content, fileUrl, imageUrl } = req.body;

        // 1. 수정 전 원본 게시글 정보 가져오기
        const before = await Post.findById(req.params.id)
            .select("user fileUrl imageUrl")
            .lean();

        if (!before)
            return res.status(404).json({ message: "존재하지 않는 게시글" });

        // 2. 본인 확인: 글 작성자와 현재 로그인한 사람이 같은지 체크
        const uid = String(req.user.id || req.user._id);
        if (String(before.user) !== uid) {
            return res.status(403).json({ message: "권한이 없습니다." });
        }

        // 3. 업데이트할 내용 정리 (undefined는 제외)
        const updates = pickDefined({
            title,
            content,
            fileUrl: fileUrl !== undefined ? toArray(fileUrl) : undefined,
            imageUrl,
        });

        // 4. [중요] 구 파일과 신 파일 비교해서 삭제할 파일 찾기
        // 기존에 있던 파일 키 목록
        const oldKeys = [
            ...(Array.isArray(before.fileUrl) ? before.fileUrl : []),
            ...(before.imageUrl ? [before.imageUrl] : []),
        ]
            .map(urlToKey)
            .filter(Boolean);

        // 새로 업데이트될 파일 키 목록
        const newKeys = [
            ...(updates.fileUrl !== undefined
                ? updates.fileUrl
                : Array.isArray(before.fileUrl)
                    ? before.fileUrl
                    : []),
            ...(updates.imageUrl !== undefined
                ? [updates.imageUrl]
                : before.imageUrl
                    ? [before.imageUrl]
                    : []),
        ]
            .map(urlToKey)
            .filter(Boolean);

        // 구 목록엔 있는데 신 목록엔 없는 파일 -> 삭제 대상
        const toDelete = oldKeys.filter((k) => !newKeys.includes(k));

        // 5. S3에서 실제 파일 삭제 실행
        if (toDelete.length) {
            const results = await Promise.allSettled(
                toDelete.map((k) => deleteObject(k))
            );

            // 삭제 실패한 경우 로그 남기기
            const fail = results.filter((r) => r.status === "rejected");
            if (fail.length) {
                console.warn(
                    "[S3 Delete Partial Fail]",
                    fail.map((f) => f.reason?.message || f.reason)
                );
            }
        }

        // 6. DB 내용 최종 업데이트
        const updated = await Post.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true } // 업데이트 후의 최신 데이터를 반환받음
        );

        res.json(updated);
    } catch (error) {
        console.error("PUT /api/posts/:id 실패", error);
        res.status(500).json({ message: "서버 오류" });
    }
});

/**
 * 🗑️ 게시글 삭제 (DELETE /:id)
 * 로그인 필요, 본인 글만 삭제 가능
 */
router.delete("/:id", authenticateToken, ensureObjectId, async (req, res) => {
    try {
        // 1. 삭제할 게시글 정보 가져오기
        const doc = await Post.findById(req.params.id).select(
            "user fileUrl imageUrl"
        );
        if (!doc) return res.status(404).json({ message: "존재하지 않는 게시글" });

        // 2. 본인 확인
        const uid = String(req.user.id || req.user._id);
        if (String(doc.user) !== uid) {
            return res.status(403).json({ message: "권한이 없습니다." });
        }

        // 3. 게시글에 첨부된 모든 파일 키 찾기
        const keys = [
            ...(Array.isArray(doc.fileUrl) ? doc.fileUrl : []),
            ...(doc.imageUrl ? [doc.imageUrl] : []),
        ]
            .map(urlToKey)
            .filter(Boolean);

        // 4. S3에서 첨부 파일들 삭제
        if (keys.length) {
            const results = await Promise.allSettled(
                keys.map((k) => deleteObject(k))
            );
            // 실패 로그
            const fail = results.filter((r) => r.status === "rejected");
            if (fail.length) {
                console.warn(
                    "[S3 Delete Partial Fail]",
                    fail.map((f) => f.reason?.message || f.reason)
                );
            }
        }

        // 5. DB에서 게시글 완전히 삭제
        await doc.deleteOne();
        res.json({ ok: true, id: doc._id });
    } catch (error) {
        res.status(500).json({ message: "서버 오류" });
    }
});

module.exports = router;