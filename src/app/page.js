// src/app/page.js

'use client';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AuthBadge from '@/components/AuthBadge';
import ItemForm from '@/components/ItemForm';
import ItemList from '@/components/ItemList';
import AdminPanel from '@/components/AdminPanel';
import * as XLSX from 'xlsx';
import Image from 'next/image';

export default function Page() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('visitor');
  const [active, setActive] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [scrollToItemId, setScrollToItemId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isBackToTopVisible, setBackToTopVisible] = useState(false);
  
  const formRef = useRef(null);
  const adminPanelRef = useRef(null);

  const isLogged = !!session?.user;
  const canWrite = active && ['member', 'admin'].includes(role);
  const isAdmin = active && role === 'admin';

  const refreshAuth = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.user?.id) {
      setSession(null);
      setRole('visitor');
      setActive(false);
      return;
    }
    const { data: prof, error } = await supabase
      .from('profiles')
      .select('role, active, avatar_url')
      .eq('id', s.user.id)
      .maybeSingle();
    setSession(s);
    if (!error && prof) {
      setRole(prof.role ?? 'visitor');
      setActive(!!prof.active);
    } else {
      setRole('visitor');
      setActive(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error loading items:', error);
    else setItems(data || []);
  }, []);

  const onDelete = useCallback(() => {
    loadItems();
  }, [loadItems]);

  const exportXlsx = useCallback(async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (!data?.length) return alert('Nenhum item para exportar.');
    
    const rows = data.map(item => ({
      'Item': item.name,
      'Quantidade': item.quantity,
      'Local': item.location,
      'Foto': item.photo_url 
        ? { t: 's', v: 'Ver Foto', l: { Target: item.photo_url, Tooltip: 'Clique para abrir a imagem' } } 
        : 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(rows, { cellStyles: true });
    ws['!cols'] = [{wch:40},{wch:15},{wch:30},{wch:15}];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventário');
    XLSX.writeFile(wb, 'inventario_kids.xlsx');
  }, []);

  const handleEditClick = (item) => {
    setEditing(item);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleItemSaved = (itemId) => {
    loadItems();
    if (itemId) {
      setScrollToItemId(itemId);
    }
  };

  useEffect(() => {
    refreshAuth();
    loadItems();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => { refreshAuth(); });
    const itemsChannel = supabase.channel('items-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, loadItems).subscribe();
    const profilesChannel = supabase.channel('profiles-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshAuth).subscribe();
    return () => {
      authListener?.subscription.unsubscribe();
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [refreshAuth, loadItems]);

  useEffect(() => {
    if (adminOpen) {
      setTimeout(() => {
        adminPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [adminOpen]);

  useEffect(() => {
    if (scrollToItemId && items.length > 0) {
      const element = document.getElementById(`item-${scrollToItemId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setScrollToItemId(null);
    }
  }, [scrollToItemId, items]);
  
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setBackToTopVisible(true);
      } else {
        setBackToTopVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  };

  const filteredItems = useMemo(
    () => items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="header">
        <div className="header-left" />
        <div className="header-center">
          <Image src="/logo.svg" alt="Attitude Kids Logo" width={180} height={45} className="main-logo" />
          <h1 className="header-title">Inventário Kids</h1>
        </div>
        <div className="header-right">
          {isLogged ? (
            <>
              <AuthBadge 
                email={session.user.email} 
                role={role} 
                active={active} 
                avatarUrl={session.user.user_metadata?.avatar_url}
              />
              {isAdmin && (
                <button onClick={() => setAdminOpen(v => !v)} className="header-admin-btn secondary">
                  Admin
                </button>
              )}
              {/* Botão de Sair para DESKTOP */}
              <button onClick={handleSignOut} className="header-logout-btn secondary">
                Sair
              </button>
              {/* Botão de Sair para CELULAR */}
              <button onClick={handleSignOut} className="logout-badge-btn">
                Sair
              </button>
            </>
          ) : (
            <AuthBadge onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: window.location.origin,
                  queryParams: { prompt: 'select_account' }
                }
              });
            }} />
          )}
        </div>
      </header>

      <main className="main-container">
        <div className="card" ref={formRef}>
          <h2>{editing ? 'Editar Item' : 'Cadastrar Novo Item'}</h2>
          <ItemForm canWrite={canWrite} onSaved={handleItemSaved} editing={editing} setEditing={setEditing} />
        </div>
        <h2>Materiais Cadastrados</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flexGrow: 1, minWidth: '200px' }}
          />
          <button type="button" onClick={exportXlsx} className="secondary">Exportar XLSX</button>
        </div>
        <ItemList
          items={filteredItems}
          canWrite={canWrite}
          onEdit={handleEditClick}
          onDelete={onDelete}
          onImageClick={(url) => setSelectedImage(url)}
        />
        <div ref={adminPanelRef}>
          <AdminPanel visible={adminOpen} onClose={() => setAdminOpen(false)} isAdmin={isAdmin} />
        </div>
      </main>

      {isAdmin && (
        <button onClick={() => setAdminOpen(v => !v)} className="admin-fab">
          Admin
        </button>
      )}

      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <button className="close-btn" onClick={() => setSelectedImage(null)}>×</button>
          <img src={selectedImage} alt="Foto ampliada" />
        </div>
      )}
      
      <button
        onClick={scrollToTop}
        className={`back-to-top-btn ${isBackToTopVisible ? 'visible' : ''}`}
        title="Voltar ao topo"
      >
        ↑
      </button>
    </>
  );
}