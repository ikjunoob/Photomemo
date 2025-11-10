import React from "react";
import { formatYMD } from "../../util/formatYMD";
const AdminUserList = ({ items = [] }) => {
    return (
        <ul className="admin-list">
            <li>
                <span>id</span>
                <span>email</span>
                <span>nickname</span>
                <span>role</span>
                <span>status</span>
                <span>date</span>
            </li>
            {items.map((it, i) => (
                <li key={it._id}>
                    <span>{i + 1}</span>
                    <span>{it._id}</span>
                    <span>{it.email}</span>
                    <span>{it.displayName ?? "-"}</span>
                    <span>{it.role}</span>
                    <span>{it.isActive}</span>
                    <span>{it.createdAt ? formatYMD(it.createdAt) : ""}</span>
                </li>
            ))}

            {items.length === 0 && (
                <li>사용자 데이터가 없습니다.</li>
            )}
        </ul>
    );
};

export default AdminUserList;