import Header from "./Header";
import Footer from "./Footer";
import styles from "./DefaltLayout.module.scss";
import classNames from "classnames/bind";
const cx = classNames.bind(styles);
function DefaltLayout({ children }) {
  return (
    <div className={cx("wapper")}>
      <Header />

      <div className={cx("content")}>{children}</div>

      <Footer />
    </div>
  );
}

export default DefaltLayout;
