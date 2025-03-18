import styles from "./Login.module.scss";
import classNames from "classnames/bind";
const cx = classNames.bind(styles);
function Login() {
  return (
    <div className={cx("wapper")}>
      <div className={cx("container")}>
        <div className={cx("row", "justify-content-center")}>
          <div className={cx("col-md-6", "col-lg-4")}>
            <div className={cx("login-box")}>
              <div className={cx("logo")}>🔵 H&H</div>
              <h2 className={cx("welcome-text")}>Welcome</h2>
              <form>
                <div className={cx("mb-3", "input-group")}>
                  <span className={cx("input-group-text")}>
                    <i className={cx("fas", "fa-user")}></i>
                  </span>
                  <input
                    type="email"
                    className={cx("form-control")}
                    placeholder="Email or Phone number"
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
                <button
                  type="submit"
                  className={cx("btn", "btn-custom", "w-100")}
                >
                  Sign in
                </button>
                <div
                  className={cx("d-flex", "justify-content-between", "mt-2")}
                >
                  <a
                    href="./register.html"
                    className={cx("text-decoration-none")}
                  >
                    Don't have an account?
                  </a>
                  <a href="#" className={cx("text-decoration-none")}>
                    Forgot password?
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

export default Login;
