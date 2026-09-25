import { Link } from "react-router-dom";
import { Facebook, Instagram, Leaf, Mail, MapPin, Phone } from "lucide-react";
import { useBusiness } from "../lib/queries";
import { Disclaimer } from "./Disclaimer";

export function Footer() {
  const { data: business } = useBusiness();
  const contacts = business?.contacts;
  const hasContacts = Boolean(
    contacts && (contacts.phone || contacts.email || contacts.address || contacts.instagram || contacts.facebook),
  );

  return (
    <footer className="border-t border-line bg-sage/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Leaf size={20} strokeWidth={1.75} className="text-leaf" />
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
                <Link to="/api" className="hover:text-leaf">
                  API para desarrolladores
                </Link>
              </li>
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
