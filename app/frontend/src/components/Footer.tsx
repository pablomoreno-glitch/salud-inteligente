import { Link } from "react-router-dom";
import { Facebook, Github, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useBusiness } from "../lib/queries";
import { Disclaimer } from "./Disclaimer";

const DEVELOPERS = [
  { handle: "Macreat", url: "https://github.com/Macreat" },
  { handle: "pablomoreno-glitch", url: "https://github.com/pablomoreno-glitch" },
];

export function Footer() {
  const { data: business } = useBusiness();
  const contacts = business?.contacts;
  const hasContacts = Boolean(
    contacts && (contacts.phone || contacts.email || contacts.address || contacts.instagram || contacts.facebook),
  );

  return (
    <footer className="border-t border-line bg-sage/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src="/media/site/logo-mark.webp" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              <span className="font-display text-lg font-bold text-forest">
                Salud Inteligente
              </span>
            </div>
            <p className="mt-2 text-body text-muted">
              Suplementos naturales elegidos para lo que sientes.
            </p>
          </div>

          <div>
            <h3 className="text-body font-semibold text-ink">Enlaces</h3>
            <ul className="mt-2 space-y-2 text-body text-muted">
              <li>
                <Link to="/catalogo" className="hover:text-leaf">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/nosotros" className="hover:text-leaf">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-leaf">
                  Política de cookies
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-body font-semibold text-ink">Desarrolladores</h3>
            <ul className="mt-2 space-y-2 text-body text-muted">
              {DEVELOPERS.map((dev) => (
                <li key={dev.url}>
                  <a
                    href={dev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-leaf"
                  >
                    <Github size={16} strokeWidth={1.75} /> {dev.handle}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {hasContacts && (
          <div>
            <h3 className="text-body font-semibold text-ink">Contacto</h3>
            <ul className="mt-2 space-y-2 text-body text-muted">
              {contacts?.phone && (
                <li className="flex items-center gap-2">
                  <Phone size={16} strokeWidth={1.75} /> {contacts.phone}
                </li>
              )}
              {contacts?.email && (
                <li className="flex items-center gap-2">
                  <Mail size={16} strokeWidth={1.75} /> {contacts.email}
                </li>
              )}
              {contacts?.address && (
                <li className="flex items-center gap-2">
                  <MapPin size={16} strokeWidth={1.75} /> {contacts.address}
                </li>
              )}
              {contacts?.instagram && (
                <li className="flex items-center gap-2">
                  <Instagram size={16} strokeWidth={1.75} /> {contacts.instagram}
                </li>
              )}
              {contacts?.facebook && (
                <li className="flex items-center gap-2">
                  <Facebook size={16} strokeWidth={1.75} /> {contacts.facebook}
                </li>
              )}
            </ul>
          </div>
          )}
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <Disclaimer />
        </div>
      </div>
    </footer>
  );
}
