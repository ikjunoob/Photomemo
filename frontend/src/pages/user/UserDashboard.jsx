import React from 'react'
import FileList from './FileList'
import UploadForm from './UploadForm'
const UserDashboard = () => {
    return (
        <section>
            <UploadForm />
            <FileList />
        </section>
    )
}

export default UserDashboard