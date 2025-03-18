import styles from "./Header.module.scss";
import classNames from "classnames/bind";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
const cx = classNames.bind(styles);
function Header() {
  return (
    <header>
      <nav
        className={cx("navbar navbar-light px-4 fixed-top navbar-custom")}
        style={{
          backgroundColor: "#f8f9fa",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <a
          className={cx("navbar-brand fw-bold text-primary logo")}
          href="#"
          style={{ fontSize: "35px" }}
        >
          H&amp;H
        </a>

        <div>
          <button className={cx("btn btn-light text-primary")}>
            <FontAwesomeIcon
              icon={faCartShopping}
              className={cx("icon-button")}
            />
          </button>

          <button className={cx("btn btn-light text-primary")}>
            Đăng nhập/Đăng ký
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;
