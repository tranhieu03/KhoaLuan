import styles from "./Register.module.scss";
import classNames from "classnames/bind";
const cx = classNames.bind(styles);
function Register() {
  return (
    <div className={cx("wapper")}>
      <div className={cx("container")}>
        <div className={cx("row", "justify-content-center")}>
          <div className={cx("col-md-6", "col-lg-4")}>
            <div className={cx("register-box")}>
              <div className={cx("logo")}>🔵 H&H</div>
              <h2>Create an Account</h2>
              <form>
                <div className={cx("mb-3", "input-group")}>
                  <span className={cx("input-group-text")}>
                    <i className={cx("fas", "fa-user")}></i>
                  </span>
                  <input
                    type="text"
                    className={cx("form-control")}
                    placeholder="Full Name"
                    required
                  />
                </div>
                <div className={cx("mb-3", "input-group")}>
                  <span className={cx("input-group-text")}>
                    <i className={cx("fas", "fa-envelope")}></i>
                  </span>
                  <input
                    type="email"
                    className={cx("form-control")}
                    placeholder="Email"
                    required
                  />
                </div>
                <div className={cx("mb-3", "input-group")}>
                  <span className={cx("input-group-text")}>
                    <i className={cx("fas", "fa-lock")}></i>
                  </span>
                  <input
                    type="password"
                    className={cx("form-control")}
                    placeholder="Password"
                    required
                  />
                </div>
                <div className={cx("mb-3", "input-group")}>
                  <span className={cx("input-group-text")}>
                    <i className={cx("fas", "fa-user-tag")}></i>
                  </span>
                  <select className={cx("form-control")} required>
                    <option value="">Select Role</option>
                    <option value="User">User</option>
                    <option value="Driver">Driver</option>
                    <option value="Seller">Seller</option>
                  </select>
                </div>
                <div className={cx("mb-3", "input-group")}>
                  <span className={cx("input-group-text")}>
                    <i className={cx("fas", "fa-phone")}></i>
                  </span>
                  <input
                    type="text"
                    className={cx("form-control")}
                    placeholder="Phone Number"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={cx("btn", "btn-custom", "w-100")}
                  style={{ backgroundColor: "#4d8ef7", color: "white" }}
                >
                  Register
                </button>

                <div className={cx("mt-2")}>
                  <a
                    href="#"
                    className={cx("text-decoration-none", "text-primary")}
                  >
                    Already have an account? Sign in
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
