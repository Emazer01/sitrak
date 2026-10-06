export const Sidebar = () => {
    return (
        <div
            className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white sidebar shadow sticky-top col-3 col-md-2 d-none d-md-flex border-end border-secondary border-opacity-25"
            style={{ height: "100vh" }}
        >
            {/* Emblem / Brand Header */}
            <a
                href="/"
                className="d-flex align-items-center mb-3 text-white text-decoration-none p-2 rounded-3 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25 shadow-sm"
            >
                <img
                    src="/SITRAK Tactical Target Emblem.png"
                    alt="SITRAK Emblem"
                    className="img-fluid w-100 rounded"
                />
            </a>

            {/* Label Navigasi */}
            <div className="px-2 mb-2">
                <small
                    className="text-secondary text-uppercase fw-bold"
                    style={{ fontSize: "11px", letterSpacing: "1px" }}
                >
                    Navigasi Utama
                </small>
            </div>

            {/* Menu Navigasi */}
            <ul className="nav nav-pills flex-column mb-auto">
                <li className="mb-2">
                    <a
                        href="/"
                        id="btn-dashboard"
                        className="sidebar-link sidebar-active p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                    >
                        <i className="bi bi-house-door-fill px-2 text-primary fs-5" />
                        <span className="fw-medium">Dashboard</span>
                    </a>
                </li>
                <li className="mb-2">
                    <a
                        href="/latihan"
                        id="btn-latihan"
                        className="sidebar-link p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                    >
                        <i className="bi bi-bullseye px-2 text-primary fs-5" />
                        <span className="fw-medium">Latihan</span>
                    </a>
                </li>
                <li className="mb-2">
                    <a
                        href="/pengaturan"
                        id="btn-pengaturan"
                        className="sidebar-link p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2"
                    >
                        <i className="bi bi-gear-fill px-2 text-primary fs-5" />
                        <span className="fw-medium">Pengaturan</span>
                    </a>
                </li>
            </ul>

            {/* User Profile & Logout */}
            <div className="mt-auto pt-3 border-top border-secondary border-opacity-25">
                <a
                    href="/user"
                    id="sidebar-username"
                    className="sidebar-link p-2 mb-2 text-decoration-none font-poppins text-white d-flex align-items-center rounded-2 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25"
                >
                    <i className="bi bi-person-circle px-2 text-info fs-5" />
                    <span className="fw-medium text-truncate flex-grow-1" id="isi-sidebar-username">
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
                    className="btn btn-outline-danger w-100 p-2 d-flex align-items-center justify-content-center font-poppins rounded-2 shadow-sm"
                >
                    <i className="bi bi-box-arrow-left me-2"></i>
                    <span className="fw-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};