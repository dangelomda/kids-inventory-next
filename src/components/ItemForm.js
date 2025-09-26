// src/components/ItemForm.js

'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          URL.revokeObjectURL(url);
          resolve(compressedFile);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function makeKey() {
  const rnd = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  return `${rnd}-${Date.now()}.jpg`;
}

export default function ItemForm({ canWrite, onSaved, editing, setEditing }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [location, setLocation] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]); // 👈 sugestões
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name || '');
      setQuantity(editing.quantity || 0);
      setLocation(editing.location || '');
    } else {
      setName('');
      setQuantity(0);
      setLocation('');
    }
    setFile(null);
    setSuggestions([]);
  }, [editing]);

  async function uploadPhoto(fileToUpload) {
    const key = makeKey();
    const { error } = await supabase.storage.from('item-photos').upload(key, fileToUpload);
    if (error) throw error;
    const { data } = supabase.storage.from('item-photos').getPublicUrl(key);
    return { photo_key: key, photo_url: `${data.publicUrl}?v=${Date.now()}` };
  }

  // 👇 Busca sugestões de itens parecidos
  async function fetchSuggestions(value) {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    const { data, error } = await supabase
      .from('items')
      .select('id, name, location, quantity')
      .ilike('name', `%${value}%`)
      .limit(5);

    if (!error) setSuggestions(data || []);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) return alert('Faça login para cadastrar.');
    if (!name.trim()) return alert('O nome do item é obrigatório.');

    setBusy(true);
    try {
      const payload = { name: name.trim(), quantity: Number(quantity) || 0, location: location.trim() };
      if (file) {
        const compressed = await compressImage(file);
        const refs = await uploadPhoto(compressed);
        Object.assign(payload, refs);
      }

      let savedItemId = null;

      if (editing) {
        await supabase.from('items').update(payload).eq('id', editing.id);
        if (file && editing.photo_key) {
          await supabase.storage.from('item-photos').remove([editing.photo_key]);
        }
        savedItemId = editing.id;
      } else {
        // 👇 Verifica se já existe um item igual antes de cadastrar
        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('name', name.trim())
          .eq('location', location.trim())
          .maybeSingle();

        if (existing) {
          const confirmDup = confirm(
            `O item "${name}" já está cadastrado em "${location}". Deseja cadastrar mesmo assim?`
          );
          if (!confirmDup) {
            setBusy(false);
            return;
          }
        }

        await supabase.from('items').insert([payload]);
      }

      setEditing(null);
      onSaved(savedItemId);

    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
      <div className="form-group" style={{ position: 'relative' }}>
        <label htmlFor="name">Item:</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          required
          autoComplete="off"
        />
        {/* 👇 Sugestões de itens */}
        {suggestions.length > 0 && (
          <ul className="suggestions-box">
            {suggestions.map(s => (
              <li key={s.id} onClick={() => {
                setName(s.name);
                setSuggestions([]);
              }}>
                {s.name} — {s.location} ({s.quantity})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="quantity">Quantidade:</label>
        <input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="location">Local:</label>
        <input id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Foto:</label>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => {
            fileInputRef.current.removeAttribute('capture');
            fileInputRef.current.click();
          }}>
            Escolher da Galeria
          </button>
          <button type="button" className="secondary" onClick={() => {
            fileInputRef.current.setAttribute('capture', 'user');
            fileInputRef.current.click();
          }}>
            Usar Câmera
          </button>
        </div>
        {file && <p style={{ marginTop: '10px', fontSize: '14px' }}>Arquivo selecionado: {file.name}</p>}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={e => setFile(e.target.files?.[0] || null)}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      <div className="actions">
        <button type="submit" disabled={busy}>{editing ? 'Salvar Alterações' : 'Cadastrar'}</button>
        {editing && <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button>}
      </div>
    </form>
  );
}
