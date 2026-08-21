/** Заголовок страницы admin-раздела: h1 + опциональное короткое описание. */
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <h1 className="admin-page-title">{title}</h1>
      {description && <p className="admin-page-desc">{description}</p>}
    </div>
  );
}
