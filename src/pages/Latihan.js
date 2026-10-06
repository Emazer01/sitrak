import * as React from 'react';
import { Navbar } from '../component/Navbar';
import { Sidebar } from '../component/Sidebar';

export const Latihan = () => {
    document.title = 'Latihan - SITRAK-AI';

    React.useEffect(() => {

        document.getElementById("btn-dashboard").classList.remove("sidebar-active")
        document.getElementById("btn-latihan").classList.add("sidebar-active")

        document.getElementById("nav-btn-dashboard").classList.remove("sidebar-active")
        document.getElementById("nav-btn-latihan").classList.add("sidebar-active")
    }, [])

    return (
        <div>
            <Navbar />
            <div className='d-flex'>
                <Sidebar />
                <div className='p-2 p-md-4 font-poppins w-100'>
                    <div className='bg-body-tertiary p-2 rounded-2 shadow-lg d-flex'>
                        <h1 className='col'>Latihan</h1>
                    </div>
                </div>
            </div>
        </div>
    )
}