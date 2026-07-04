const LABELS = {
  present: "Present",
  absent: "Absent",
  leave: "On leave",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  "checked-in": "Checked in",
  "checked-out": "Checked out",
  "not-checked-in": "Not checked in",
};

export default function Stamp({ status, children }) {
  const cls = `stamp stamp-${status}`;
  return (
    <span className={cls}>
      <span className="stamp-dot" />
      {children || LABELS[status] || status}
    </span>
  );
}
