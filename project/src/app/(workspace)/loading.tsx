export default function Loading() {
  return (
    <div
      className="card loading-page"
      aria-busy="true"
      aria-label="Loading page"
    >
      <span className="skeleton" />
      <span className="skeleton" />
      <span className="skeleton" />
    </div>
  );
}
