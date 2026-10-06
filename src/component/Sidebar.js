export const Sidebar = () => {
    return (
        <div className="d-flex flex-column flex-shrink-0 p-2 p-md-3 text-white bg-body-tertiary sidebar shadow-lg sticky-top col-3 col-md-2 d-none d-md-flex" style={{ height: "100vh" }}>
            <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <img src="/SITRAK Tactical Target Emblem.png" className='col-12' />
            </a>
            <hr />
            <ul className="nav nav-pills flex-column" >
                <li className='mb-1'>
                    <a href="/" id='btn-dashboard' className="sidebar-link sidebar-active p-1 text-decoration-none font-poppins text-white d-flex">
                        <i className="bi bi-house-door-fill p-0 px-2 text-center fs-5" />
                        <span className='px-1 col-md-10 d-none d-md-block p-1'>Dashboard</span>
                    </a>
                </li>
                <li className='mb-1'>
                    <a href="/latihan" id='btn-latihan' className="sidebar-link p-1 text-decoration-none font-poppins text-white d-flex">
                        <i className="bi bi-bullseye p-0 px-2 text-center fs-5" />
                        <span className='px-1 p-1'>Latihan</span>
                    </a>
                </li>
                <li className='mb-1'>
                    <a href="/riwayat" id='btn-riwayat' className="sidebar-link p-1 text-decoration-none font-poppins text-white d-flex">
                        <i className="bi bi-file-earmark-text-fill p-0 px-2 text-center fs-5" />
                        <span className='px-1 p-1'>Riwayat</span>
                    </a>
                </li>
            </ul>
            <div className="mt-auto">
                <a href="/user" id='sidebar-username' className="btn btn-dark p-1 font-poppins text-white d-flex">
                    <i className="bi bi-person-circle p-0 px-2 text-center fs-5" />
                    <span className='px-1 p-1 text-start' id='isi-sidebar-username'>My Profile</span>
                </a>
                <hr />
                <button onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }} className='btn btn-danger row m-1 w-100'>
                    <i className="bi bi-box-arrow-left col-2 p-0"></i>
                    <span className="col-10 text-start">Logout</span>
                </button>
            </div>
        </div>
    )
}