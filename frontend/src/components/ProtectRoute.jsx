import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
const ProtectRoute = ({
    isAuthed,
    user,
    requiredRole,
    redirect = '/admin/login'
}) => {

    const location = useLocation()

    if (!isAuthed) {
        return <Navigate to={redirect} replace state={{ from: location }} />
    }
    return (
        <div>ProtectRoute</div>
    )
}

export default ProtectRoute