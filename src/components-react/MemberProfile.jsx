export default function MemberProfile({
  name,
  company,
  location,
  image,
  bio,
  title,
  about,
  idealClient,
  tags = [],
  seekTags = [],
  offerTags = [],
  contact = {},
}) {
  console.log(name);
  return (
    <div className="container py-5">
      <div className="card">
        <div className="card-img-container">
          <div className="card-enla   ces">
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
            style={{
              position: "relative",
              zIndex: 0,
            }}
          />
        </div>

        <div className="card-body">
          <div className="info mb-2">
            <h5 className="h6 py-0 my-0">{name}</h5>
            <p className="member-company">{company}</p>
            <p className="member-company">{location}</p>
          </div>
          <div className="d-flex flex-wrap gap-1 mb-0 p-0">
            <p className="p-offers">Ofrece</p>
            <p className="p-seeks">Busca</p>
          </div>

          <div className="d-flex flex-wrap gap-1">
            {offerTags.map((tag, index) => (
              <span className="tag-vx tag-offers" key={`${tag}-${index}`}>
                {tag}
              </span>
            ))}
            {seekTags.map((tag, index) => (
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
