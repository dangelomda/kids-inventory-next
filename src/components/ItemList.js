// src/components/ItemList.js

'use client';
import { useMemo } from 'react';

export default function ItemList({ items, canWrite, onEdit, onDelete, onImageClick }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [items]
  );

  return (
    <div className="item-grid">
      {sorted.length === 0 && <div className="card">Nenhum item encontrado.</div>}
      {sorted.map(item => (
        // MUDANÇA: Adicionado um id único para cada card da lista
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
              <button className="danger" onClick={() => onDelete(item)}>🗑️ Excluir</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
