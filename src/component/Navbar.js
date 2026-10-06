export const Navbar = () => {
    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary d-block d-md-none font-poppins sticky-top">
            <div className="container-fluid">
                <a className="navbar-brand text-white d-flex align-items-center" href="/">
                    <img src="/SITRAK Tactical Analytics Emblem.png" alt="Logo" height="70" className="d-inline-block align-text-top" />
                    <span className="mx-2">
                        <span className="fw-semibold fs-3">SITRAK-AI</span><br />
                        <span className="fs-6"></span>
                    </span>

                </a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse p-1" id="navbarSupportedContent">
                    <ul className="nav nav-pills flex-column mb-auto p-2">
                        <li>
                            <a href="/" id='nav-btn-dashboard' className="sidebar-link p-2 fs-6 text-decoration-none font-poppins sidebar-active text-white d-flex">
                                <i className="bi bi-house-door-fill p-0 px-2 text-center fs-5" />
                                <span className='px-1 p-1'>Dashboard</span>
                            </a>
                        </li>
                        <li>
                            <a href="/latihan" id='nav-btn-latihan' className="sidebar-link p-2 fs-6 text-decoration-none font-poppins text-white d-flex">
                                <i className="bi bi-bullseye p-0 px-2 text-center fs-5" />
                                <span className='px-1 p-1'>Latihan</span>
                            </a>
                        </li>
                        <li>
                            <a href="/riwayat" id='nav-btn-riwayat' className="sidebar-link p-2 fs-6 text-decoration-none font-poppins text-white d-flex">
                                <i className="bi bi-file-earmark-text-fill p-0 px-2 text-center fs-5" />
                                <span className='px-1 p-1'>Riwayat</span>
                            </a>
                        </li>
                    </ul>
                    <a href="/user" id='navbar-username' className=" btn btn-dark w-100 p-2 fs-6 text-decoration-none font-poppins text-white d-flex">
                        <i className="bi bi-person-circle p-0 px-2 text-center fs-5" />
                        <span className='px-1 p-1 text-start' id='isi-navbar-username'>My Profile</span>
                    </a>
                    <hr className="text-light" />
                    <button onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }} className='btn btn-danger row m-1 p-2 w-100'>
                        <i className="bi bi-box-arrow-left col-2 p-0"></i>
                        <span className="col-10 text-start">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    )
}