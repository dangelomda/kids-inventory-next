'use client';
export default function AuthBadge({ email, role, active, onClick }){
const tag = active ? (role||'visitor').toUpperCase() : 'VISITANTE';
const dotClass = active ? (role||'visitor') : 'visitor';
return (
<div className="badge" onClick={onClick} title={email||'não logado'}>
<span className={`dot ${dotClass}`}></span>
<span>{email ? `${email} • ${tag}` : 'VISITANTE'}</span>
</div>
);
}