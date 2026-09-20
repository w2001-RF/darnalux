import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="notfound">
      <Link to="/" className="brand"><span className="brand-mark">D</span><span>Darna<span>Lux</span></span></Link>
      <h1>Page introuvable.</h1>
      <Link className="primary" to="/">Retour à l'accueil</Link>
    </div>
  );
}
