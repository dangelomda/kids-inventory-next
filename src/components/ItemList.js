// src/components/ItemList.js

'use client';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Define o nome correto do seu bucket de imagens
const BUCKET_NAME = 'item-photos';

// Função auxiliar para extrair a chave da URL, caso 'photo_key' não esteja disponível
function getKeyFromUrl(url) {
  try {
    if (!url) return null;
    const urlPath = new URL(url).pathname;
    // O caminho é /storage/v1/object/public/BUCKET_NAME/key
    const key = urlPath.substring(urlPath.indexOf(BUCKET_NAME) + BUCKET_NAME.length + 1);
    return key;
  } catch (error) {
    console.error("Erro ao extrair a chave da URL:", error);
    return null;
  }
}

export default function ItemList({ items, canWrite, onEdit, onDelete, onImageClick }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [items]
  );

  async function handleDelete(item) {
    if (!canWrite) return alert('Sem permissão.');
    if (!confirm(`Excluir "${item.name}"? Esta ação não pode ser desfeita.`)) return;

    try {
      // Prioriza a photo_key, mas usa a URL como alternativa para garantir a exclusão
      const photoKey = item.photo_key || getKeyFromUrl(item.photo_url);

      // 1. Remove a foto do storage do bucket CORRETO
      if (photoKey) {
        const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([photoKey]);
        if (storageError) {
          console.error("Erro ao remover a foto do storage:", storageError.message);
        }
      }

      // 2. Remove o registro do item do banco de dados
      const { error: dbError } = await supabase.from('items').delete().eq('id', item.id);
      if (dbError) throw dbError;

      // 3. Notifica o componente pai para recarregar a lista (no seu caso, é a função loadItems)
      if (onDelete) {
        onDelete(item);
      }
      
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  return (
    <div className="item-grid">
      {sorted.length === 0 && <div className="card">Nenhum item encontrado.</div>}
      {sorted.map(item => (
        <div className="item-card" key={item.id} id={`item-${item.id}`}>
          {item.photo_url && (
            <img
              src={item.photo_url}
              alt={item.name}
              onClick={() => onImageClick(item.photo_url)}
            />
          )}
          <div className="item-card-content">
            <h3>{item.name}</h3>
            <div><b>Qtd:</b> {item.quantity}</div>
            <div><b>Local:</b> {item.location}</div>
          </div>

          {canWrite && (
            <div className="actions">
              <button onClick={() => onEdit(item)}>✏️ Editar</button>
              <button className="danger" onClick={() => handleDelete(item)}>🗑️ Excluir</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}