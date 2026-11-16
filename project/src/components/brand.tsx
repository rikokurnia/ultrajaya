import Image from "next/image";

export function Brand({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <Image
        className="brand-mark"
        src="/ultrajaya-logo.png"
        alt="Ultrajaya logo"
        width={56}
        height={56}
        priority
        unoptimized
      />
      {!compact && (
        <span>
          <strong>Ultrajaya</strong>
        </span>
      )}
    </div>
  );
}
