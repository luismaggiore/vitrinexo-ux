export default function MemberCard({
  name,
  company,
  location,
  image,
  tags = [],
}) {
  return (
    <div className="col">
      <div className="card">
        <div
          className="p-relative"
          style={{
            position: "relative",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            className="d-flex gap-2 mt-1 p-absolute"
            style={{
              bottom: "8px",
              left: "8px",
              position: "absolute",
              zIndex: 2,
            }}
          >
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

          <div className="d-flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <span className="tag-vx" key={`${tag}-${index}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
