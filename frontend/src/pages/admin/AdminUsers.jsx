import React, { useEffect, useState, useCallback } from 'react'
import AdminUserFilter from '../../components/admin/AdminUserFilter'
import AdminUserList from '../../components/admin/AdminUserList'
import { patchAdminUser, fetchAdminUsers } from '../../api/adminApi'
const AdminUsers = () => {

    const [id, setId] = useState('')

    const [users, setUsers] = useState([])

    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        size: 20,
        totalPages: 1
    })

    const getUsers = useCallback(async (page = 1, size = 20) => {

        const res = await fetchAdminUsers({ page, size })

        setUsers(res.items)
        setMeta({
            total: res.total,
            page: res.page,
            size: res.size,
            totalPages: res.totalPages
        })
    }, [])


    useEffect(() => {
        getUsers(1, 20)
    }, [getUsers])

    return (
        <div>
            <AdminUserFilter />
            <AdminUserList items={users} />
        </div>
    )
}

export default AdminUsers