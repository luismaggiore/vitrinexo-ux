import MemberCard from "./MemberCard";
import { members } from "../data/members";

export default function MemberGrid() {
  return (
    <div className="row g-3">
      {members.map((member) => (
        <MemberCard key={member.name} {...member} />
      ))}
    </div>
  );
}
