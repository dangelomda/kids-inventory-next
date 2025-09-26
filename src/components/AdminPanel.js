// src/components/AdminPanel.js

'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPanel({ visible, onClose, isAdmin }) {
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // Carrega a lista de perfis
  async function load() {
    if (!isAdmin) return;
    setBusy(true);
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

    // Se deu erro de rede/config
    if (error) {
      alert(data?.message || data?.error || error.message || 'Erro inesperado ao convidar usuário.');
    }
    // Se a função respondeu com erro no corpo
    else if (data?.error) {
      if (data.error === 'Usuário não encontrado') {
        // 👇 Mensagem amigável no caso de 404
        alert(data.message || 'É necessário que o usuário faça login pelo menos uma vez antes de ser convidado.');
      } else {
        alert(data.message || data.error);
      }
    }
    // Sucesso
    else {
      alert(data?.message || `Usuário ${email} promovido a membro com sucesso!`);
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
                <th>Email</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
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
