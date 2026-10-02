import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, imgUrl } from '../lib/format';
import { Button, ErrorState, Field, Icon, Input, PageLoader, Textarea } from '../components/ui';
import { ChipInput, ImageUploader, Panel } from './kit';

const TOOLS = [
  ['format_h2', 'Heading', () => document.execCommand('formatBlock', false, '<h2>')],
  ['format_h3', 'Subheading', () => document.execCommand('formatBlock', false, '<h3>')],
  ['format_paragraph', 'Paragraph', () => document.execCommand('formatBlock', false, '<p>')],
  ['format_bold', 'Bold', () => document.execCommand('bold')],
  ['format_italic', 'Italic', () => document.execCommand('italic')],
  ['format_list_bulleted', 'Bullet list', () => document.execCommand('insertUnorderedList')],
  ['format_quote', 'Quote', () => document.execCommand('formatBlock', false, '<blockquote>')],
  ['link', 'Link', () => {
    const url = window.prompt('Link URL (https://…)');
    if (url && /^(https?:\/\/|\/)/.test(url)) document.execCommand('createLink', false, url);
  }],
  ['format_clear', 'Clear formatting', () => document.execCommand('removeFormat')],
];

/** Minimal WYSIWYG editor. Output HTML is re-sanitised by the server. */
function RichEditor({ initial, onChange }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState('write');
  const [html, setHtml] = useState(initial || '');
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial || '';
    setHtml(initial || '');
  }, [initial]);
  const sync = () => {
    const v = ref.current?.innerHTML || '';
    setHtml(v);
    onChange(v);
  };
  const insertImage = async (file) => {
    try {
      const { image } = await adminApi.upload(file, 'blog');
      ref.current.focus();
      document.execCommand('insertHTML', false, `<img src="${imgUrl(image.url)}" alt="" />`);
      sync();
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div className="rounded-xl ring-1 ring-surface-container-high overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-surface-container-low border-b border-surface-container-high">
        {TOOLS.map(([icon, label, run]) => (
          <button key={icon} type="button" title={label} aria-label={label} disabled={mode !== 'write'} onMouseDown={(e) => e.preventDefault()} onClick={() => { run(); sync(); }} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container-high disabled:opacity-40">
            <Icon name={icon} className="text-[20px]" />
          </button>
        ))}
        <button type="button" title="Insert image" aria-label="Insert image" disabled={mode !== 'write'} onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container-high disabled:opacity-40">
          <Icon name="add_photo_alternate" className="text-[20px]" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files[0]) insertImage(e.target.files[0]); e.target.value = ''; }} />
        <div className="ml-auto flex p-0.5 rounded-lg bg-surface-container-high">
          {['write', 'html'].map((m) => (
            <button key={m} type="button" onClick={() => { if (m === 'write' && ref.current) ref.current.innerHTML = html; setMode(m); }} className={cn('px-3 h-8 rounded-md text-label-md capitalize', mode === m && 'bg-surface-container-lowest shadow-card')}>{m}</button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        contentEditable={mode === 'write'}
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className={cn('prose-wt min-h-[420px] p-space-lg bg-surface-container-lowest focus:outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:italic', mode !== 'write' && 'hidden')}
        aria-label="Article content"
      />
      {mode === 'html' && (
        <textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full min-h-[420px] p-space-lg font-mono text-body-sm bg-surface-container-lowest focus:outline-none"
          aria-label="HTML source"
        />
      )}
    </div>
  );
}

const blank = { title: '', slug: '', excerpt: '', content: '', category: 'Journal', tags: [], status: 'draft', authorName: '', coverImage: null };

export default function BlogForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ['admin', 'blog', id], queryFn: () => adminApi.blog(id), enabled: !isNew, select: (d) => d.post });
  const [post, setPost] = useState(blank);
  const [initialHtml, setInitialHtml] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing.data) {
      setPost({ ...blank, ...existing.data });
      setInitialHtml(existing.data.content);
    }
  }, [existing.data]);

  const save = async (status) => {
    const body = { ...post, status: status || post.status, slug: post.slug || undefined, coverImage: post.coverImage?.url ? { url: post.coverImage.url, publicId: post.coverImage.publicId } : null, authorName: post.authorName || undefined };
    const errs = {};
    if (body.title.trim().length < 3) errs.title = 'Add a title';
    if (body.content.replace(/<[^>]+>/g, '').trim().length < 20) errs.content = 'Write at least a few sentences';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = isNew ? await adminApi.createBlog(body) : await adminApi.updateBlog(id, body);
      toast.success(body.status === 'published' ? 'Article published' : 'Draft saved');
      qc.invalidateQueries({ queryKey: ['admin', 'blogs'] });
      qc.invalidateQueries({ queryKey: ['blogs'] });
      if (isNew) navigate(`/admin/blogs/${res.post._id}`, { replace: true });
      else existing.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && existing.isLoading) return <PageLoader />;
  if (!isNew && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;
  const set = (k) => (e) => setPost({ ...post, [k]: e?.target ? e.target.value : e });

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/blogs" className="btn-icon" aria-label="Back"><Icon name="arrow_back" /></Link>
          <h1 className="text-headline-md">{isNew ? 'New article' : 'Edit article'}</h1>
        </div>
        <div className="flex gap-2">
          {post.status === 'published' && post.slug && <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="btn-tonal btn-sm"><Icon name="open_in_new" className="text-[18px]" /> View</a>}
          <Button variant="tonal" loading={saving} onClick={() => save('draft')}>{post.status === 'published' ? 'Unpublish' : 'Save draft'}</Button>
          <Button loading={saving} icon="publish" onClick={() => save('published')}>{post.status === 'published' ? 'Update' : 'Publish'}</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md items-start">
        <div className="xl:col-span-2 flex flex-col gap-space-md">
          <input value={post.title} onChange={set('title')} placeholder="Article title" className={cn('w-full bg-transparent text-headline-lg focus:outline-none border-b-2 pb-2', errors.title ? 'border-error' : 'border-transparent focus:border-secondary')} aria-label="Title" />
          {errors.title && <p className="text-label-md text-error -mt-2">{errors.title}</p>}
          <Textarea rows={2} value={post.excerpt} onChange={set('excerpt')} placeholder="Short excerpt shown in listings…" maxLength={400} />
          <RichEditor initial={initialHtml} onChange={(v) => setPost((p) => ({ ...p, content: v }))} />
          {errors.content && <p className="text-label-md text-error">{errors.content}</p>}
        </div>
        <div className="flex flex-col gap-space-md xl:sticky xl:top-20">
          <Panel title="Cover image">
            <ImageUploader value={post.coverImage?.url ? [post.coverImage] : []} onChange={(imgs) => setPost({ ...post, coverImage: imgs[0] || null })} multiple={false} folder="blog" />
          </Panel>
          <Panel title="Details">
            <div className="flex flex-col gap-space-md">
              <Field label="Category"><Input value={post.category} onChange={set('category')} list="blog-cats" /></Field>
              <datalist id="blog-cats">{['Journal', 'Travel Guides', 'Care & Repair', 'Sustainability', 'Product Stories'].map((c) => <option key={c} value={c} />)}</datalist>
              <Field label="Tags"><ChipInput value={post.tags} onChange={(v) => setPost({ ...post, tags: v.map((t) => t.toLowerCase()) })} /></Field>
              <Field label="URL slug" hint="Auto-generated if blank"><Input value={post.slug} onChange={set('slug')} /></Field>
              <Field label="Author name"><Input value={post.authorName} onChange={set('authorName')} placeholder="WILDTANE Editorial" /></Field>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
