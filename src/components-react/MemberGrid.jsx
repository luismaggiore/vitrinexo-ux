import { useEffect, useRef } from "react";
import Masonry from "masonry-layout";

import MemberCard from "./MemberCard";
import { members } from "../data/members";

export default function MemberGrid() {
  const gridRef = useRef(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const masonry = new Masonry(gridRef.current, {
      percentPosition: true,
      itemSelector: ".masonry-item",
    });

    return () => {
      masonry.destroy();
    };
  }, []);

  return (
    <div
      ref={gridRef}
      className="row row-cols-1 row-cols-md-2 row-cols-lg-4 row-cols-xl-5 g-2 justify-content-center"
    >
      {members.map((member) => (
        <div className="col masonry-item" key={member.name}>
          <MemberCard {...member} />
        </div>
      ))}
    </div>
  );
}
