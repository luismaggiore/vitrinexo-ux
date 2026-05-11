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
    <div className="container">
      <div className="profile  my-5">
        <div className="profile-top">
          <div className="card-enlaces">
            <button
              className="btn-vx btn-ghost-vx btn-vx-sm btn-vx-icon-sm"
              aria-label="Ver perfil de Fulanito de Tal Cualquiera"
            >
              <i className="ti ti-external-link"></i>
            </button>
            <button
              className="btn-vx btn-soft-accent btn-vx-sm btn-vx-icon-sm"
              aria-label="Guardar perfil de Fulanito de Tal Cualquiera"
            >
              <i className="ti ti-heart"></i>
            </button>
            <button className="btn-vx btn-soft-primary btn-vx-sm">
              <i className="ti ti-send"></i> Conectar
            </button>
          </div>
          <div className="banner-profile"></div>
          <div className="img-profile"></div>
        </div>
      </div>
    </div>
  );
}
