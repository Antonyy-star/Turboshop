import { Users } from "lucide-react";

export default function AdminCustomers() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Kunder</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Hantera registrerade kunder</p>
      </div>

      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
        <Users size={40} color="#333" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#555", fontSize: 15, marginBottom: 8 }}>Kundhantering kommer snart</p>
        <p style={{ color: "#444", fontSize: 13 }}>Lägg till ett registreringssystem för att visa kunder här.</p>
      </div>
    </div>
  );
}
