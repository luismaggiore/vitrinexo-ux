import MemberCard from "./MemberCard";
import { members } from "../data/members";

export default function MemberGrid() {
  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 row-cols-xl-5 g-2">
      {members.map((member) => (
        <MemberCard key={member.name} {...member} />
      ))}
    </div>
  );
}
