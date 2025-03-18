import styles from "./Footer.module.scss";
import classNames from "classnames/bind";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import {
  faInstagram,
  faSquareFacebook,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
const cx = classNames.bind(styles);

function Footer() {
  return (
    <footer
      className={cx("py-4")}
      style={{ backgroundColor: "#4d8ef7", color: "#ffffff" }} // Đặt màu chữ trắng cho toàn bộ footer
    >
      <div className={cx("container")}>
        <h2 style={{ color: "#ffffff" }}>H&H</h2>
        <div className={cx("row")}>
          <div className={cx("col-md-3")}>
            <ul className={cx("list-unstyled")}>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }} // Xám nhạt để dịu mắt
                >
                  Về H&H
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }}
                >
                  Về H&H Services
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }}
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div className={cx("col-md-3")}>
            <ul className={cx("list-unstyled")}>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }}
                >
                  Mở quán trên H&H
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }}
                >
                  Trở thành tài xế H&H
                </a>
              </li>
            </ul>
          </div>
          <div className={cx("col-md-3")}>
            <ul className={cx("list-unstyled")}>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }}
                >
                  Trung tâm hỗ trợ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={cx("text-decoration-none")}
                  style={{ color: "#e3eaf8" }}
                >
                  Câu hỏi thường gặp
                </a>
              </li>
            </ul>
          </div>
          <div className={cx("col-md-3", "social-icons")}>
            <FontAwesomeIcon icon={faSquareFacebook} />
            <FontAwesomeIcon icon={faInstagram} />
            <FontAwesomeIcon icon={faYoutube} />
            <FontAwesomeIcon icon={faXTwitter} />
          </div>
        </div>
        <hr className={cx("border-light")} />
        <div className={cx("row", "text-center")}>
          <div className={cx("col-md-12")}>
            <p className={cx("mb-0")} style={{ color: "#e3eaf8" }}>
              &copy; 2025 H&H |
              <a
                href="#"
                className={cx("text-decoration-none")}
                style={{ color: "#ffffff" }}
              >
                Câu hỏi thường gặp
              </a>
              |
              <a
                href="#"
                className={cx("text-decoration-none")}
                style={{ color: "#ffffff" }}
              >
                Chính sách bảo mật
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
