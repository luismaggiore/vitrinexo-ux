export default function MemberProfile({
  name,
  company,
  companySite = "#",
  location,
  image,
  bio,
  title,
  country,
  about,
  idealClient,
  tags = [],
  seekText,
  offerText,
  seekTags = [],
  offerTags = [],
  contact = {},
  isFounder = true,
  bannerImage = "https://media.licdn.com/dms/image/v2/D4D16AQEegj9F9ZRmkA/profile-displaybackgroundimage-shrink_200_800/B4DZ0L9ZDfKUAU-/0/1774022136730?e=1779926400&v=beta&t=0QlykKZ-yZ1aKq9EHJaHZrv1R5BUy8XhHaPVzRiBkVw"
}) {
  const countrySiglas = country ? country.slice(0, 3).toUpperCase() : "";

  return (
    <div className="container">
      <div className={`profile my-5${isFounder ? " profile-founder" : ""}`}>

        {/* ── HEADER: banner + avatar + acciones ── */}
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

          <div className="banner-profile" style={{ backgroundImage: `url(${bannerImage})` }}></div>

          <div className="profile-row">
            <div className="img-profile">
              <img
                src={image}
                alt={`Foto de ${name}`}
              />
            </div>

            <div className="profile-info">
           
              <h1 className="profile-name">{name} 
                {isFounder && (
                  <span
                    className="founder-tooltip mx-2"
                    data-tooltip="Miembro fundador"
                    aria-label="Miembro fundador"
                    tabIndex={0}
                  >
                    <i className="founder-tag ti ti-star" aria-hidden="true"></i>
                  </span>
                )}              </h1>
              <a href={companySite} className="profile-company" target="_blank" rel="noopener noreferrer">
                {company}
              </a>
              <p className="profile-title">{title}</p>
        
              <p className="profile-location">
                <i className="ti ti-map-pin"></i> {location}
                {country && <span className="profile-country-chip">{countrySiglas}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* ── TAGS de especialidad ── */}
        {tags.length > 0 && (
          <div className="profile-tags-row">
            {tags.map((tag, i) => (
              <span key={i} className="tag-vx">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── CUERPO: secciones textuales ── */}
        <div className="profile-content">
          {bio && (
            <div className="profile-section">
              <h2 className="profile-section-title">Sobre mí</h2>
              <p>{bio}</p>
            </div>
          )}

          {about && (
            <div className="profile-section">
              <h2 className="profile-section-title">Sobre {company}</h2>
              <p>{about}</p>
            </div>
          )}

          {idealClient && (
            <div className="profile-section">
              <h2 className="profile-section-title">Cliente ideal</h2>
              <p>{idealClient}</p>
            </div>
          )}
        </div>

        {/* ── OFFER / SEEK pills ── */}
        {(offerTags.length > 0 || seekTags.length > 0) && (
          <div className="profile-duo">
            {offerTags.length > 0 && (
              <div className="profile-pill profile-pill-offer">
                <h3 className="profile-pill-title">
                  <i className="ti ti-circle-check"></i> Qué ofrezco
                </h3>
                <p>{offerText}</p>
                <div className="profile-pill-tags">
                  {offerTags.map((tag, i) => (
                    <span key={i} className="tag-vx tag-offers">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {seekTags.length > 0 && (
              <div className="profile-pill profile-pill-seek">
                <h3 className="profile-pill-title">
                  <i className="ti ti-search"></i> Qué busco
                </h3>
                <p>{seekText}</p>
                <div className="profile-pill-tags">
                  {seekTags.map((tag, i) => (
                    <span key={i} className="tag-vx tag-seeks">
                      {tag}
                    </span>
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
