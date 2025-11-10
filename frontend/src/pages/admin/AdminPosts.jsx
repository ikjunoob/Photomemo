import React, { useEffect, useMemo, useState } from "react";
import { fetchAdminPosts } from "../../api/adminApi";
import AdminPostList from "../../components/admin/AdminPostsList";
import AdminPostFilter from "../../components/admin/AdminPostFilter";

// 작성자 식별자 통일: 문자열/ObjectId/객체 모두 처리
const getUserId = (u) => {
    if (!u) return "";
    if (typeof u === "string") return u.toLowerCase();
    if (typeof u === "object") {
        if (u._id) return String(u._id).toLowerCase();
        if (u.id) return String(u.id).toLowerCase();
    }
    return String(u).toLowerCase();
};

const AdminPosts = () => {
    const [rawList, setRawList] = useState([]);
    const [query, setQuery] = useState({ q: "", user: "", status: "" });

    useEffect(() => {
        (async () => {
            const items = await fetchAdminPosts(); // 서버 필터 X, 전체 받아오기
            setRawList(Array.isArray(items) ? items : []);
        })();
    }, []);

    const items = useMemo(() => {
        const q = query.q.trim().toLowerCase();
        const user = query.user.replace(/\s+/g, "").toLowerCase(); // 공백 제거
        const status = query.status.trim().toLowerCase();

        return rawList.filter((it) => {
            const title = String(it.title ?? "").toLowerCase();
            const uid = getUserId(it.user); // ← 핵심
            const st = String(it.status ?? "").toLowerCase();

            const matchTitle = q ? title.includes(q) : true;
            const matchUser = user ? uid.includes(user) : true;
            const matchStatus = status ? st === status : true;

            return matchTitle && matchUser && matchStatus;
        });
    }, [rawList, query]);

    return (
        <div className="inner">
            <AdminPostFilter value={query} onChange={setQuery} />
            <AdminPostList items={items} />
        </div>
    );
};

export default AdminPosts;