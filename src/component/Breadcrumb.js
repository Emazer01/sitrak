import * as React from "react";
import { Link } from "react-router-dom";

/**
 * Komponen Breadcrumb Path Bar terstandar untuk semua halaman SITRAK.
 * 
 * Props:
 * - items: Array<{ label: string, path?: string, icon?: string, active?: boolean }>
 * - rightContent: ReactNode (opsional, tombol aksi cepat, badge status, info)
 */
export const Breadcrumb = ({ items = [], rightContent = null }) => {

  return (
    <div className="bg-body-secondary bg-opacity-75 px-3 py-2 border-bottom border-secondary border-opacity-10 d-flex align-items-center justify-content-between flex-wrap gap-2 small">
      <nav aria-label="breadcrumb" className="d-flex align-items-center text-truncate">
        <ol className="breadcrumb mb-0 align-items-center flex-nowrap text-truncate" style={{ fontSize: "0.85rem" }}>
          <li className="breadcrumb-item d-flex align-items-center">
            <Link
              to="/"
              className="text-decoration-none text-secondary d-flex align-items-center"
              title="Dashboard SITRAK"
            >
              <i className="bi bi-house-door-fill me-1 text-primary"></i>
              <span className="fw-semibold">SITRAK</span>
            </Link>
          </li>
          {items.map((item, index) => {
            const isLast = index === items.length - 1 || item.active;
            return (
              <li
                key={index}
                className={`breadcrumb-item d-flex align-items-center text-truncate ${isLast ? "active text-dark fw-semibold" : ""
                  }`}
                aria-current={isLast ? "page" : undefined}
              >
                {item.icon && <i className={`${item.icon} me-1 text-primary`}></i>}
                {!isLast && item.path ? (
                  <Link
                    to={item.path}
                    className="text-decoration-none text-secondary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-dark" : "text-secondary"}>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {rightContent && (
        <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
};

export default Breadcrumb;

