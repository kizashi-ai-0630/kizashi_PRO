export default function Page({ title, sub, children }) {
  return <div className="content page-enter"><h1>{title}</h1><p className="subtitle">{sub}</p><div className="line" />{children}</div>;
}
