export const Navbar = () => {
    return (
        <nav className="navbar navbar-expand-lg bg-dark navbar-dark d-block d-md-none font-poppins sticky-top border-bottom border-secondary border-opacity-25 shadow-sm">
            <div className="container-fluid px-3 py-1">
                {/* Brand / Logo */}
                <a className="navbar-brand text-white d-flex align-items-center" href="/">
                    <img
                        src="/SITRAK Tactical Analytics Emblem.png"
                        alt="SITRAK Logo"
                        height="48"
                        className="d-inline-block align-text-top rounded p-1 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25"
                    />
                </a>

                {/* Mobile Toggler */}
                <button
                    className="navbar-toggler border-secondary border-opacity-50 shadow-none"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Collapsible Content */}
                <div className="collapse navbar-collapse mt-2 pt-2 border-top border-secondary border-opacity-25" id="navbarSupportedContent">
                    <div className="px-2 mb-2">
                        <small
                            className="text-secondary text-uppercase fw-bold"
                            style={{ fontSize: "11px", letterSpacing: "1px" }}
                        >
                            Navigasi Menu
                        </small>
                    </div>

                    <ul className="nav nav-pills flex-column mb-auto pb-2">
                        <li className="mb-2">
                            <a
                                href="/"
                                id="nav-btn-dashboard"
                                className="sidebar-link sidebar-active p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                            >
                                <i className="bi bi-house-door-fill px-2 text-primary fs-5" />
                                <span className="fw-medium">Dashboard</span>
                            </a>
                        </li>
                        <li className="mb-2">
                            <a
                                href="/latihan"
                                id="nav-btn-latihan"
                                className="sidebar-link p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                            >
                                <i className="bi bi-bullseye px-2 text-primary fs-5" />
                                <span className="fw-medium">Latihan</span>
                            </a>
                        </li>
                        <li className="mb-2">
                            <a
                                href="/riwayat"
                                id="nav-btn-riwayat"
                                className="sidebar-link p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                            >
                                <i className="bi bi-file-earmark-text-fill px-2 text-primary fs-5" />
                                <span className="fw-medium">Data Personel</span>
                            </a>
                        </li>
                        <li className="mb-2">
                            <a
                                href="/pengaturan"
                                id="nav-btn-pengaturan"
                                className="sidebar-link p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                            >
                                <i className="bi bi-gear-fill px-2 text-primary fs-5" />
                                <span className="fw-medium">Pengaturan</span>
                            </a>
                        </li>
                    </ul>

                    {/* User Profile & Logout */}
                    <div className="pt-2 border-top border-secondary border-opacity-25 mb-2">
                        <a
                            href="/user"
                            id="navbar-username"
                            className="sidebar-link p-2 mb-2 text-decoration-none font-poppins text-white d-flex align-items-center rounded-2 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25"
                        >
                            <i className="bi bi-person-circle px-2 text-info fs-5" />
                            <span className="fw-medium text-truncate flex-grow-1" id="isi-navbar-username">
                                My Profile
                            </span>
                            <span
                                className="badge bg-success-subtle text-success border border-success me-1"
                                style={{ fontSize: "10px" }}
                            >
                                Online
                            </span>
                        </a>

                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="btn btn-outline-danger w-100 p-2 d-flex align-items-center justify-content-center font-poppins rounded-2 shadow-sm mt-2"
                        >
                            <i className="bi bi-box-arrow-left me-2"></i>
                            <span className="fw-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};