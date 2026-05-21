import { useState } from "react";

export default function MemberProfile({
  name,
  location,
  image,
  bio,
  country,
  tags = [],
  seekText,
  offerText,
  seekTags = [],
  offerTags = [],
  contact = {},
  isFounder = false,
  companies = [],
}) {
  const [activeTab, setActiveTab] = useState(0);
  const activeCompany = companies[activeTab] ?? {};
  const countrySiglas = country ? country.slice(0, 3).toUpperCase() : "";

  return (
    <div className="container">
      <div className={`profile my-5${isFounder ? " profile-founder" : ""}`}>

        {/* ── HEADER ── */}
        <div className="profile-top">
          <div className="profile-actions">
            <button
              className="btn-vx btn-soft-accent btn-vx-sm btn-vx-icon-sm"
              aria-label={`Guardar perfil de ${name}`}
            >
              <i className="ti ti-heart"></i>
            </button>
            <button className="btn-vx btn-soft-primary btn-vx-sm">
              <i className="ti ti-send"></i> Conectar
            </button>
          </div>

          <div
            className="banner-profile"
            style={{
              backgroundImage: activeCompany.bannerImage
                ? `url(${activeCompany.bannerImage})`
                : "none",
            }}
          />

          <div className="profile-row">
            <div className="img-profile">
              <img src={image} alt={`Foto de ${name}`} />
            </div>

            <div className="profile-info">
              <h1 className="profile-name">
                {name}
                {isFounder && (
                  <span
                    className="founder-tooltip mx-2"
                    data-tooltip="Miembro fundador"
                    aria-label="Miembro fundador"
                    tabIndex={0}
                  >
                    <i className="founder-tag ti ti-star" aria-hidden="true" />
                  </span>
                )}
              </h1>

              {activeCompany.website ? (
                <a
                  href={`https://${activeCompany.website}`}
                  className="profile-company"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activeCompany.name}
                </a>
              ) : (
                <span className="profile-company">{activeCompany.name}</span>
              )}

              <p className="profile-title">{activeCompany.title}</p>

              <p className="profile-location">
                <i className="ti ti-map-pin" /> {location}
                {country && (
                  <span className="profile-country-chip">{countrySiglas}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── TAGS — de la persona ── */}
        {tags.length > 0 && (
          <div className="profile-tags-row">
            {tags.map((tag, i) => (
              <span key={i} className="tag-vx">{tag}</span>
            ))}
          </div>
        )}

        {/* ── CUERPO ── */}
        <div className="profile-content">

          {bio && (
            <div className="profile-section">
              <h2 className="profile-section-title">Sobre mí</h2>
              <p>{bio}</p>
            </div>
          )}

          {/* Tabs — solo si hay más de una empresa */}
          {companies.length > 1 && (
            <div className="profile-tabs">
              {companies.map((c, i) => (
                <button
                  key={c.id}
                  className={`profile-tab${activeTab === i ? " profile-tab-active" : ""}`}
                  onClick={() => setActiveTab(i)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* ── COMPANY CARD — logo + nombre + enlaces ── */}
          {activeCompany.name && (
            <div className="profile-company-card">
              <div className="profile-company-logo">
                {activeCompany.logoImage ? (
                  <img
                    src={activeCompany.logoImage}
                    alt={`Logo de ${activeCompany.name}`}
                  />
                ) : (
                  <span className="profile-company-logo-initial">
                    {activeCompany.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="profile-company-meta">
                <div className="profile-company-meta-name">{activeCompany.name}</div>
                {activeCompany.title && (
                  <div className="profile-company-meta-title">{activeCompany.title}</div>
                )}
                <div className="profile-company-meta-links">
                  {activeCompany.website && (
                    <a
                      href={`https://${activeCompany.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-company-link"
                    >
                      <i className="ti ti-world"></i> {activeCompany.website}
                    </a>
                  )}
                  {activeCompany.linkedin && (
                    <a
                      href={`https://${activeCompany.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-company-link"
                    >
                      <i className="ti ti-brand-linkedin"></i> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCompany.about && (
            <div className="profile-section">
              <h2 className="profile-section-title">Sobre {activeCompany.name}</h2>
              <p>{activeCompany.about}</p>
            </div>
          )}

          {activeCompany.idealClient && (
            <div className="profile-section">
              <h2 className="profile-section-title">Cliente ideal</h2>
              <p>{activeCompany.idealClient}</p>
            </div>
          )}
        </div>

        {/* ── OFFER / SEEK ── */}
        {(offerTags.length > 0 || seekTags.length > 0) && (
          <div className="profile-duo">
            {offerTags.length > 0 && (
              <div className="profile-pill profile-pill-offer">
                <h3 className="profile-pill-title">
                  <i className="ti ti-circle-check" /> Qué ofrezco
                </h3>
                <p>{offerText}</p>
                <div className="profile-pill-tags">
                  {offerTags.map((tag, i) => (
                    <span key={i} className="tag-vx tag-offers">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {seekTags.length > 0 && (
              <div className="profile-pill profile-pill-seek">
                <h3 className="profile-pill-title">
                  <i className="ti ti-search" /> Qué busco
                </h3>
                <p>{seekText}</p>
                <div className="profile-pill-tags">
                  {seekTags.map((tag, i) => (
                    <span key={i} className="tag-vx tag-seeks">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
