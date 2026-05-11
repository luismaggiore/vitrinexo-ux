export default function MemberProfile({
  name,
  company,
  location,
  image,
  bio,
  title,
  country,
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
          <div className="profile-row">
            <div className="img-profile"><img
              src={image}
              alt={`Foto de ${name}`}
              style={{
                position: "relative",
                zIndex: 0,
              }}
            /></div>
          <div className="profile-info py-2">
           
            <h1 className="profile-name h5">{name}</h1>
            <p className="profile-title">{title}</p>
            <p className="profile-company">{company}</p>
              <p className="profile-location">{location} - {country}</p>
          </div>
     
            </div>
        </div>
        <div className="profile-content">
          <div className="profile-section">
            <h2 className="h6">Sobre mí</h2>
            <p>{bio}</p>
          </div>
          <div className="profile-tags">
            {tags.map((tag, index) => (
              <span key={index} className="tag tag-profile">
                {tag}          </span>                
            ))} 
          </div>
          <div className="profile-section">
            <h2 className="h6">Sobre {company}</h2>
            <p>{about}</p>
          </div>
          <div className="profile-section">
            <h2 className="h6">Mi cliente ideal</h2>
            <p>{idealClient}</p>
          </div>
        </div>
        <div className="row">
        <div className="profile-offers col">
          <h2 className="h6">Qué busco</h2>
          <div className="tags">
            {seekTags.map((tag, index) => (
              <span key={index} className="tag tag-seek">
                {tag}         </span>     
            ))}
          </div>  
        </div>
        <div className="profile-seeks col">
          <h2 className="h6">Qué ofrezco</h2>
          <div className="tags">
            {offerTags.map((tag, index) => (
              <span key={index} className="tag tag-offer">
                {tag}         </span>
            ))}
            </div></div>
        </div>
      </div>
    </div>
  );
}
