import React, { useState } from "react";
import { Send, Mail, MapPin, Phone, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { UserProfile } from "../types";

interface ContactProps {
  profile: UserProfile | null;
}

export default function Contact({ profile }: ContactProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Simple client validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setStatus({ success: false, message: "Vui lòng điền đầy đủ các thông tin bắt buộc." });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const resData = await response.json();
      if (resData.success) {
        setStatus({ success: true, message: resData.message });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus({ success: false, message: resData.message || "Không thể gửi tin nhắn." });
      }
    } catch (error) {
      setStatus({ success: false, message: "Lỗi đường truyền hệ thống. Vui lòng thử lại sau." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="relative py-20 border-t border-purple-500/10 bg-[#0a0518]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-cyan-400"></span>
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest">// CONTACT_GATEWAY</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            KẾT NỐI &amp; LIÊN HỆ
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Info Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <h3 className="font-sans font-black text-2xl text-white uppercase tracking-tight">
                GỬI THÔNG TIN LIÊN HỆ
              </h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Bạn đang muốn hợp tác trong các dự án phát triển sản phẩm web, lập trình chatbot, tích hợp AI, hay đơn giản là trò chuyện trao đổi kinh nghiệm học tập và công nghệ? Đừng ngần ngại để lại lời nhắn ở biểu mẫu bên cạnh! Tớ luôn sẵn sàng phản hồi và cùng bạn tạo ra những sản phẩm tuyệt vời nhất.
              </p>
            </div>

            {/* Comms card stack */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4 bg-gray-950/45 border border-purple-500/10 p-4 rounded-lg">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-mono text-[9px] text-gray-500 tracking-wider">SECURE_EMAIL</span>
                  <p className="font-sans font-semibold text-sm text-white">
                    {profile?.email || "toi05022020@gmail.com"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-gray-950/45 border border-purple-500/10 p-4 rounded-lg">
                <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded text-pink-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-mono text-[9px] text-gray-500 tracking-wider">LOCATION_COORDS</span>
                  <p className="font-sans font-semibold text-sm text-white">
                    {profile?.address || "Hanoi, Vietnam"}
                  </p>
                </div>
              </div>
            </div>

            {/* Futuristic terminal warning quote */}
            <div className="border border-yellow-500/20 bg-yellow-500/5 p-4 rounded text-yellow-400 font-mono text-[10px] space-y-1">
              <p className="font-bold">// SECURE TRANSMISSION ENABLED</p>
              <p className="text-gray-500">Mọi thông tin liên hệ gửi tới sẽ được bảo mật và lưu trữ an toàn trên cơ sở dữ liệu của hệ thống. Tớ cam kết tôn trọng quyền riêng tư và sẽ phản hồi qua email của bạn sớm nhất có thể!</p>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7">
            <div className="relative group">
              {/* Glow backdrop */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-400 rounded-lg opacity-25 group-hover:opacity-35 transition-opacity duration-300 blur" />
              
              <div className="relative bg-[#0c0721]/90 border border-purple-500/20 p-6 sm:p-8 rounded-lg backdrop-blur-md">
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Họ và tên của bạn *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded font-sans text-xs text-white focus:outline-none transition-all duration-250"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Địa chỉ Email liên hệ *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded font-sans text-xs text-white focus:outline-none transition-all duration-250"
                        placeholder="nguyenvana@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Tiêu đề tin nhắn *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded font-sans text-xs text-white focus:outline-none transition-all duration-250"
                      placeholder="Hợp tác dự án / Trao đổi công nghệ / Góp ý kiến..."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Nội dung lời nhắn gửi *
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-black/60 border border-gray-800 focus:border-cyan-400 rounded font-sans text-xs text-white focus:outline-none transition-all duration-250 resize-none"
                      placeholder="Ví dụ: 'Chào Duy, mình rất ấn tượng với portfolio của bạn. Mình muốn trao đổi thêm về một dự án phát triển web...'"
                      required
                    />
                  </div>

                  {/* Submit and status row */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Status alerts */}
                    <div className="flex-1 w-full">
                      {status && (
                        <div
                          className={`flex items-start space-x-2.5 p-3.5 rounded text-xs font-sans ${
                            status.success
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                              : "bg-pink-500/10 border border-pink-500/30 text-pink-400"
                          }`}
                        >
                          {status.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <span>{status.message}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto relative group px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black bg-pink-400 rounded cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <Send className="w-4 h-4 animate-pulse" />
                        {loading ? "ĐANG GỬI..." : "GỬI LỜI NHẮN ✉️"}
                      </span>
                      <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0" />
                    </button>
                  </div>

                </form>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
