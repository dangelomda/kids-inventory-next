// src/components/AdminPanel.js

'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image'; // MUDANÇA: Importa o componente de Imagem

export default function AdminPanel({ visible, onClose, isAdmin }) {
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // Carrega a lista de perfis
  async function load() {
    if (!isAdmin) return;
    setBusy(true);
    // select('*') agora vai incluir a nova coluna 'avatar_url' que criamos
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email');

    setBusy(false);
    if (error) return alert(error.message);
    setRows(data || []);
  }

  useEffect(() => {
    if (visible) {
      load();
    }
  }, [visible, isAdmin]);

  // Convida/ativa usuário via Edge Function
  async function handleInvite() {
    if (!isAdmin) return alert('Apenas admin.');
    if (!email.includes('@')) return alert('E-mail inválido');

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-invite', {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) {
        // erro 404 ou outro non-2xx → data vem do JSON da função
        const errorData = await error.context.json();
        alert(errorData.message || 'Erro inesperado. Verifique se o usuário já fez login pelo menos uma vez.');
      } else if (data?.error) {
        // erro explícito vindo da função
        alert(data.message || data.error);
      } else {
        // sucesso
        alert(data?.message || `Usuário ${email} adicionado como membro!`);
        setEmail('');
        load();
      }
    } catch (err) {
      alert(err.message || 'Ocorreu um erro ao chamar a função.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p) {
    const { error } = await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id);
    if (error) return alert(error.message);
    load();
  }

  async function promote(p) {
    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', p.id);
    if (error) return alert(error.message);
    load();
  }

  async function demote(p) {
    const { error } = await supabase.from('profiles').update({ role: 'member' }).eq('id', p.id);
    if (error) return alert(error.message);
    load();
  }

  async function remove(p) {
    if (confirm(`Remover ${p.email}?`)) {
      const { error } = await supabase.from('profiles').delete().eq('id', p.id);
      if (error) return alert(error.message);
      load();
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Painel Admin</h3>
        <button onClick={onClose}>Fechar</button>
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--bg)' }}>
        <h4>Adicionar usuário (pré-cadastro)</h4>
        <input
          placeholder="email@dominio"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <div className="actions">
          <button disabled={busy} onClick={handleInvite}>
            Adicionar/Ativar
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--bg)' }}>
        <h4>Perfis</h4>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {/* MUDANÇA: Adicionada coluna Avatar */}
                <th style={{width: '50px'}}>Avatar</th>
                <th>Email</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  {/* MUDANÇA: Adicionada a célula com a imagem */}
                  <td>
                    {p.avatar_url && (
                      <Image
                        src={p.avatar_url}
                        alt="Avatar"
                        width={32}
                        height={32}
                        className={`avatar-img avatar-border-${p.role || 'visitor'}`}
                      />
                    )}
                  </td>
                  <td>{p.email}</td>
                  <td>
                    <span className={`role-badge ${p.role}`}>{p.role}</span>
                  </td>
                  <td>{p.active ? 'ATIVO' : 'INATIVO'}</td>
                  <td style={{ display: 'flex', justifyContent: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
                    <button className="secondary" onClick={() => toggle(p)}>
                      {p.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button className="promote" onClick={() => promote(p)}>Admin</button>
                    <button className="secondary" onClick={() => demote(p)}>Membro</button>
                    <button className="danger" onClick={() => remove(p)}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}