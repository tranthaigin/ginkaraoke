import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { GinKaraokeLogo } from '../components/GinKaraokeLogo';

const CONTACT_EMAIL = 'quocthaitran26062005@gmail.com';

export function PrivacyPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Chính sách quyền riêng tư | GinKaraoke';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main className="privacy-page">
      <div className="privacy-atmosphere" aria-hidden="true" />

      <header className="privacy-topbar">
        <Link to="/" className="privacy-brand" aria-label="Về GinKaraoke">
          <GinKaraokeLogo size="sm" withText glow />
        </Link>
        <Link to="/" className="privacy-back-link">
          <ArrowLeft size={17} />
          <span>Về ứng dụng</span>
        </Link>
      </header>

      <article className="privacy-document">
        <section className="privacy-hero">
          <div className="privacy-hero-icon"><ShieldCheck size={32} /></div>
          <p className="eyebrow">GIN KARAOKE · QUYỀN RIÊNG TƯ</p>
          <h1>Chính sách quyền riêng tư</h1>
          <p className="privacy-lead">
            Chính sách này giải thích GinKaraoke nhận, sử dụng, lưu trữ và chia sẻ dữ liệu nào khi
            bạn đăng nhập bằng Google và sử dụng các tính năng karaoke theo nhóm.
          </p>
          <p className="privacy-updated">Cập nhật lần cuối: 19 tháng 9 năm 2026</p>
        </section>

        <div className="privacy-summary-grid" aria-label="Tóm tắt quyền riêng tư">
          <div className="privacy-summary-card">
            <LockKeyhole size={22} />
            <strong>Đăng nhập an toàn</strong>
            <span>Google OAuth được xử lý thông qua Supabase Auth.</span>
          </div>
          <div className="privacy-summary-card">
            <EyeOff size={22} />
            <strong>Không quảng cáo</strong>
            <span>Không có SDK quảng cáo hoặc công cụ phân tích hành vi trong ứng dụng.</span>
          </div>
          <div className="privacy-summary-card">
            <Users size={22} />
            <strong>Chia sẻ theo nhóm</strong>
            <span>Thông tin karaoke chỉ hiển thị cho thành viên phù hợp trong nhóm.</span>
          </div>
        </div>

        <section className="privacy-section">
          <div className="privacy-section-heading">
            <UserRound size={22} />
            <h2>1. Dữ liệu nhận khi đăng nhập bằng Google</h2>
          </div>
          <p>
            GinKaraoke sử dụng Google OAuth thông qua Supabase Auth. Tùy thông tin bạn đã cung cấp
            cho Google và màn hình đồng ý của Google, ứng dụng có thể nhận các dữ liệu hồ sơ cơ bản:
          </p>
          <ul>
            <li>mã định danh tài khoản do hệ thống xác thực cung cấp;</li>
            <li>tên hiển thị;</li>
            <li>địa chỉ email;</li>
            <li>ảnh đại diện, nếu tài khoản Google có cung cấp.</li>
          </ul>
          <div className="privacy-callout">
            GinKaraoke không nhận hoặc lưu mật khẩu Google của bạn. Việc nhập thông tin đăng nhập và
            xác minh danh tính diễn ra trên hệ thống của Google và Supabase Auth.
          </div>
        </section>

        <section className="privacy-section">
          <div className="privacy-section-heading">
            <Database size={22} />
            <h2>2. Dữ liệu được tạo khi sử dụng GinKaraoke</h2>
          </div>
          <p>Để cung cấp chức năng của ứng dụng, GinKaraoke lưu những dữ liệu gắn với hoạt động của bạn:</p>
          <ul>
            <li>tên hiển thị và ảnh đại diện trong hồ sơ GinKaraoke;</li>
            <li>nhóm, mã tham gia nhóm, vai trò và quan hệ thành viên;</li>
            <li>danh sách bài hát, nghệ sĩ, trạng thái yêu thích và mức ưu tiên của bạn;</li>
            <li>phiên karaoke, người tham dự, các lượt đề xuất và hàng đợi bài hát;</li>
            <li>người hoặc cặp ca sĩ được chọn, chế độ lấy bài, trạng thái đã hát/chờ hát và thống kê phiên hát.</li>
          </ul>
          <p>
            Trình duyệt lưu phiên đăng nhập do Supabase quản lý và mã nhóm bạn chọn gần nhất để khôi
            phục trải nghiệm. PWA cũng có thể cache các tệp giao diện tĩnh. GinKaraoke không dùng
            LocalStorage làm cơ sở dữ liệu thay thế cho dữ liệu karaoke trên cloud.
          </p>
        </section>

        <section className="privacy-section">
          <div className="privacy-section-heading">
            <ShieldCheck size={22} />
            <h2>3. Mục đích sử dụng dữ liệu</h2>
          </div>
          <p>Dữ liệu trên được sử dụng để:</p>
          <ul>
            <li>xác thực tài khoản, duy trì phiên đăng nhập và bảo vệ quyền truy cập;</li>
            <li>hiển thị hồ sơ của bạn trong các nhóm mà bạn tham gia;</li>
            <li>quản lý playlist cá nhân, nhóm và lịch sử karaoke;</li>
            <li>tìm bài hát chung và tạo cặp hợp lệ, hoặc bốc bài ngẫu nhiên khi bạn chọn chế độ này;</li>
            <li>đồng bộ thay đổi giữa các thành viên và thiết bị trong cùng phiên hát.</li>
          </ul>
          <p>GinKaraoke không bán dữ liệu cá nhân và không sử dụng dữ liệu để phân phối quảng cáo.</p>
        </section>

        <section className="privacy-section">
          <div className="privacy-section-heading">
            <Database size={22} />
            <h2>4. Lưu trữ và xử lý qua Supabase</h2>
          </div>
          <p>
            Dữ liệu xác thực và dữ liệu ứng dụng được lưu trữ, xử lý thông qua Supabase. Supabase Auth
            quản lý danh tính và phiên đăng nhập; PostgreSQL của Supabase lưu hồ sơ, nhóm, playlist và
            phiên karaoke; Supabase Realtime hỗ trợ đồng bộ những thay đổi cần thiết.
          </p>
          <p>
            Các bảng dữ liệu áp dụng Row Level Security. Quyền truy cập được xác định từ tài khoản đã
            xác thực và tư cách thành viên nhóm, thay vì chỉ dựa vào mã mời nhóm.
          </p>
        </section>

        <section className="privacy-section">
          <div className="privacy-section-heading">
            <Users size={22} />
            <h2>5. Dữ liệu hiển thị cho thành viên khác</h2>
          </div>
          <p>
            Các thành viên trong cùng nhóm có thể xem tên, ảnh đại diện, các bài hát liên quan đến
            hoạt động chung, danh sách người tham dự, hàng đợi và lịch sử phiên karaoke. Điều này cần
            thiết để tìm hoặc bốc bài và phân công người hát. Người không thuộc nhóm không được cấp quyền
            đọc dữ liệu nhóm qua chính sách truy cập của cơ sở dữ liệu.
          </p>
          <p>
            Google và Supabase xử lý dữ liệu trong phạm vi cung cấp dịch vụ xác thực/hạ tầng của họ.
            GitHub Pages chỉ phân phối phần giao diện web tĩnh; cơ sở dữ liệu GinKaraoke không được lưu
            trong repository GitHub Pages.
          </p>
        </section>

        <section className="privacy-section">
          <div className="privacy-section-heading">
            <LockKeyhole size={22} />
            <h2>6. Lưu giữ, bảo mật và lựa chọn của bạn</h2>
          </div>
          <p>
            Dữ liệu được giữ để tài khoản, playlist, nhóm và lịch sử của bạn tiếp tục hoạt động. Bạn có
            thể chỉnh sửa hồ sơ, quản lý playlist, rời nhóm khi vai trò cho phép và đăng xuất khỏi ứng
            dụng. Nếu muốn yêu cầu xem xét hoặc xóa dữ liệu tài khoản mà giao diện hiện chưa hỗ trợ,
            hãy liên hệ nhà phát triển theo địa chỉ bên dưới.
          </p>
          <p>
            GinKaraoke sử dụng HTTPS, Supabase Auth và chính sách truy cập ở cấp cơ sở dữ liệu để giảm
            rủi ro truy cập trái phép. Không hệ thống Internet nào có thể bảo đảm an toàn tuyệt đối.
          </p>
        </section>

        <section className="privacy-section privacy-contact-section">
          <div className="privacy-section-heading">
            <Mail size={22} />
            <h2>7. Liên hệ</h2>
          </div>
          <p>
            Nếu bạn có câu hỏi về chính sách này hoặc muốn gửi yêu cầu liên quan đến dữ liệu cá nhân,
            hãy liên hệ nhà phát triển GinKaraoke:
          </p>
          <a className="privacy-email" href={`mailto:${CONTACT_EMAIL}`}>
            <Mail size={18} /> {CONTACT_EMAIL}
          </a>
        </section>

        <footer className="privacy-footer">
          <span>© 2026 GinKaraoke</span>
          <Link to="/">Trở về ứng dụng</Link>
        </footer>
      </article>
    </main>
  );
}
