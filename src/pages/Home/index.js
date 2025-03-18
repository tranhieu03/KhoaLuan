import styles from "./Home.module.scss";
import classNames from "classnames/bind";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping, faLeaf } from "@fortawesome/free-solid-svg-icons";
import images from "../../assests/images";
const cx = classNames.bind(styles);
const categories = [
  { image: images.nuocngot, name: "Đồ uống lạnh" },
  { image: images.trasua, name: "Trà sữa" },
  { image: images.garan, name: "Gà rán" },
  { image: images.my, name: "Mì Ý" },
  { image: images.comtam, name: "Cơm tấm" },
  { image: images.bunthitnuong, name: "Bún thịt nướng" },
  { image: images.steak, name: "Steak" },
  { image: images.banh_mi, name: "Bánh mì" },
];
function Home() {
  return (
    <div>
      <div className={cx("hero-section")}>
        <img
          src={images.header_image}
          alt="logo"
          className={cx("overlay")}
        ></img>
      </div>
      <div className={cx("container", "my-4")}>
        <div className={cx("row", "mt-3")}>
          {[
            {
              img: images.banh_mi,
              title: "BÁNH MÌ & XÔI - THANH QUYỀN",
              desc: "Bánh Mì - Xôi",
              rating: "4.7",
              time: "30 phút",
              distance: "4,1 km",
              promo: "🏷 Bánh mì thập cẩm đặc biệt Giảm 8%",
            },
            {
              img: "fried-chicken",
              title: "Gà rán FKT KingBui92",
              desc: "Thức ăn nhanh",
              rating: "4.8",
              time: "20 phút",
              distance: "0,9 km",
              promo: "🌟 Quán ngon 22K",
            },
            {
              img: "noodles",
              title: "Xuân Food - Mì Trộn Indomie - Ao Sen",
              desc: "Mì",
              rating: "4.7",
              time: "25 phút",
              distance: "2,4 km",
              promo: "🌟 Quán ngon 22K",
            },
            {
              img: "sandwich",
              title: "Bánh Mì Sài Gòn - 21 Triệu Khúc",
              desc: "Bánh Mì - Xôi",
              rating: "3.9",
              time: "25 phút",
              distance: "3,2 km",
              promo: "🌟 Quán ngon 22K",
            },
          ].map((item, index) => (
            <div key={index} className={cx("col-md-3")}>
              <div
                className={cx(
                  "card",
                  "food-card",
                  "shadow-sm",
                  "position-relative"
                )}
              >
                <span className={cx("promo-badge")}>Promo</span>
                <img src={item.img} alt={item.title} />
                <div className={cx("card-body")}>
                  <h6 className={cx("fw-bold")}>{item.title}</h6>
                  <p className={cx("text-muted", "mb-1")}>{item.desc}</p>
                  <p className={cx("mb-1")}>
                    <span className={cx("rating")}>★ {item.rating}</span> · ⏳{" "}
                    {item.time} · 📍 {item.distance}
                  </p>
                  <p className={cx("text-success")}>{item.promo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cx("text-center", "mt-3")}>
        <button className={cx("btn", "btn-outline-secondary")}>
          See all promotions
        </button>
      </div>
      {/* ----------------------------------- */}
      <h2 className={cx("fw-bold text-center")}>
        There's something for everyone!
      </h2>
      <div className={cx("container my-5 text-center")}>
        <div className={cx("row justify-content-center mt-4")}>
          {categories.map((item, index) => (
            <div key={index} className={cx("col-md-3")}>
              <div className={cx("category-card")}>
                <img src={item.image} alt={item.name} />
                <p className={cx("category-name")}>{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cx("container my-5")}>
        <h2 className={cx("text-center")}>Vì sao bạn nên đặt hàng trên H&H?</h2>
        <div className={cx("row mt-4")}>
          <div className={cx("col-md-6")}>
            <h5>Nhanh nhất</h5>
            <p>
              H&H cung cấp dịch vụ giao đồ ăn nhanh chóng, giúp bạn tận hưởng
              bữa ăn mà không phải chờ đợi lâu.
            </p>
          </div>
          <div className={cx("col-md-6")}>
            <h5>Dễ dàng nhất</h5>
            <p>
              Chỉ với vài thao tác đơn giản trên ứng dụng H&H, bạn có thể đặt
              món yêu thích một cách nhanh chóng và tiện lợi.
            </p>
          </div>
          <div className={cx("col-md-6")}>
            <h5>Đáp ứng mọi nhu cầu</h5>
            <p>
              Từ các món ăn địa phương đến những thương hiệu nhà hàng nổi tiếng,
              H&H mang đến hàng ngàn lựa chọn hấp dẫn.
            </p>
          </div>
          <div className={cx("col-md-6")}>
            <h5>Thanh toán linh hoạt</h5>
            <p>
              H&H hỗ trợ nhiều phương thức thanh toán, từ tiền mặt đến ví điện
              tử, giúp việc đặt món trở nên dễ dàng hơn bao giờ hết.
            </p>
          </div>
          <div className={cx("col-md-12")}>
            <h5>Nhiều ưu đãi hơn</h5>
            <p>
              Tích điểm thưởng H&H Rewards cho mỗi đơn hàng và đổi lấy những ưu
              đãi hấp dẫn dành riêng cho bạn.
            </p>
          </div>
        </div>

        <h2 className={cx("text-center mt-5")}>Những câu hỏi thường gặp</h2>
        <div className={cx("accordion", "mt-4")} id="faqAccordion">
          <div className={cx("accordion-item")}>
            <h2 className={cx("accordion-header")}>
              <div className={cx("accordion-title")}>H&H là gì?</div>
            </h2>
            <div id="faq1" className={cx("accordion-collapse", "show")}>
              <div className={cx("accordion-body")}>
                H&H là dịch vụ giao đồ ăn nhanh chóng, tiện lợi, giúp bạn tìm
                kiếm và đặt món từ hàng nghìn nhà hàng yêu thích trên khắp Việt
                Nam.
              </div>
            </div>
          </div>

          <div className={cx("accordion-item")}>
            <h2 className={cx("accordion-header")}>
              <div className={cx("accordion-title")}>
                Làm cách nào để đặt đồ ăn trên H&H?
              </div>
            </h2>
            <div id="faq2" className={cx("accordion-collapse", "show")}>
              <div className={cx("accordion-body")}>
                1. Nhập địa chỉ của bạn và duyệt danh sách nhà hàng gần nhất.{" "}
                <br />
                2. Chọn món yêu thích và thêm vào giỏ hàng. <br />
                3. Xác nhận đơn hàng, chọn phương thức thanh toán và nhấn “Đặt
                hàng ngay”. <br />
                4. Nhận thông báo xác nhận và chờ tài xế giao món đến tận nơi.
              </div>
            </div>
          </div>

          <div className={cx("accordion-item")}>
            <h2 className={cx("accordion-header")}>
              <div className={cx("accordion-title")}>
                H&H có cung cấp dịch vụ giao hàng 24/7 không?
              </div>
            </h2>
            <div id="faq3" className={cx("accordion-collapse", "show")}>
              <div className={cx("accordion-body")}>
                Có! Một số nhà hàng có thể có giờ hoạt động giới hạn, nhưng
                chúng tôi luôn có danh sách các đối tác phục vụ xuyên đêm.
              </div>
            </div>
          </div>

          <div className={cx("accordion-item")}>
            <h2 className={cx("accordion-header")}>
              <div className={cx("accordion-title")}>
                Tôi có thể thanh toán bằng tiền mặt không?
              </div>
            </h2>
            <div id="faq4" className={cx("accordion-collapse", "show")}>
              <div className={cx("accordion-body")}>
                Đương nhiên! H&H hỗ trợ cả thanh toán tiền mặt khi nhận hàng và
                thanh toán trực tuyến qua thẻ tín dụng, ví điện tử.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
