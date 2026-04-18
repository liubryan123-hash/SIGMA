"use client";

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

const authHeaders = (json = false) => {
  const headers = { Authorization: `Bearer ${localStorage.getItem('edusaas_token')}` };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
};

export default function MaterialDidactico({ user, isDark, textMuted, cardBg }) {
  const [tab, setTab] = useState('comunidad');
  const [publicaciones, setPublicaciones] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalPost, setModalPost] = useState(false);
  const [modalMaterial, setModalMaterial] = useState(false);
  const [comentarioText, setComentarioText] = useState({});
  const [postForm, setPostForm] = useState({
    titulo: '',
    contenido: '',
    tipo_publicacion: 'texto',
    media_urls: '',
    media_files: [],
  });
  const [materialForm, setMaterialForm] = useState({
    titulo: '',
    tipo_material: 'pdf',
    url_recurso: '',
    archivo: null,
    materia: '',
    descripcion: '',
  });

  const canPublish = ['director', 'secretaria', 'profesor', 'superadmin', 'admin_soporte'].includes(user.rol);
  const canModerate = ['superadmin', 'admin_soporte'].includes(user.rol);

  async function loadCommunity() {
    setLoading(true);
    try {
      const [postRes, materialRes] = await Promise.all([
        fetch(apiUrl('/api/community/publicaciones'), { headers: authHeaders() }),
        fetch(apiUrl('/api/community/material'), { headers: authHeaders() }),
      ]);

      const postData = await postRes.json();
      const materialData = await materialRes.json();

      setPublicaciones(Array.isArray(postData) ? postData : []);
      setMateriales(Array.isArray(materialData) ? materialData : []);
    } catch (error) {
      console.error('Error comunidad:', error);
      setPublicaciones([]);
      setMateriales([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadCommunity);
  }, []);

  const createPost = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    if(postForm.titulo) payload.append('titulo', postForm.titulo);
    payload.append('contenido', postForm.contenido);
    payload.append('tipo_publicacion', postForm.tipo_publicacion);
    if(postForm.media_urls) payload.append('media_urls', postForm.media_urls);
    
    // Adjuntar archivos binarios si el usuario seleccionó alguno
    for (let i = 0; i < postForm.media_files.length; i++) {
       payload.append('archivos', postForm.media_files[i]);
    }

    const { Authorization } = authHeaders(); // Sin Content-Type JSON para que el navegador ponga multipart/form-data boundary
    const res = await fetch(apiUrl('/api/community/publicaciones'), {
      method: 'POST',
      headers: { Authorization },
      body: payload,
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'No se pudo crear la publicacion.');

    setModalPost(false);
    setPostForm({ titulo: '', contenido: '', tipo_publicacion: 'texto', media_urls: '', media_files: [] });
    loadCommunity();
  };

  const deletePost = async (id) => {
    if (!confirm('Eliminar esta publicacion?')) return;
    const res = await fetch(apiUrl(`/api/community/publicaciones/${id}`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) loadCommunity();
  };

  const uploadMaterial = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append('titulo', materialForm.titulo);
    payload.append('tipo_material', materialForm.tipo_material);
    if(materialForm.materia) payload.append('materia', materialForm.materia);
    if(materialForm.descripcion) payload.append('descripcion', materialForm.descripcion);
    if(materialForm.url_recurso) payload.append('url_recurso', materialForm.url_recurso);
    if(materialForm.archivo) payload.append('archivo', materialForm.archivo);

    const { Authorization } = authHeaders();
    const res = await fetch(apiUrl('/api/community/material'), {
      method: 'POST',
      headers: { Authorization },
      body: payload,
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'No se pudo guardar el material.');

    setModalMaterial(false);
    setMaterialForm({ titulo: '', tipo_material: 'pdf', url_recurso: '', archivo: null, materia: '', descripcion: '' });
    loadCommunity();
  };

  const handleLike = async (postId) => {
    const res = await fetch(apiUrl(`/api/community/publicaciones/${postId}/reaccionar`), {
      method: 'POST',
      headers: authHeaders()
    });
    if (res.ok) loadCommunity();
  };

  const handleComment = async (e, postId) => {
    e.preventDefault();
    if (!comentarioText[postId]) return;
    const res = await fetch(apiUrl(`/api/community/publicaciones/${postId}/comentarios`), {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ contenido: comentarioText[postId] })
    });
    if (res.ok) {
      setComentarioText({ ...comentarioText, [postId]: '' });
      loadCommunity();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Comunidad de la academia</h2>
          <p className={`text-sm ${textMuted}`}>
            Publicaciones internas, avisos, preguntas y recursos compartidos por la academia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPublish && (
            <button onClick={() => setModalPost(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white">
              + Publicacion
            </button>
          )}
          {canPublish && (
            <button onClick={() => setModalMaterial(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white">
              + Recurso
            </button>
          )}
        </div>
      </div>

      <div className={`flex gap-1 rounded-2xl border p-1 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
        {[
          ['comunidad', 'Comunidad'],
          ['material', 'Material'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest ${
              tab === id ? 'bg-slate-800 text-white' : `${textMuted} hover:bg-slate-800/20`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : tab === 'comunidad' ? (
        <div className="space-y-4">
          {publicaciones.length === 0 ? (
            <div className={`rounded-3xl border-2 border-dashed p-16 text-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className="text-lg font-bold">Todavia no hay publicaciones.</p>
              <p className={`mt-2 text-sm ${textMuted}`}>Aqui apareceran anuncios, preguntas, ideas y novedades de la academia.</p>
            </div>
          ) : (
            publicaciones.map((post) => (
              <article key={post.id_publicacion} className={`rounded-3xl border p-6 ${cardBg}`}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-extrabold">{post.titulo || 'Publicacion de comunidad'}</p>
                    <p className={`text-[11px] ${textMuted}`}>
                      {post.autor_nombre || 'Usuario'} - {post.autor_rol || 'miembro'} - {new Date(post.fecha_creacion).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                      {post.tipo_publicacion}
                    </span>
                    {canModerate && (
                      <button onClick={() => deletePost(post.id_publicacion)} className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-400">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.contenido}</p>
                {Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {post.media_urls.map((url, index) => (
                      <a key={index} href={url.startsWith('http') ? url : apiUrl(url)} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-4 py-3 text-xs text-blue-400 font-mono truncate overflow-hidden flex items-center gap-2">
                        📄 {url.split('/').pop()}
                      </a>
                    ))}
                  </div>
                )}
                
                {/* INTERACCIÓN TIPO FACEBOOK: LIKES Y COMENTARIOS */}
                <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between`}>
                  <button onClick={() => handleLike(post.id_publicacion)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.user_liked ? 'text-rose-500' : textMuted + ' hover:text-rose-400'}`}>
                    {post.user_liked ? '❤️' : '🤍'} Me gusta {post.likes > 0 && `(${post.likes})`}
                  </button>
                  <p className={`text-[10px] uppercase font-black tracking-widest ${textMuted}`}>
                    {post.comentarios?.length > 0 ? `${post.comentarios.length} comentarios` : 'Sin comentarios'}
                  </p>
                </div>
                
                <div className="mt-4 space-y-3">
                  {post.comentarios?.map(c => (
                     <div key={c.id_comentario} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                       <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-400">{c.autor_nombre}</p>
                       <p className="text-sm">{c.contenido}</p>
                     </div>
                  ))}
                  
                  <form onSubmit={(e) => handleComment(e, post.id_publicacion)} className="flex gap-2">
                    <input 
                      value={comentarioText[post.id_publicacion] || ''}
                      onChange={e => setComentarioText({...comentarioText, [post.id_publicacion]: e.target.value})}
                      placeholder="Escribe un comentario..." 
                      className={`flex-1 px-4 py-2 text-sm rounded-xl border outline-none ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                    />
                    <button type="submit" disabled={!comentarioText[post.id_publicacion]} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black px-4 rounded-xl text-[10px] uppercase tracking-widest">
                      Comentar
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {materiales.length === 0 ? (
            <div className={`col-span-full rounded-3xl border-2 border-dashed p-16 text-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className="text-lg font-bold">Todavia no hay recursos.</p>
              <p className={`mt-2 text-sm ${textMuted}`}>Cuando profesores o direccion compartan materiales, apareceran aqui.</p>
            </div>
          ) : (
            materiales.map((item) => (
              <div key={item.id_material} className={`rounded-3xl border p-6 ${cardBg}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-extrabold">{item.titulo}</p>
                    <p className={`text-[11px] ${textMuted}`}>{item.autor_nombre || 'Autor'} - {item.materia || 'General'}</p>
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {item.tipo_material}
                  </span>
                </div>
                <p className={`mb-5 text-sm ${textMuted}`}>{item.descripcion || 'Sin descripcion adicional.'}</p>
                <a 
                  href={item.url_recurso.startsWith('http') ? item.url_recurso : apiUrl(item.url_recurso)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex rounded-xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-400"
                >
                  Abrir recurso
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {modalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-[2rem] border p-8 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-extrabold">Nueva publicacion</h3>
              <button onClick={() => setModalPost(false)} className="rounded-full bg-slate-800 px-3 py-1 text-sm font-black text-slate-300">
                X
              </button>
            </div>
            <form onSubmit={createPost} className="space-y-4">
              <input value={postForm.titulo} onChange={(e) => setPostForm({ ...postForm, titulo: e.target.value })} placeholder="Titulo opcional" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              <select value={postForm.tipo_publicacion} onChange={(e) => setPostForm({ ...postForm, tipo_publicacion: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <option value="texto">texto</option>
                <option value="pregunta">pregunta</option>
                <option value="imagen">imagen</option>
                <option value="video">video</option>
              </select>
              <textarea required value={postForm.contenido} onChange={(e) => setPostForm({ ...postForm, contenido: e.target.value })} placeholder="Escribe el contenido de la publicacion..." className={`h-32 w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              <textarea value={postForm.media_urls} onChange={(e) => setPostForm({ ...postForm, media_urls: e.target.value })} placeholder="URLs de imagen o video (opcional)" className={`h-16 w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              <div>
                <label className={`text-[10px] font-black uppercase mb-1 block ${textMuted}`}>O adjunta archivos físicos (Fotos/Docs)</label>
                <input type="file" multiple onChange={(e) => setPostForm({ ...postForm, media_files: Array.from(e.target.files) })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalPost(false)} className="flex-1 rounded-xl border border-slate-700 py-3 text-[11px] font-black uppercase tracking-widest">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-3 text-[11px] font-black uppercase tracking-widest text-white">
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-[2rem] border p-8 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-extrabold">Nuevo recurso</h3>
              <button onClick={() => setModalMaterial(false)} className="rounded-full bg-slate-800 px-3 py-1 text-sm font-black text-slate-300">
                X
              </button>
            </div>
            <form onSubmit={uploadMaterial} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input required value={materialForm.titulo} onChange={(e) => setMaterialForm({ ...materialForm, titulo: e.target.value })} placeholder="Titulo del recurso" className={`rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                <input value={materialForm.materia} onChange={(e) => setMaterialForm({ ...materialForm, materia: e.target.value })} placeholder="Materia" className={`rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                <select value={materialForm.tipo_material} onChange={(e) => setMaterialForm({ ...materialForm, tipo_material: e.target.value })} className={`rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="pdf">pdf</option>
                  <option value="video">video</option>
                  <option value="link">link</option>
                </select>
                <div className="col-span-full">
                  <label className={`text-[10px] font-black uppercase mb-1 block ${textMuted}`}>Carga un archivo físico desde tu dispositivo</label>
                  <input type="file" onChange={(e) => setMaterialForm({ ...materialForm, archivo: e.target.files[0] })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none bg-indigo-500/5 ${isDark ? 'border-indigo-500/20 text-slate-300' : 'border-indigo-200 text-slate-700'}`} />
                </div>
                <div className="col-span-full text-center my-2">
                   <p className={`text-xs font-bold uppercase ${textMuted}`}>O alternativamente ingresa un enlace externo</p>
                </div>
                <input value={materialForm.url_recurso} onChange={(e) => setMaterialForm({ ...materialForm, url_recurso: e.target.value })} placeholder="URL del recurso" className={`col-span-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <textarea value={materialForm.descripcion} onChange={(e) => setMaterialForm({ ...materialForm, descripcion: e.target.value })} placeholder="Descripcion" className={`h-24 w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalMaterial(false)} className="flex-1 rounded-xl border border-slate-700 py-3 text-[11px] font-black uppercase tracking-widest">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-blue-600 py-3 text-[11px] font-black uppercase tracking-widest text-white">
                  Guardar recurso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
