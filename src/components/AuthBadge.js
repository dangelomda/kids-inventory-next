// src/components/AuthBadge.js

'use client';
import Image from 'next/image'; // Importa o componente de Imagem do Next.js

export default function AuthBadge({ email, role, active, onClick, avatarUrl }) {
  const tag = active ? (role || 'visitor').toUpperCase() : 'VISITANTE';
  const roleClass = active ? (role || 'visitor') : 'visitor';

  return (
    <div className="badge" onClick={onClick} title={email || 'não logado'}>
      {/* Se tiver a URL do avatar, mostra a imagem. Senão, mostra a bolinha. */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Avatar"
          width={24}
          height={24}
          className={`avatar-img avatar-border-${roleClass}`}
        />
      ) : (
        <span className={`dot ${roleClass}`}></span>
      )}
      <span>{email ? `${email} • ${tag}` : 'VISITANTE'}</span>
    </div>
  );
}