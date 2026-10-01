import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export default function NotFoundPage() {
  return (
    <div className="notfound">
      <Brand />
      <div className="notfound-code" aria-hidden="true">404</div>
      <h1>Page introuvable.</h1>
      <p>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link className="btn btn-primary btn-lg" to="/">Retour à l'accueil</Link>
    </div>
  );
}
