/** Official Starforge symbol, recolored only for decorative product contexts. */
export function StarMark({ size = 24, color = 'currentColor', className, style }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: '0 0 auto',
        backgroundColor: color,
        WebkitMask: 'url(/brand/symbol.svg) center / contain no-repeat',
        mask: 'url(/brand/symbol.svg) center / contain no-repeat',
        ...style,
      }}
    />
  );
}
