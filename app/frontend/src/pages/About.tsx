import { useState } from "react";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useBusiness, useContactForm } from "../lib/queries";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

export function About() {
  const business = useBusiness();
  const contactForm = useContactForm();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Ingresa tu nombre.";
    if (!form.phone.trim() && !form.email.trim()) {
      next.phone = "Deja un teléfono o un correo.";
    }
    if (!form.message.trim()) next.message = "Escribe tu mensaje.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    contactForm.mutate(
      {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        message: form.message.trim(),
      },
      {
        onSuccess: () => setForm({ name: "", phone: "", email: "", message: "" }),
      },
    );
  }

  if (business.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  if (business.isError || !business.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ErrorState onRetry={() => business.refetch()} message="No pudimos cargar la información del negocio." />
      </div>
    );
  }

  const { profile, contacts, services, media } = business.data;
  const gallery = media.filter((item) => item.kind === "gallery");

  const contactRows = [
    { icon: Phone, label: contacts.phone },
    { icon: Mail, label: contacts.email },
    { icon: MapPin, label: contacts.address },
    { icon: Instagram, label: contacts.instagram },
    { icon: Facebook, label: contacts.facebook },
  ].filter(
    (row): row is { icon: typeof Phone; label: string } => Boolean(row.label),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-h3 font-bold text-ink">{profile.name}</h1>
      <p className="mt-1 text-body-lg text-muted">{profile.tagline}</p>
      <p className="mt-4 text-body text-ink">{profile.description}</p>

      {services.length > 0 && (
        <div className="mt-10">
          <h2 className="text-body-lg font-semibold text-ink">Servicios</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <div key={service.id} className="rounded-card border border-line bg-white p-4">
                <p className="text-body font-semibold text-ink">{service.title}</p>
                <p className="mt-1 text-body text-muted">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {gallery.length > 0 && (
        <div className="mt-10">
          <h2 className="text-body-lg font-semibold text-ink">Galería</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {gallery.map((item) => (
              <img
                key={item.id}
                src={item.url}
                alt={item.alt}
                width={300}
                height={300}
                loading="lazy"
                className="aspect-square w-full rounded-tile object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {contactRows.length > 0 && (
        <div className="mt-10">
          <h2 className="text-body-lg font-semibold text-ink">Contacto</h2>
          <ul className="mt-4 space-y-2">
            {contactRows.map((row) => (
              <li key={row.label} className="flex items-center gap-2 text-body text-ink">
                <row.icon size={18} strokeWidth={1.75} className="text-leaf" />
                {row.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 rounded-card border border-line bg-white p-6">
        <h2 className="text-body-lg font-semibold text-ink">Escríbenos</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-body font-medium text-ink">
              Nombre
            </label>
            <input
              id="contact-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
            />
            {errors.name && <p className="mt-1 text-meta text-danger">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-phone" className="block text-body font-medium text-ink">
                Teléfono (opcional)
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
                className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-body font-medium text-ink">
                Correo (opcional)
              </label>
              <input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
                className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
              />
            </div>
          </div>
          {errors.phone && <p className="text-meta text-danger">{errors.phone}</p>}

          <div>
            <label htmlFor="contact-message" className="block text-body font-medium text-ink">
              Mensaje
            </label>
            <textarea
              id="contact-message"
              rows={4}
              value={form.message}
              onChange={(event) => setForm((f) => ({ ...f, message: event.target.value }))}
              className="mt-1 w-full rounded-control border border-line px-3 py-2 text-body outline-none focus-visible:border-leaf"
            />
            {errors.message && <p className="mt-1 text-meta text-danger">{errors.message}</p>}
          </div>

          {contactForm.isSuccess && (
            <p className="text-body text-leaf">
              Gracias, recibimos tu mensaje. Te responderemos pronto.
            </p>
          )}
          {contactForm.isError && (
            <p className="text-body text-danger">
              No pudimos enviar tu mensaje. Intenta de nuevo.
            </p>
          )}

          <button
            type="submit"
            disabled={contactForm.isPending}
            className="rounded-pill bg-forest px-6 py-3 text-body font-medium text-white hover:bg-forest/90 disabled:opacity-60"
          >
            {contactForm.isPending ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </div>
  );
}
