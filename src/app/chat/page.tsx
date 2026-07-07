import ChatBox from "@/components/ChatBox";

export default function ChatPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 22px 0" }}>
      <h1 className="page-title">Derdinizi Anlatın</h1>
      <p className="page-sub" style={{ marginBottom: 24 }}>Yaşadığınız sorunu anlatın; gerekli bilgileri size soralım.</p>
      <ChatBox />
    </main>
  );
}
