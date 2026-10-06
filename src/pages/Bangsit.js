import * as React from 'react';
import copy from 'copy-to-clipboard';

import { Navbar } from '../component/Navbar';
import { Sidebar } from '../component/Sidebar';

export const Bangsit = () => {
    document.title = 'Bangsit - Denintel Kodau III'

    React.useEffect(() => {

        document.getElementById("btn-dashboard").classList.remove("sidebar-active")
        document.getElementById("btn-bangsit").classList.add("sidebar-active")

        document.getElementById("nav-btn-dashboard").classList.remove("sidebar-active")
        document.getElementById("nav-btn-bangsit").classList.add("sidebar-active")
    }, [])

    const clipboard = async () => {
        var text = document.getElementById("copyini").innerHTML
        console.log(text)
        copy(text)
    }

    return (
        <div>
            <Navbar />
            <div className='d-flex'>
                <Sidebar />
                <div className='p-2 p-md-4 font-poppins w-100'>
                    <div className='bg-body-tertiary p-2 rounded-2 shadow-lg d-flex'>
                        <h1 className='col' id='copyini'>Bangsit <i>Bangsit</i></h1>
                        <button class="btn btn-secondary col" onClick={clipboard} id='btn-copy-txt'>
                            <i class="bi bi-clipboard-fill"></i> Copy to text
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}