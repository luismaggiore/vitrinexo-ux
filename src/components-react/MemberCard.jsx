export default function MemberCard({
  name,
  companies = [],
  location,
  country,
  image,
  tags = [],
  seekTags = [],
  offerTags = [],
  isFounder = false,
}) {
  const randomSeekTags = [...seekTags]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);
  const randomOfferTags = [...offerTags]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const countrySiglas = country.slice(0, 3).toUpperCase();

  return (
    <div className="col">
      <div className="card">
        <div className="card-img-container">
          <div className="card-enlaces">
            <button
              className="btn-vx btn-ghost-vx btn-vx-sm btn-vx-icon-sm"
              aria-label={`Ver perfil de ${name}`}
            >
              <i className="ti ti-external-link"></i>
            </button>

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

          <div className="card-blur-gradient"></div>

          <img
            src={image}
            className="card-img-top"
            alt={`Foto de ${name}`}
            style={{ position: "relative", zIndex: 0 }}
          />
        </div>

        <div className="card-body">
          <div className="info mb-2">
            <h5 className="h6 py-0 my-0">
              {name}
              {isFounder && (
                <span
                  className="founder-tooltip"
                  data-tooltip="Miembro fundador"
                  aria-label="Miembro fundador"
                  tabIndex={0}
                >
                  <i className="founder-tag ti ti-star" aria-hidden="true"></i>
                </span>
              )}
            </h5>

            {/* empresas — una o varias */}
            {companies.map((c) => (
              <p className="member-company" key={c.id}>
    
                {c.name} <br />
              </p>
            ))}

            <p className="member-company">
              {location} ({countrySiglas})
            </p>
          </div>

          <div className="d-flex flex-wrap gap-1 mb-0 p-0">
            <p className="p-offers">Ofrece</p>
            <p className="p-seeks">Busca</p>
          </div>

          <div className="d-flex flex-wrap gap-1">
            {randomOfferTags.map((tag, index) => (
              <span className="tag-vx tag-offers" key={`${tag}-${index}`}>
                {tag}
              </span>
            ))}
            {randomSeekTags.map((tag, index) => (
              <span className="tag-vx tag-seeks" key={`${tag}-${index}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}