import { useState } from "react";

/**
 * Genera uma cor de fundo determinística baseada no nome do usuário.
 * A mesma pessoa sempre terá a mesma cor.
 */
function getAvatarColor(name: string): string {
  const palette = [
    "#E57373", "#F06292", "#BA68C8", "#9575CD",
    "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
    "#4DB6AC", "#81C784", "#AED581", "#FFD54F",
    "#FFB74D", "#FF8A65", "#A1887F", "#90A4AE",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Extrai as iniciais do usuário.
 * "Luan Ferreira Rosas" → "LF"
 * "Luan" → "L"
 */
function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (firstName) {
    const parts = firstName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return firstName[0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

interface UserAvatarProps {
  profileImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  /** Tamanho em px — padrão 64 */
  size?: number;
  className?: string;
}

/**
 * Avatar profissional do usuário.
 * Prioridade: foto do Google → iniciais coloridas → "?"
 *
 * A cor do fundo é determinística: sempre a mesma cor pra mesma pessoa.
 * Se a URL da foto quebrar (erro 403, expirada etc.), cai automaticamente nas iniciais.
 */
export function UserAvatar({
  profileImageUrl,
  firstName,
  lastName,
  email,
  size = 64,
  className = "",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const name = [firstName, lastName].filter(Boolean).join(" ") || email || "";
  const initials = getInitials(firstName, lastName, email);
  const bgColor = getAvatarColor(name || "user");

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
  };

  if (profileImageUrl && !imgError) {
    return (
      <img
        src={profileImageUrl}
        alt={name || "Usuário"}
        style={baseStyle}
        className={`object-cover border-2 border-white shadow-sm ${className}`}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  const fontSize = Math.round(size * 0.36);

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "0.05em",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        userSelect: "none",
      }}
      className={className}
      aria-label={name || "Avatar"}
    >
      {initials}
    </div>
  );
}
