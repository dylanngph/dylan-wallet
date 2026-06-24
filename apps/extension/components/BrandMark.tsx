/** The DylanWallet brand mark — a gradient circle with a "D". */
export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: "linear-gradient(135deg, var(--primary), #8B5CF6)",
      }}
    >
      D
    </span>
  );
}
